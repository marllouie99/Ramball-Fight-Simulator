---
name: context-transfer
description: Expert context summarization and thread handoff engine. Packages all goals, technical decisions, file changes, progress status, and granular context into a single seamless copy-pasteable block for starting a new chat thread.
---

# Context Transfer Skill

Use this skill whenever transferring project state, task progress, and architectural decisions from an existing conversation into a fresh chat thread.

## Handover Protocol & Output Structure

When executing a context transfer, generate a single self-contained text block formatted to be directly copied and pasted into a new conversation. The recipient agent must be able to resume work immediately with zero ambiguities.

### Mandatory Structure:

1. **Mission Goals & Scope**:
   - Primary user requests and core task objectives.
   - High-level architecture and scope of changes.

2. **Key Decisions & Technical Rationale**:
   - Architectural patterns chosen and why.
   - Specific user constraints, preferences, and pivots.
   - Core invariants (e.g. anti-inversion, stack depth balance, poise rules).

3. **Progress & Status Ledger**:
   - **Finished**: Fully implemented, verified, and passing features.
   - **In Progress / Current Focus**: What was being actively modified or tuned.
   - **Not Started / Backlog**: Remaining planned tasks or pending user requests.

4. **File Registry & Symbol Ledger**:
   - Absolute or repository-relative paths to all modified, created, or relevant files.
   - Specific classes, functions, configs, and assets involved.
   - Verification test status (e.g., `npm run verify` results).

5. **Where We Left Off & Immediate Next Steps**:
   - Exact stopping point in the workflow.
   - Specific actionable commands or file modifications the new agent should perform next.

6. **Granular Context & Critical Notes**:
   - Edge cases, known quirks, and performance/rendering constraints.
   - Repository-specific development rules (e.g. AGENTS.md requirements, 0-depth Canvas stack, clean architecture).
