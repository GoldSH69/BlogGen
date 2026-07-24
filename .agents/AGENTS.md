# Project Rules & Guidelines

- **Code Modification Approval Rule**: 
  - Before modifying any source code in this project, the AI agent **must** create an implementation plan (under `implementation_plan.md` or as a direct proposal) and obtain explicit user approval.
  - No code changes (adds, edits, or deletes) should be executed without the user's explicit confirmation.
  - Always explain the proposed changes clearly and wait for the user to say "Proceed" or give approval before editing files or running modification commands.

- **Mandatory Holistic Impact Analysis & Coherence Rule**:
  - NEVER make piecemeal or partial modifications when a feature or architectural change is requested.
  - BEFORE writing code, the AI agent MUST analyze the FULL end-to-end impact across ALL project layers:
    1. Configuration / Rule Schemas (`trend-rules.json`)
    2. Crawler / Backend Engines (`scripts/trend-crawler.cjs`)
    3. Frontend Component Layouts & Tabs (`src/components/TrendDiscoveryFeed.jsx`)
    4. Settings Modal UI (`src/components/TrendSettingsPanel.jsx`)
    5. Card Badge Labels & Metrics (e.g. `🔥 반응도 점수` instead of `클린지수`)
  - All layers MUST be updated together in a single coherent step, ensuring no leftover old tabs, old forms, or wrong badge labels remain anywhere in the UI or codebase.
  - Always verify that the UI components (tabs, forms, badges, labels) completely reflect the new backend logic before declaring completion.

- **Mandatory Direct Answer First Rule**:
  - Whenever the user asks a question or raises an issue, the AI agent **MUST** provide a clear, direct natural language answer and explanation **FIRST** before taking action, running commands, or modifying code.
  - Never jump straight to executing tool calls or code edits without answering the user's inquiry first.

- **Mandatory Empirical Code Verification Before Answering Rule**:
  - The AI agent **MUST NEVER** make assumptions, guess variable values, or give answers based on memory without FIRST reading and empirically inspecting the actual source files using code search or view tools.
  - Every answer provided to the user must be verified directly against the latest raw code, schemas, and runtime configurations.


