# Project Rules & Guidelines

- **Mandatory Session-Start Git Pull Rule (대화 세션 시작 시 1회 Git Pull 필수 원칙)**:
  - The AI agent **MUST** run `git pull` **only once at the very start of a new conversation session** to synchronize local files with the remote repository.
  - Do NOT repeatedly run `git pull` on every single message turn within an ongoing conversation session.

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

- **Mandatory Pre-Push Documentation Rule (푸시 전 작업 내용 문서화 필수 원칙)**:
  - The AI agent **MUST ALWAYS** document all work contents, decisions, modifications, and state updates in the project documentation (e.g., `docs/PROJECT_STATE.md`, `README.md`, or relevant project docs) **BEFORE** executing any `git commit` and `git push`.
  - Every push must include the documented history of what was changed, why, and how it was tested.
  - Never push code changes without updating the project documentation first.

- **Mandatory Multi-Stage Testing & Runtime Verification Rule (BEFORE Push)**:
  - The AI agent **MUST ALWAYS** run and pass a multi-stage verification process before executing any `git push`:
    1. **Stage 1 (Build Integrity)**: Run `npm run build` and ensure zero build errors or warnings.
    2. **Stage 2 (Runtime & Scope Verification)**: Statically or programmatically inspect the bundled output and raw source to ensure NO missing global/scope variables (`ReferenceError`), missing imports, or undefined property access (`TypeError`).
    3. **Stage 3 (State & Data Flow Integrity)**: Verify that initial states, fallback values, and event handlers work cleanly even when cloud/local data is empty or malformed.
  - Never push code blindly based on assumptions; any failure in verification blocks the push until resolved and re-tested.

- **Mandatory No-Live-API-Call Testing Rule**:
  - Do NOT make live/external API calls (e.g., Gemini AI API, live billing endpoints) purely for testing purposes to prevent quota consumption or unintended token costs.
  - Rely on static analysis, structural verification, bundle inspections, and mock validation instead of firing live API calls during testing.

- **Mandatory Ground-Truth Integrity & No-Fake-Metrics Rule (가짜/더미 데이터 및 AI 환각 수치 제공 절대 금지 원칙)**:
  - The AI agent **MUST NEVER** use hardcoded mock data, fabricated numbers, or AI-generated hallucinations in place of real statistical/analytical metrics (such as search volume, document counts, analytics metrics, keyword opportunity indices, or ranking numbers).
  - If a user requests a feature that requires external API credentials, licensed data feeds (e.g., Naver Search Ads API, Naver Blog Search API), or server-side infrastructure that is currently absent or unavailable:
    1. The AI agent **MUST explicitly and transparently state the exact technical limitations and prerequisites UPFRONT** before proposing or writing any code.
    2. The AI agent **MUST NEVER** build superficial UI shells with fake, hardcoded, or AI-hallucinated numbers to simulate functionality.
    3. The AI agent **MUST NOT** waste the user's valuable tokens and time on non-functional mock data.
  - Every analytical metric shown to the user MUST be backed by genuine, verified, real-time ground-truth API/crawler data. If the required ground-truth API/credential does not exist, the agent must decline the simulation and clearly explain why.

