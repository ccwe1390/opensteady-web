---
description: Run one measurement probe against the installed extension and compare it with the saved result
argument-hint: "<real_input|per_trial|intentional_drag|hold_to_click|link_drag|alt_click|policy_variants|press_delay|meter_check> [args]"
---
Run `node probes/$ARGUMENTS` from the repo root. If `$ARGUMENTS` is empty, list the probes from `probes/README.md` with their run time and ask which one.

- Set `CHROME_EXECUTABLE=/opt/pw-browsers/chromium` when that file exists.
- Defaults when no extra args are given: `real_input.cjs 66 8,16`, `per_trial.cjs 66 16`, `hold_to_click.cjs 4 100`.
- Write output to the scratchpad, not to `results/`, unless the user asks to replace the saved result.
- Compare with the matching file in `results/` (see the table in `results/README.md`). Report per-row differences. For `real_input`, also report the planned vs actual press duration and the mean lag. A lag of tens of milliseconds means the machine was busy, so repeat the run before drawing a conclusion.
- Remind the user that every probe is a scripted hand, not evidence about people.
