---
description: Write a pre-mortem for the next milestone (store submission, pilot, or release) in docs/
argument-hint: "<milestone, e.g. store submission | pilot with participants | 0.2.0>"
---
Imagine that `$ARGUMENTS` has failed badly, six months from now. Write `docs/YYYY-MM-DD_pre-mortem-<slug>.md`.

- List 10-15 concrete ways it failed: technical (site breakage, store rejection over permissions, Chrome API change, synthetic clicks rejected), human (confusing recovery, a wrong click on something that mattered, no benefit for a real tremor), evidence (claims beyond results/, overfitting to scripted paths), and process (no support channel, no Mac run).
- For each: likelihood (low/med/high), impact, an early warning sign, and a mitigation with an owner (Carol or "Claude session") and a check that shows it was done.
- Ground each item in this repo: cite the file, the doc section or the result that makes it plausible. No generic risks.
- End with the three mitigations to do first, and why.
