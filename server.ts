import express from "express";
import path from "path";

import { createServer as createViteServer } from "vite";
import { Ollama } from "ollama";
import { Client } from "ssh2";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import { existsSync, mkdirSync, createWriteStream, statSync as fsStatSync, readFileSync, writeFileSync } from "fs";
import archiver from "archiver";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

import os from "os";
import { dbService } from "./src/server/db";
import { missionService } from "./src/server/mission";

const execAsync = promisify(exec);

// Ensure web_design_workspace directory structure exists
const WEB_DESIGN_ROOT = path.join(process.cwd(), "web_design_workspace");
const WORKSPACE_DIRS = ["projects", "logs", "temp", "docker", "security", "screenshots"];

if (!existsSync(WEB_DESIGN_ROOT)) {
  mkdirSync(WEB_DESIGN_ROOT);
}

WORKSPACE_DIRS.forEach(dir => {
  const dirPath = path.join(WEB_DESIGN_ROOT, dir);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath);
  }
});

const WEB_PROJECTS_DIR = path.join(WEB_DESIGN_ROOT, "projects");
const SCREENSHOTS_DIR = path.join(WEB_DESIGN_ROOT, "screenshots");
const LOGS_DIR = path.join(WEB_DESIGN_ROOT, "logs");
const TEMP_DIR = path.join(WEB_DESIGN_ROOT, "temp");
const DOCKER_DIR = path.join(WEB_DESIGN_ROOT, "docker");
const PROJECTS_JSON_PATH = path.join(WEB_DESIGN_ROOT, "projects.json");
const AUDIT_LOG_PATH = path.join(LOGS_DIR, "audit.json");

// In-memory audit log for quick access
let auditLogs: any[] = [];

// Ensure projects.json exists
if (!existsSync(PROJECTS_JSON_PATH)) {
  writeFileSync(PROJECTS_JSON_PATH, JSON.stringify({ active_project: null, projects: [] }, null, 2));
}

// Ensure audit.json exists
if (!existsSync(AUDIT_LOG_PATH)) {
  writeFileSync(AUDIT_LOG_PATH, JSON.stringify([], null, 2));
} else {
  try {
    const data = readFileSync(AUDIT_LOG_PATH, 'utf-8');
    auditLogs = JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse audit logs:", e);
    auditLogs = [];
  }
}

