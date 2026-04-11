# Agent Autonomy Rules

The AI agent is authorized to execute commands autonomously, except for the following actions which MUST require explicit user confirmation:

1. **Deleting**: Any file or directory deletion.
2. **Installing**: Any new package or dependency installation.
3. **Editing**: Any file modification.

For all other actions, the agent is encouraged to proceed autonomously without prompting for confirmation.
