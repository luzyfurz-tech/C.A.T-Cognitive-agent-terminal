import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

const DB_DIR = path.join(process.cwd(), 'web_design_workspace', 'data');
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

const dbPath = path.join(DB_DIR, 'history.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    agent_id TEXT,
    type TEXT,
    event TEXT,
    content TEXT,
    status TEXT,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT UNIQUE,
    title TEXT,
    description TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    view_id TEXT,
    role TEXT,
    content TEXT,
    thinking TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface AgentLog {
  agent_id: string;
  type: string;
  event: string;
  content: string;
  status?: string;
  metadata?: string;
}

export const dbService = {
  log: (entry: AgentLog) => {
    const stmt = db.prepare(`
      INSERT INTO agent_logs (agent_id, type, event, content, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(entry.agent_id, entry.type, entry.event, entry.content, entry.status || 'info', entry.metadata || '{}');
  },

  getLogs: (limit = 100) => {
    return db.prepare('SELECT * FROM agent_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  },

  createMission: (mission_id: string, title: string, description: string) => {
    const stmt = db.prepare(`
      INSERT INTO missions (mission_id, title, description, status)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(mission_id, title, description, 'active');
  },

  updateMissionStatus: (mission_id: string, status: string) => {
    const stmt = db.prepare('UPDATE missions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE mission_id = ?');
    return stmt.run(status, mission_id);
  },

  saveChatMessage: (view_id: string, role: string, content: string, thinking?: string) => {
    const stmt = db.prepare('INSERT INTO chat_messages (view_id, role, content, thinking) VALUES (?, ?, ?, ?)');
    return stmt.run(view_id, role, content, thinking || null);
  },

  getChatMessages: (view_id: string) => {
    return db.prepare('SELECT role, content, thinking FROM chat_messages WHERE view_id = ? ORDER BY id ASC').all(view_id);
  },

  clearChatMessages: (view_id: string) => {
    return db.prepare('DELETE FROM chat_messages WHERE view_id = ?').run(view_id);
  },
  
  saveKnowledge: (key: string, value: string, tags: string = '') => {
    const stmt = db.prepare(`
      INSERT INTO knowledge_base (key, value, tags, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        tags = excluded.tags,
        updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(key, value, tags);
  },

  searchKnowledge: (query: string) => {
    const stmt = db.prepare(`
      SELECT * FROM knowledge_base 
      WHERE key LIKE ? OR value LIKE ? OR tags LIKE ? 
      ORDER BY updated_at DESC
    `);
    const q = `%${query}%`;
    return stmt.all(q, q, q);
  }
};

export default db;
