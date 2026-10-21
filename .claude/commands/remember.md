---
description: File a fact, decision, gotcha or result into the right .claude/project-memory bin
argument-hint: "<what to remember>"
---
Store `$ARGUMENTS` in project memory.

1. Read `.claude/project-memory/INDEX.md`. Pick the one best bin. Use `important.md` only for facts where getting it wrong is irreversible, invalidates results, or breaks a store or permission constraint.
2. Add a dated entry (YYYY-MM-DD) in the bin's existing format: **What**, **Constrains** (or **Why**), **Source**. ASCII only. Keep it short. Detail belongs in docs/.
3. If the fact contradicts an existing entry, don't delete the old one. Add an "Update (date)" line under it that says what superseded it.
4. Update the bin's "(updated YYYY-MM-DD)" in INDEX.md.
5. Never store secrets, personal data, private URLs or pointer traces.
