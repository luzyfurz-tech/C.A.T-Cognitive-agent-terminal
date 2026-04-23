# 🐱 CATOMES OS: Complete Systems Integration Manual
**Version 4.50 // Neural-Vision Core // PostgreSQL Hardened**

## 1. Executive Summary
CATOMES OS (Cognitive Agent Terminal Operating System) is a high-performance orchestration layer designed for the Raspberry Pi environment. It transforms a standard Linux terminal into an autonomous AI workstation. By utilizing a "Hive Mind" architecture, the system delegates complex missions across specialized cognitive agents, providing a unified interface for web research, full-stack development, and digital security auditing.

---

## 2. Core Architectural Pillars

### 🧠 The Neural Core (Memory & Context)
The "Brain" of CATOMES OS is powered by a high-availability database layer.
*   **Infrastructure**: A PostgreSQL 15 container managed via Docker.
*   **Hybrid Engine**: The system employs a fail-safe hybrid strategy. If the PostgreSQL container is offline, the system automatically transitions to a local **SQLite** engine, ensuring zero downtime.
*   **Persistent Knowledge**: Unlike standard LLMs, CATOMES OS stores "Mission Summaries." When a task is complete, the Supervisor uses `[MEM_SAVE]` to store lessons learned, API configurations, and successful kodes-patterns for future recall.

### 👁️ Visual Intelligence Subsystem (Sight)
CATOMES OS is not just text-based; it has visual situational awareness.
*   **Multimodal Input**: Operators can paste screenshots (`Ctrl+V`) directly into the directive input.
*   **Vision QA**: Using the `[VISION_QA]` protocol, agents can capture a high-resolution frame of the **Live Preview**. This allows the Coder agent to "see" layout issues, color mismatches, or responsive design flaws in real-time.

### 🛡️ System Guard & Stability
*   **Atomic Snapshots**: Before executing risky commands (mass deletions, complex migrations), the system triggers a `[SNAPSHOT]`. This creates an immutable state of the current workspace.
*   **Rollback Protocol**: If an automated update fails or code becomes unstable, the Supervisor can trigger a `[ROLLBACK]`, returning the entire project directory to its last known healthy state.

---

## 3. The Agent Hive (Specialized Roles)

| Agent | Icon | Role | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Supervisor** | `Bot` | Command Center | Orchestration, delegation, long-term memory management. |
| **Coder** | `Code` | Lead Developer | Full-stack coding, UI/UX design, Live Preview injection. |
| **OllamaWeb** | `Globe` | Researcher | Live web-scraping, search engine interaction, data retrieval. |
| **Hermes** | `Zap` | Executioner | CLI execution, script running, Docker management, SSH. |
| **AEGIS** | `Shield` | Auditor | Code review, vulnerability scanning, system integrity checks. |

---

## 4. AI Engine & Cloud-Bridge Strategy

CATOMES OS is designed to be hardware-efficient by utilizing a **Hybrid AI Strategy**. While the core logic resides on your local Raspberry Pi, the heavy "Thinking" is offloaded.

### 🚀 Cloud Ollama Acceleration
*   **The Bridge**: By using a **Cloud Ollama API Key**, your Pi can connect to external high-performance AI clusters.
*   **Infinite Hardware**: This allows your Raspberry Pi to run "Heavyweight" models (e.g., Llama 3 70B, Mixtral) that would normally require a high-end AI server.
*   **Zero-Cost Access**: Operators can set up an **Ollama Cloud Bridge for free**. By obtaining a free API key and connecting it to CATOMES OS, you get the intelligence of a $10,000 AI rig running directly inside your terminal—totally free of charge to run day or night.
*   **Performance**: Local hardware (Pi) handles the UI, file management, and system execution, while the Cloud Bridge handles the complex reasoning.

---

## 5. Technical Specifications (Languages & Tools)

CATOMES OS supports a massive array of production-grade technologies, optimized for the ARM/Raspberry Pi architecture:

*   **Web Stack**: HTML5, CSS3, Tailwind CSS (Native support), JS (ES6+), TypeScript, React, Next.js.
*   **Backend & Systems**: Node.js, Python 3.11+, Go, Rust, **C++ (gcc/g++)**.
*   **Data Layers**: PostgreSQL (Main), SQLite (Fallback), Prisma ORM, Redis (Optional).
*   **DevOps**: Docker, Docker-Compose, Makefiles, **CMake**, Git.

---

## 6. UI Operational Guide

### 📂 Integrated File Commander
The left sidebar houses a context-aware file browser. 
*   **NC-Style**: Dual-pane inspiration for fast navigation.
*   **Context Locking**: Double-clicking a file "locks" it into the AI's short-term memory. The next prompt you send will automatically include the content of that file as context.

### 🖥️ Real-Time Telemetry (Bio-Metrics)
The header provides a live medical report of your hardware:
*   **TEMP**: CPU temperature status (Critical for Pi lifespan).
*   **RAM**: Memory saturation report.
*   **LOAD**: System burden average.
*   **UPTIME**: System stability counter.

### 🎮 Control Badges (The Autonomy Switches)
*   **[AGENT]**: Enables the "Thinking" cycle where the AI plans its own steps.
*   **[AUTO]**: **Full Autonomy Mode**. When active, the system installs packages, writes files, and deletes directories without asking for manual confirmation.
*   **[FOLLOW]**: Auto-focuses the UI on the agent currently performing work.

---

## 7. Standard Mission Workflow
1.  **Directive**: Operator provides a goal (e.g., "Build a telemetry dashboard for my solar panels").
2.  **Research**: **OllamaWeb** scans for API documentation or design inspiration.
3.  **Handoff**: Supervisor transfers the mission to **Coder**.
4.  **Codegen & Preview**: Coder writes the files to `web_design_workspace/projects/` and starts the **Live Preview**.
5.  **Audit**: **AEGIS** scans the generated code for security leaks.
6.  **Summary**: Supervisor saves the project DNA to the **Neural Core** and reports "Mission Accomplished."

---

## 8. Hardware Profiles (Special Operations)

### 🐯 Project "Siberian Tiger" (Sleeper Mode)
*   **Target**: BeagleBone Black (512MB RAM / 1GHz ARM).
*   **Optimization Layer**:
    *   **Chunk Sharding**: Monolithic bundles split into <200kB segments to prevent browser heap exhaustion.
    *   **Static Pre-compression**: All assets pre-compressed with Gzip (.gz) and Brotli (.br) to offload the BeagleBone's CPU during delivery.
    *   **Memory-Lean Build**: Disabled sourcemaps and compressed-size reporting to ensure builds complete within the 512MB RAM + Swap envelope.
    *   **Postgres Isolation**: Database runs as a background Docker unit with strict memory limits (configured in `docker-compose.yml`).

---
**NEURO-LINK: OPTIMIZED // POSTGRES: SYNCED // SYSTEMS: GO // SIBERIAN TIGER: ACTIVE**
