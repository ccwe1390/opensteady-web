---
description: Independent review in the style used for 0.1.4 - one fresh agent for code, one for documents - then verify and respond
argument-hint: "[git range, default: main...HEAD]"
---
Run an independent review of `$ARGUMENTS` (default `main...HEAD`).

1. Get the diff and the list of changed files.
2. Launch in parallel, each with only the diff, the file list and the repo (not this conversation):
   - the `code-reviewer` agent: correctness and safety of click delivery, trust boundary, lifecycle, tests that would miss a regression.
   - the `docs-reviewer` agent: every claim, number and instruction in changed documents and UI text, checked against code and `results/`.
3. Verify every finding yourself, by reading code or running a test. Classify each one as confirmed, plausible or rejected (with the reason).
4. Fix confirmed findings, each with a test where it is behavior. Rerun `/verify quick`.
5. Append a round to `docs/REVIEW-RESPONSE.md`: date, scope, each finding, verdict, and what changed (commit). If behavior changed, repeat once more with fresh agents. Stop after three rounds and list what remains open.
