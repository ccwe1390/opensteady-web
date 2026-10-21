---
description: Update HANDOFF.md so the next person (or session) can pick up the work cold
---
Rewrite `HANDOFF.md` from the current state. Keep its section headings:

1. **Where things stand**: version, branch, last commit, what was verified and when (counts from `results/`).
2. **What changed since the last handoff**: from `git log`.
3. **Open problems**: open findings from `docs/audits/`, failing or skipped checks, and the "not tested" list in docs/VALIDATION.md.
4. **Next steps, in order**, each with the command to run.
5. **Decisions that must not be reversed without Carol**: from `.claude/project-memory/important.md` and `decisions.md`.
6. **How to run everything**: short form of CLAUDE.md "Commands".

Plain text, short sentences, no claims beyond `results/`.
