# Sundae Run Garage — handoff to Codex

**Open `CODEX_HANDOFF.md` first.** This is a verified transfer package of the *existing project source, image references and detailed context*. It does not claim to contain a finished or fixed game.

## Directory map

| Item | What it is |
|---|---|
| `CODEX_PROMPT.txt` | Short paste-ready instruction for Codex |
| `CODEX_HANDOFF.md` | Full goals, specifications, context, known failures, development plan |
| `AGENTS.md` | Repo-specific instructions for an agent/Codex |
| `docs/FULL_SCREEN_SPECIFICATION.md` | Previously approved detailed build spec |
| `docs/LAYOUT.json` | Layout region bounding boxes |
| `docs/PROJECT_HISTORY.md` | Detailed summary of relevant conversation and decisions |
| `docs/KNOWN_DEFECTS_AND_ASSETS.md` | Why wheels/paint currently fail and what to do |
| `docs/PROGRESS_AND_TEST_RESULTS.md` | Acceptance-gate checklist, currently incomplete |
| `reference/APPROVED_BLUE_STI_SCREEN.png` | **Primary approved visual target** |
| `reference/SECOND_DESIGN_REFERENCE_PORSCHE.png` | Earlier UI layout inspiration |
| `reference/ANNOTATED_LAYOUT.jpg` | Screenshot with geometry |
| `qa/` | Before/after screenshots of known broken states |
| `source-art/` | Older 2D PNG shells/rims and logo; not drop-in production assets |
| `index.html`, `style.css`, `app.js`, `assets/` | **Editable broken V2 baseline**. Debug and replace as appropriate |
| `OPEN-THIS-GAME.html` | Last V2 self-contained demo, **NOT approved** |

## Usage

1. Extract this ZIP (do **not** open source from inside compressed view).
2. Open the extracted folder as the Codex project/workspace, or attach the ZIP to Codex and ask it to inspect/extract it.
3. Paste the full text from `CODEX_PROMPT.txt` into Codex.
4. Don't judge completion by the first game loading; require visual screenshots showing correct wheels, paint and branding.

### To run the existing broken diagnostic project, not final product

From the folder containing `package.json`:

```powershell
npm install
npm run dev
```

If PATH cannot find npm on Windows, see `CODEX_HANDOFF.md` for commands.

## Scope

ONE screen only. Blue STI fixed camera, fully seated on golden platform, sunset Sundae Run garage, exact reference layout, **functional wheels/paint/checkmarks/pricing**. Do not create the rest of the garage game in this task.
