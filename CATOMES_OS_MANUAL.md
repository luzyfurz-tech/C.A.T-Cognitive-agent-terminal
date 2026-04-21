# 🐱 CATOMES OS: Operator Manual & System Description
**Version 4.25 // Neural-Vision Core**

## 1. Project Overview
CATOMES OS (Cognitive Agent Terminal Operating System) is a multi-agent orchestration platform designed for autonomous task execution, web research, software development, and system security. It provides a unified "Cyber-Nordic" interface for interacting with various specialized AI agents that can work independently or collaboratively to complete complex missions.

---

## 2. Neural & Visual Subsystems (New)

### 🧠 Persistent Neural Memory
*   **Protocol**: `[MEM_SAVE]`, `[MEM_LOAD]`
*   **Function**: The Supervisor uses a dedicated Knowledge Base to store "Lessons Learned" and successful configurations. This prevents repetitive errors across different missions. Memory is persistent across sessions and system reboots.

### 👁️ Visual Feedback Loop (Sight)
*   **Protocol**: `[VISION_QA]`
*   **Function**: The system can now "see" the Live Preview. By triggering a capture, the agent receives a high-resolution frame of the current UI, allowing for visual QA and precision adjustments (spacing, color, layout) that code analysis alone cannot achieve.

### 🛡️ System Guard (Rollback Engine)
*   **Protocol**: `[SNAPSHOT]`, `[ROLLBACK]`
*   **Function**: Provides a safety-net for autonomous operations. Before complex code changes or mass deletions, the system creates an immutable state snapshot. If an agent error occurs, the entire project can be reverted to a stable state with a single command.

---

## 3. System Architecture (The Agenter)

The system is divided into specialized "Views", each powered by a custom-prompted agent:

### 👤 Supervisor Agent (Command Center)
*   **Role**: The central coordinator and logic layer.
*   **Function**: This is where you initiate missions. The Supervisor can delegate tasks to other agents using the `[TRANSFER: agent_id]` protocol.
*   **Icon**: `Bot` / `Layout`

### 🌐 Web Research Agent (OllamaWeb)
*   **Role**: Information retrieval and research.
*   **Function**: Can browse the web using `[SEARCH]`, fetch page content with `[FETCH]`, and even interact with websites via `[ACTION]`.
*   **Icons**: `Globe` / `Search`

### 💻 Coding & Webdesign Agent
*   **Role**: Full-stack developer.
*   **Function**: Specializes in writing code, building UI components, and managing projects. It can trigger a **Live Preview** of your code directly in the browser.
*   **Icons**: `Code` / `Layout`

### ⚙️ Hermes (Runtime Engine)
*   **Role**: Tool calling and execution.
*   **Function**: The system's "hands". It executes CLI commands, runs scripts, and handles local file manipulations via the `[EXECUTE]` protocol.
*   **Icons**: `Zap` / `Terminal`

### 🛡️ AEGIS (Security Audit)
*   **Role**: System integrity and code review.
*   **Function**: Scans code for vulnerabilities, monitors system logs, and provides security assessments of the current workspace.
*   **Icons**: `Shield` / `Activity`

### 📊 CATOMES Control (Mission Control)
*   **Role**: Monitoring and orchestration.
*   **Function**: A dashboard that shows active missions, pending tasks, and global system logs. It tracks the status of "Catomes" (individual mission units).
*   **Icons**: `Database` / `Settings`

---

## 3. UI Components & Features

### 📁 File Commander (NC-Style)
*   **Location**: Sidebar (Toggle with the layout icon in the header).
*   **Function**: A classic dual-pane style file browser.
*   **Context Locking**: Double-click or select a file to lock it as "Context". This makes the active agent aware of that specific file without you having to upload it manually.

### 🛠️ Header Control Bar
*   **Model Knowledge Base (i)**: Shows technical details about available AI models.
*   **Settings (Gear)**: Configure API keys, themes, and Docker settings.
*   **System Guide (?)**: Opens the integrated FAQ and quick-start manual.
*   **Refresh**: Re-synchronizes with the AI server.
*   **Trash**: Clears the current session logs.

---

## 4. Operational Modes (The Badges)

In the top header, you see three interactive badges:

*   **AGENT**: When blue, I act as an autonomous agent (planning and executing). When gray, I act as a standard chatbot.
*   **AUTO**: When blue, I have **Full Autonomy**. I will write files and run commands without asking for permission. When gray, I will prompt you before every sensitive action.
*   **FOLLOW**: When green, the UI will automatically switch views to show you what I am doing (e.g., jumping to the code view when I start writing).

---

## 5. Getting Started
1.  **Boot Up**: Wait for the Neural Link to establish.
2.  **State your Mission**: In the main chat, tell the Supervisor what you want to achieve (e.g., "Build a landing page for my bakery").
3.  **Active Monitoring**: Watch the **FOLLOW** mode switch you between agents as they collaborate.
4.  **Review**: Use the **Webdesign View** to see live previews of your work.
5.  **Audit**: Use **AEGIS** to ensure your project is secure before finishing.

---
**NEURO-LINK ESTABLISHED // SYSTEM READY**
