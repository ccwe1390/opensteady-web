# Research notebook and reporting template

## Question

Can conservative temporal target selection reduce missed or wrong mouse activations compared with simpler rules without an unacceptable delay, and does that translate to benefit for people who have difficulty pointing?

Novelty is provisional. Smoothing, hysteresis, Gaussian target scoring, and larger interaction areas have prior work. A feature list is not an originality claim. This package's contribution is an inspectable implementation and an honest measurement framework; an original scientific contribution requires a focused prior-work review and new evidence.

## Evidence levels

1. Pure/mocked tests: logic contracts, invariants, lifecycle, and regression examples.
2. Trusted browser fixtures: actual propagation, synthetic delivery, native controls, and recovery in a specific Chromium version.
3. Seeded geometric replay: differences under a deliberately simple synthetic motion model. Algorithm selection and delivered-click scores are distinct.
4. Held-out participant traces: algorithm behavior on observed paths; still not behavioral adaptation.
5. Paired sessions and follow-up: usability, individual benefit, failures, and continued-use choices.

Passing an earlier level does not establish a later one. Report negative results prominently. The conservative shipped policy preserves native clicks on neighboring controls and rejects large excursions, which can make selector improvements produce little change in delivered outcomes.

## Independent confirmation

No second external tremor dataset is supplied or evaluated. A compatible lab export can be replayed with the JSON loader. For an external dataset, first document coordinate units, sampling timing, task geometry, intended targets, and press/release semantics; implement and test a dataset-specific converter. Data lacking those fields cannot validate target selection without untestable assumptions. Freeze all settings before viewing a confirmation set and preserve the raw data's license and consent restrictions.

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
