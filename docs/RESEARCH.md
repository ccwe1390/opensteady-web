# Research notebook and reporting template

## Question

Can conservative temporal target selection reduce missed or wrong mouse activations compared with simpler rules without an unacceptable delay, and does that translate to benefit for people who have difficulty pointing?

Novelty is provisional. Smoothing, hysteresis, Gaussian target scoring, and larger interaction areas have prior work. A feature list is not an originality claim. This package's contribution is an inspectable implementation and an honest measurement framework; an original scientific contribution requires a focused review of prior work and new evidence.

## Evidence levels

1. Pure/mocked tests: logic contracts, invariants, lifecycle, and regression examples.
2. Trusted browser fixtures: actual propagation, synthetic delivery, native controls, and recovery in a specific Chromium version.
3. Seeded geometric replay: differences under a deliberately simple synthetic motion model. Scores for the selector's choice and for the delivered click are distinct.
4. Scripted trusted input: the installed extension driven in real time by trusted mouse events along the same synthetic paths (`probes/`). The events come through the browser's automation interface, not a physical mouse. This catches browser behavior the replay cannot model, such as native dragging and text selection. It is still a scripted hand.
5. Held-out participant traces: algorithm behavior on observed paths. Still not behavioral adaptation.
6. Paired sessions and follow-up: usability, individual benefit, failures, and whether people choose to keep using it.

Passing an earlier level does not establish a later one. Report negative results prominently. Up to 0.1.3 the conservative policy rejected almost every press by a shaking hand, so selector improvements produced almost no change in delivered outcomes. From 0.1.4 the press limit scales with measured shake, and the choice of selector shows up in delivered clicks, including wrong ones. Report both.

## Independent confirmation

No second external tremor dataset is supplied or evaluated. A compatible lab export can be replayed with the JSON loader. For an external dataset, first document coordinate units, sampling timing, task geometry, intended targets, and press/release semantics; implement and test a converter for that dataset. Data lacking those fields cannot validate target selection without untestable assumptions. Freeze all settings before viewing a confirmation set and preserve the raw data's license and consent restrictions.

## Daily entry

- Date / source hash / protocol version:
- Hypothesis stated before the run:
- Data source and whether previously inspected:
- Code change and reason:
- Verification actually run:
- Result including failures:
- What this supports and what it does not:
- Next decision:

## Write-up outline

Problem and user needs; prior tools and mechanisms; narrowly stated contribution; code/gesture contracts; development versus held-out protocol; participant-level methods where applicable; all outcomes and uncertainty; latency/compatibility tradeoffs; negative cases; privacy/reproducibility; scope and generalization limits.

Do not present synthetic amplitudes as diagnosed tremor severity, selected seeds as unbiased confirmation, three people as a population estimate, or an unrun rival as a measured baseline. Attach exact source and protocol hashes to every reported run.
