# Project Rules & Guidelines

- **Code Modification Approval Rule**: 
  - Before modifying any source code in this project, the AI agent **must** create an implementation plan (under `implementation_plan.md` or as a direct proposal) and obtain explicit user approval.
  - No code changes (adds, edits, or deletes) should be executed without the user's explicit confirmation.
  - Always explain the proposed changes clearly and wait for the user to say "Proceed" or give approval before editing files or running modification commands.

- **Mandatory Holistic Impact Analysis & Regression Prevention Rule**:
  - NEVER make piecemeal or partial modifications when a feature, bug fix, or architectural change is requested.
  - BEFORE writing or editing any code, the AI agent MUST perform a strict end-to-end impact analysis across all layers:
    1. Configuration / Rule Schemas (`trend-rules.json`)
    2. Crawler / Backend Engines (`scripts/trend-crawler.cjs`)
    3. Frontend Component Layouts & Tabs (`src/components/TrendDiscoveryFeed.jsx`)
    4. Settings Modal UI (`src/components/TrendSettingsPanel.jsx`)
    5. Card Badge Labels & Metrics (e.g. `🔥 반응도 점수` instead of `클린지수`)
  - When editing existing files, the agent MUST explicitly verify that existing constant declarations, helper functions, and scope variables (e.g., `ALL_CAT_SEQS`, `NAVER_CATEGORIES`) are NOT accidentally removed, shadowed, or broken.
  - Check all downstream/upstream imports and callers to prevent regression across components.

- **Mandatory Multi-Stage Testing & Runtime Verification Rule (BEFORE Push)**:
  - The AI agent **MUST ALWAYS** run and pass a multi-stage verification process before executing any `git push`:
    1. **Stage 1 (Build Integrity)**: Run `npm run build` and ensure zero build errors or warnings.
    2. **Stage 2 (Runtime & Scope Verification)**: Statically or programmatically inspect the bundled output and raw source to ensure NO missing global/scope variables (`ReferenceError`), missing imports, or undefined property access (`TypeError`).
    3. **Stage 3 (State & Data Flow Integrity)**: Verify that initial states, fallback values, and event handlers work cleanly even when cloud/local data is empty or malformed.
  - Never push code blindly based on assumptions; any failure in verification blocks the push until resolved and re-tested.

- **Mandatory No-Live-API-Call Testing Rule**:
  - Do NOT make live/external API calls (e.g., Gemini AI API, live billing endpoints) purely for testing purposes to prevent quota consumption or unintended token costs.
  - Rely on static analysis, structural verification, bundle inspections, and mock validation instead of firing live API calls during testing.