async function logAudit(command: string, status: string, stdout: string = "", stderr: string = "", type: string = "command", agentId: string = "system") {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    command,
    status,
    stdout: stdout.substring(0, 500), // Limit size
    stderr: stderr.substring(0, 500)
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 100) auditLogs.pop();
  
  try {
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(auditLogs, null, 2));
    // Also log to SQLite
    dbService.log({
      agent_id: agentId,
      type,
      event: command,
      content: stdout || stderr || "",
      status,
      metadata: JSON.stringify({ stderr: stderr.substring(0, 200) })
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}

// Helper for SSH execution
const execSsh = (config: any, command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);
        let output = '';
        stream.on('close', (code: number, signal: string) => {
          conn.end();
          if (code !== 0) reject(new Error(`Exit code ${code}`));
          else resolve(output);
        }).on('data', (data: any) => {
          output += data;
        }).stderr.on('data', (data: any) => {
          output += data;
        });
      });
    }).on('error', (err) => reject(err)).connect({
      host: config.host,
      port: parseInt(config.port) || 22,
      username: config.username,
      password: config.password
    });
  });
};

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // Mission State Endpoints
  app.get("/api/mission/state", async (req, res) => {
    try {
      const state = await missionService.getState();
      res.json(state);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mission/state", async (req, res) => {
    try {
      const state = await missionService.updateState(req.body);
      res.json(state);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/mission/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = dbService.getLogs(limit);
      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mission/log", async (req, res) => {
    try {
      const result = dbService.log(req.body);
      res.json({ status: "Logged", result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      os: os.platform(),
      arch: os.arch(),
      release: os.release()
    });
  });

  // Agent Deployment Endpoint (SSH based)
  app.post("/api/agent/deploy", async (req, res) => {
    const { dockerfile, ssh } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });
    if (!ssh || !ssh.host) return res.status(400).json({ error: "SSH config required" });

    try {
      // 1. Create remote temp dir and Dockerfile
      const remoteTempDir = `/tmp/agent-${Date.now()}`;
      const escapedDockerfile = dockerfile.replace(/'/g, "'\\''");
      
      await execSsh(ssh, `mkdir -p ${remoteTempDir} && echo '${escapedDockerfile}' > ${remoteTempDir}/Dockerfile`);
      
      // 2. Build and Run
      const projectName = `agent-app-${Date.now()}`;
      await execSsh(ssh, `cd ${remoteTempDir} && docker build -t ${projectName} .`);
      const runOutput = await execSsh(ssh, `docker run -d -p 0:80 ${projectName}`);
      
      res.json({ 
        status: "Deployment successful", 
        containerId: runOutput.trim(),
        logs: "Container started via SSH" 
      });
    } catch (error: any) {
      console.error("SSH Deployment Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Local Shell Execution Endpoint
  app.post("/api/local/exec", async (req, res) => {
    const { command, cwd } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const options = cwd ? { cwd: path.resolve(process.cwd(), cwd) } : {};
      const { stdout, stderr } = await execAsync(command, options);
      await logAudit(command, "Success", stdout, stderr);
      res.json({ 
        status: "Success", 
        stdout, 
        stderr 
      });
    } catch (error: any) {
      console.error("Local Exec Error:", error);
      const errorMessage = error.stderr || error.message || "Unknown error";
      await logAudit(command, "Error", error.stdout || "", errorMessage);
      res.status(500).json({ 
        error: errorMessage,
        stderr: error.stderr,
        stdout: error.stdout
      });
    }
  });

  // Audit Log Endpoint
  app.get("/api/logs/audit", async (req, res) => {
    try {
      const apiKey = req.headers.authorization?.split(" ")[1];
      if (!apiKey) return res.status(401).json({ error: "Unauthorized" });
      
      // Ensure we always return an object with a logs array
      res.json({ logs: Array.isArray(auditLogs) ? auditLogs : [] });
    } catch (error: any) {
      console.error("Audit Log Fetch Error:", error);
      res.status(500).json({ error: "Internal Server Error", logs: [] });
    }
  });

  // Event Logging Endpoint
  app.post("/api/logs/event", async (req, res) => {
    const { event, status, details } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    await logAudit(event, status || "Info", details || "", "", "event");
    res.json({ status: "Logged" });
  });

  // Chat Persistence Endpoints
  app.get("/api/chat/history/:viewId", (req, res) => {
    try {
      const messages = dbService.getChatMessages(req.params.viewId);
      res.json({ messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat/message", (req, res) => {
    try {
      const { view_id, role, content, thinking } = req.body;
      dbService.saveChatMessage(view_id, role, content, thinking);
      res.json({ status: "Success" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/chat/history/:viewId", (req, res) => {
    try {
      dbService.clearChatMessages(req.params.viewId);
      res.json({ status: "Success" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File Browser API: List Files
  app.get("/api/files/list", async (req, res) => {
    const dirPath = (req.query.path as string) || process.cwd();
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const absolutePath = path.resolve(dirPath);
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      
      const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(absolutePath, entry.name);
        let stats;
        try {
          stats = await fs.stat(fullPath);
        } catch (e) {
          // Handle broken symlinks or permission issues
          stats = { size: 0, mtime: new Date() };
        }

        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
          path: fullPath
        };
      }));

      res.json({
        currentPath: absolutePath,
        parentPath: path.dirname(absolutePath),
        files: files.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        })
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File Browser API: Actions
  app.post("/api/files/action", async (req, res) => {
    const { action, path: targetPath, newName, destination } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const absolutePath = path.resolve(targetPath);

      switch (action) {
        case "mkdir":
          await fs.mkdir(absolutePath, { recursive: true });
          break;
        case "delete":
          const stats = await fs.stat(absolutePath);
          if (stats.isDirectory()) {
            await fs.rm(absolutePath, { recursive: true, force: true });
          } else {
            await fs.unlink(absolutePath);
          }
          break;
        case "rename":
          if (!newName) throw new Error("New name required");
          const parentDir = path.dirname(absolutePath);
          await fs.rename(absolutePath, path.join(parentDir, newName));
          break;
        case "copy":
          if (!destination) throw new Error("Destination required");
          const destPath = path.resolve(destination, path.basename(absolutePath));
          await fs.cp(absolutePath, destPath, { recursive: true });
          break;
        case "move":
          if (!destination) throw new Error("Destination required");
          const movePath = path.resolve(destination, path.basename(absolutePath));
          await fs.rename(absolutePath, movePath);
          break;
        case "read":
          const content = await fs.readFile(absolutePath, "utf-8");
          return res.json({ status: "Success", content });
        case "write":
          if (req.body.content === undefined) throw new Error("Content required");
          if (req.body.isBase64) {
            await fs.writeFile(absolutePath, Buffer.from(req.body.content, 'base64'));
          } else {
            await fs.writeFile(absolutePath, req.body.content, "utf-8");
          }
          break;
        case "zip":
          const zipName = `${path.basename(absolutePath)}.zip`;
          const zipPath = path.join(path.dirname(absolutePath), zipName);
          const output = createWriteStream(zipPath);
          const archive = archiver('zip', { zlib: { level: 9 } });

          await new Promise((resolve, reject) => {
            output.on('close', () => resolve(null));
            archive.on('error', reject);
            archive.pipe(output);

            const stats = fsStatSync(absolutePath);
            if (stats.isDirectory()) {
              archive.directory(absolutePath, false);
            } else {
              archive.file(absolutePath, { name: path.basename(absolutePath) });
            }
            archive.finalize();
          });
          return res.json({ status: "Success", zipPath });
        default:
          throw new Error("Invalid action");
      }

      res.json({ status: "Success" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File Browser API: Download
  app.get("/api/files/download", async (req, res) => {
    const targetPath = req.query.path as string;
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const absolutePath = path.resolve(targetPath);
      const stats = await fs.stat(absolutePath);
      if (stats.isDirectory()) {
        return res.status(400).json({ error: "Cannot download directory directly. Zip it first." });
      }
      res.download(absolutePath);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Projects API: Create new project
  app.post("/api/projects/create", async (req, res) => {
    const { name, description, stack } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const projectDirName = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const projectDir = path.join(WEB_PROJECTS_DIR, projectDirName);
      await fs.mkdir(projectDir, { recursive: true });

      const currentData = JSON.parse(await fs.readFile(PROJECTS_JSON_PATH, "utf-8"));
      const newProject = {
        name,
        path: projectDir,
        description,
        stack,
        last_updated: new Date().toISOString()
      };

      currentData.projects.push(newProject);
      currentData.active_project = name;

      await fs.writeFile(PROJECTS_JSON_PATH, JSON.stringify(currentData, null, 2));
      res.json({ status: "Success", project: newProject });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Projects API: Edit project
  app.post("/api/projects/edit", async (req, res) => {
    const { oldName, name, description, stack } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const currentData = JSON.parse(await fs.readFile(PROJECTS_JSON_PATH, "utf-8"));
      const projectIndex = currentData.projects.findIndex((p: any) => p.name === oldName);
      
      if (projectIndex === -1) throw new Error("Project not found");

      const project = currentData.projects[projectIndex];
      
      project.name = name;
      project.description = description;
      project.stack = stack;
      project.last_updated = new Date().toISOString();

      if (currentData.active_project === oldName) {
        currentData.active_project = name;
      }

      await fs.writeFile(PROJECTS_JSON_PATH, JSON.stringify(currentData, null, 2));
      res.json({ status: "Success", project });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Projects API: Get all projects
  app.get("/api/projects", async (req, res) => {
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const data = await fs.readFile(PROJECTS_JSON_PATH, "utf-8");
      res.json(JSON.parse(data));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Projects API: Update projects.json
  app.post("/api/projects", async (req, res) => {
    const { active_project, projects } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const currentData = JSON.parse(await fs.readFile(PROJECTS_JSON_PATH, "utf-8"));
      const newData = {
        active_project: active_project !== undefined ? active_project : currentData.active_project,
        projects: projects !== undefined ? projects : currentData.projects
      };
      await fs.writeFile(PROJECTS_JSON_PATH, JSON.stringify(newData, null, 2));
      res.json({ status: "Success", data: newData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Proxy for Ollama Tags (List Models)
  app.get("/api/models", async (req, res) => {
    const apiKey = req.headers.authorization?.split(" ")[1];
    const xHost = req.headers['x-ollama-host'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: "API Key required" });
    }

    try {
      const ollamaHost = xHost || process.env.OLLAMA_HOST || "https://ollama.com";
      const ollamaApiKey = process.env.OLLAMA_API_KEY || apiKey;

      const response = await fetch(`${ollamaHost}/api/tags`, {
        headers: ollamaApiKey ? {
          Authorization: `Bearer ${ollamaApiKey}`,
        } : {},
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // API Proxy for Ollama Chat (Streaming)
  app.post("/api/chat", async (req, res) => {
    const { model, messages, stream } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];
    const xHost = req.headers['x-ollama-host'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: "API Key required" });
    }

    try {
      const ollamaHost = xHost || process.env.OLLAMA_HOST || "https://ollama.com";
      const ollamaApiKey = process.env.OLLAMA_API_KEY || apiKey;

      const ollama = new Ollama({
        host: ollamaHost,
        headers: ollamaApiKey ? {
          Authorization: `Bearer ${ollamaApiKey}`,
        } : {},
      });

      if (stream) {
        const response = await ollama.chat({
          model,
          messages,
          stream: true,
        });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        for await (const part of response) {
          res.write(`data: ${JSON.stringify(part)}\n\n`);
        }
        res.end();
      } else {
        const response = await ollama.chat({
          model,
          messages,
          stream: false,
        });
        res.json(response);
      }
    } catch (error: any) {
      console.error("Ollama API Error:", error);
      res.status(error.status || 500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // API Proxy for Ollama Web Search (Using Local Playwright)
  app.post("/api/web-search", async (req, res) => {
    const { query } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) {
      return res.status(401).json({ error: "API Key required" });
    }

    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
      });
      const page = await browser.newPage();
      
      // Use DuckDuckGo for search scraping
      await page.goto(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: "networkidle", timeout: 20000 });
      
      const results = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.result'));
        return items.slice(0, 5).map(item => ({
          title: item.querySelector('.result__title')?.textContent?.trim() || 'No title',
          url: item.querySelector('.result__a')?.getAttribute('href') || '#',
          snippet: item.querySelector('.result__snippet')?.textContent?.trim() || 'No snippet available'
        }));
      });
      
      res.json({ results });
    } catch (error: any) {
      console.error("Local Web Search Error:", error);
      res.status(500).json({ error: `Search failed: ${error.message}` });
    } finally {
      if (browser) await browser.close().catch(console.error);
    }
  });

  // Helper for human-like delay
  const humanDelay = (min = 500, max = 1500) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));

  // API Proxy for Ollama Web Fetch (Using Local Playwright)
  app.post("/api/web-fetch", async (req, res) => {
    const { url, screenshot = false } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) {
      return res.status(401).json({ error: "API Key required" });
    }

    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
      });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      
      const content = await page.evaluate(() => {
        // Basic readability cleanup
        const toRemove = document.querySelectorAll('script, style, nav, footer, header, iframe, noscript');
        toRemove.forEach(el => el.remove());
        return document.body.innerText;
      });

      let screenshotPath = null;
      let screenshotUrl = null;

      if (screenshot) {
        const filename = `web-snap-${Date.now()}.png`;
        screenshotPath = path.join(SCREENSHOTS_DIR, filename);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        screenshotUrl = `/preview/${filename}`;
      }
      
      res.json({ url, content: content.substring(0, 15000).trim(), screenshot: screenshotUrl });
    } catch (error: any) {
      console.error("Local Web Fetch Error:", error);
      res.status(500).json({ error: `Fetch failed: ${error.message}` });
    } finally {
      if (browser) await browser.close().catch(console.error);
    }
  });

  // API Proxy for Ollama Web Actions
  app.post("/api/web-action", async (req, res) => {
    const { url, action, selector, text, key } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) {
      return res.status(401).json({ error: "API Key required" });
    }

    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
      });
      const page = await browser.newPage();
      if (url) await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      
      let result = "Action completed";

      if (action === "click") {
        await page.click(selector);
        result = `Clicked ${selector}`;
      } else if (action === "type") {
        await page.type(selector, text, { delay: 100 });
        result = `Typed into ${selector}`;
      } else if (action === "press") {
        await page.keyboard.press(key);
        result = `Pressed ${key}`;
      }

      await humanDelay();
      
      // Always take a screenshot after action for visual feedback
      const filename = `action-snap-${Date.now()}.png`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: screenshotPath });
      const screenshotUrl = `/preview/${filename}`;

      const content = await page.evaluate(() => {
        const toRemove = document.querySelectorAll('script, style, nav, footer, header, iframe, noscript');
        toRemove.forEach(el => el.remove());
        return document.body.innerText;
      });
      
      res.json({ status: "Success", result, screenshot: screenshotUrl, content: content.substring(0, 5000).trim() });
    } catch (error: any) {
      console.error("Local Web Action Error:", error);
      res.status(500).json({ error: `Action failed: ${error.message}` });
    } finally {
      if (browser) await browser.close().catch(console.error);
    }
  });

  // Docker API: List Containers
  app.get("/api/docker/ps", async (req, res) => {
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { stdout, stderr } = await execAsync("docker ps -a --format '{{json .}}'");
      if (stderr && !stdout) {
        throw new Error(stderr);
      }
      const containers = stdout.trim().split('\n').filter(Boolean).map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      res.json({ containers });
    } catch (error: any) {
      // Return empty list instead of 500 to prevent app breakage when Docker is missing
      res.json({ 
        containers: [], 
        warning: "Docker is not available or accessible in this environment." 
      });
    }
  });

  // Docker API: Actions
  app.post("/api/docker/action", async (req, res) => {
    const { action, containerId } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      let command = "";
      switch (action) {
        case "start": command = `docker start ${containerId}`; break;
        case "stop": command = `docker stop ${containerId}`; break;
        case "remove": command = `docker rm -f ${containerId}`; break;
        case "restart": command = `docker restart ${containerId}`; break;
        default: throw new Error("Invalid docker action");
      }
      await execAsync(command);
      res.json({ status: "Success" });
    } catch (error: any) {
      console.error("Docker Action Error:", error);
      let friendlyError = error.message;
      if (error.message.includes("permission denied")) {
        friendlyError = "Ingen adgang til Docker. Prøv at køre kommandoen med sudo eller tilføj din bruger til docker-gruppen.";
      }
      res.status(500).json({ error: friendlyError });
    }
  });

  // Docker API: Build and Run Project
  app.post("/api/docker/run", async (req, res) => {
    const { projectPath } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });

    try {
      const absolutePath = path.resolve(projectPath);
      const dockerfilePath = path.join(absolutePath, "Dockerfile");
      
      if (!existsSync(dockerfilePath)) {
        // Try lowercase
        const lowerDockerfilePath = path.join(absolutePath, "dockerfile");
        if (!existsSync(lowerDockerfilePath)) {
          throw new Error(`Mangler Dockerfile i mappen: ${projectPath}. Bed agenten om at oprette en Dockerfile først.`);
        }
      }

      const projectName = path.basename(absolutePath).toLowerCase().replace(/[^a-z0-9]/g, '-');
      const containerName = `app-${projectName}-${Date.now()}`;
      
      // 1. Build the image
      try {
        await execAsync(`docker build -t ${projectName} "${absolutePath}"`);
      } catch (buildError: any) {
        let msg = buildError.message;
        if (msg.includes("permission denied")) {
          msg = "Docker build fejlede pga. manglende rettigheder. Kør 'sudo usermod -aG docker $USER'.";
        }
        throw new Error(`Build fejl: ${msg}`);
      }
      
      // 2. Run the container (mapping port 80 to a random available port)
      // We use -P to map all exposed ports to random ports on the host
      let containerId = "";
      try {
        const { stdout: runOutput } = await execAsync(`docker run -d --name ${containerName} -P ${projectName}`);
        containerId = runOutput.trim();
      } catch (runError: any) {
        throw new Error(`Run fejl: ${runError.message}`);
      }

      // 3. Get the mapped port
      const { stdout: portOutput } = await execAsync(`docker port ${containerId} 80`);
      const port = portOutput.split(':')[1]?.trim();

      if (!port) {
        // Try to get any mapped port if 80 isn't explicit
        const { stdout: allPorts } = await execAsync(`docker port ${containerId}`);
        res.json({ 
          status: "Success", 
          containerId, 
          message: "Container started, but could not detect port 80 mapping. Check Docker tab.",
          rawPorts: allPorts
        });
      } else {
        res.json({ 
          status: "Success", 
          containerId, 
          port,
          url: `http://localhost:${port}`
        });
      }
    } catch (error: any) {
      console.error("Docker Run Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve Web Projects for Preview with Navigation Guard
  app.get("/preview/*", async (req, res, next) => {
    const filePath = path.join(WEB_PROJECTS_DIR, req.params[0]);
    
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        // If it's a directory, let express.static handle it (it will look for index.html)
        return next();
      }

      if (filePath.endsWith(".html")) {
        let content = await fs.readFile(filePath, "utf-8");
        
        // Sanitize dangerous links directly in the HTML string
        content = content
          .replace(/href="\/"/g, 'href="#"')
          .replace(/href=""/g, 'href="#"')
          .replace(/href='\/'/g, "href='#'")
          .replace(/href=''/g, "href='#'")
          .replace(/action="\/"/g, 'action="#"')
          .replace(/action=""/g, 'action="#"')
          .replace(/action='\/'/g, "action='#'")
          .replace(/action=''/g, "action='#'");

        const guardScript = `
          <script>
            (function() {
              // Overwrite window.open to prevent new windows/tabs
              window.open = function() { 
                console.warn('window.open blocked in preview');
                return null; 
              };

              // Intercept all clicks
              document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (link) {
                  // Force target to self to prevent breaking out of iframe
                  link.target = '_self';
                  
                  const href = link.getAttribute('href');
                  if (!href || href === '#' || href.startsWith('javascript:')) return;

                  // Resolve relative URLs
                  try {
                    const url = new URL(href, window.location.href);
                    
                    // If the URL is outside the preview path, block it
                    if (url.origin === window.location.origin && !url.pathname.startsWith('/preview/')) {
                      e.preventDefault();
                      console.warn('Navigation blocked: Preview is locked to /preview/ path.');
                      alert('Navigation outside of preview is disabled to prevent redirecting to the main app.');
                    }
                  } catch(err) {
                    if (href === '/' || href === '') {
                      e.preventDefault();
                      alert('Navigation to root is disabled.');
                    }
                  }
                }
              }, true);

              // Intercept form submissions
              document.addEventListener('submit', function(e) {
                const action = e.target.getAttribute('action');
                if (action) {
                  try {
                    const url = new URL(action, window.location.href);
                    if (url.origin === window.location.origin && !url.pathname.startsWith('/preview/')) {
                      e.preventDefault();
                      alert('Form submission outside of preview is disabled.');
                    }
                  } catch(err) {}
                }
              }, true);

              // Also try to catch programmatic navigation
              const originalLocation = window.location.pathname;
              setInterval(function() {
                if (window.location.pathname !== originalLocation && !window.location.pathname.startsWith('/preview/')) {
                  console.warn('Programmatic navigation detected, reverting...');
                  window.location.href = window.location.origin + originalLocation;
                }
              }, 500);
            })();
          </script>
        `;
        
        if (content.includes("</body>")) {
          content = content.replace("</body>", `${guardScript}</body>`);
        } else {
          content += guardScript;
        }
        
        res.setHeader("Content-Type", "text/html");
        return res.send(content);
      }
    } catch (e) {
      // File not found or other error, let express.static handle it
    }
    
    next();
  });

  app.use("/preview", express.static(WEB_PROJECTS_DIR));
  app.use("/preview", express.static(SCREENSHOTS_DIR));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  console.log("Starting server on port", PORT);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
