# User evaluation kit

Status: prepared materials only. No participants have been recruited, no approval obtained, and no benefit or continued use measured by this package.

## Start with feedback

Ask an adult who has difficulty pointing/clicking whether the problem occurs in webpages, and which errors matter: misses, slips, unintended neighboring targets, repeats, or a shaking cursor itself. Do not assume a browser extension addresses their main difficulty. Ask an occupational therapist about the task and recovery controls. These are feedback conversations, not treatment.

For a formal study, obtain the review and permissions your school/research host requires before recruiting or collecting data. This kit does not substitute for that process. A small informal usability check should still be voluntary, clearly explained, and easy to leave.

## Invitation draft

“I’m developing an experimental browser tool that may make small mouse targets easier to click. I’d like feedback from adults who find mouse pointing difficult. The first session uses a local practice page, takes about 15–20 minutes, and does not involve banking, messages, or account changes. It is not a medical treatment, and it may not help. Participation is optional; you can stop at any time. Would you be willing to discuss whether this addresses a difficulty you actually experience?”

Do not send this to anyone without the user's explicit instruction. Support-group access and therapist participation are not assumed or guaranteed.

## Plain-language explanation before recording

“This is a prototype. We are checking whether it makes clicks easier or more frustrating. You can choose ordinary clicking instead, skip any task, or stop. Only the practice page can record mouse coordinates, timing, target positions, and which target was activated. It does not record what you type or send data anywhere. You decide whether to export a recording. An export may reveal movement patterns; please do not put your name or medical details in it. You may decline recording and still give feedback.”

Record the person's agreement outside the trace using the process approved by your host. Explain how to request deletion, who will see exports, and how long they will be retained **before** collecting any. Do not publish a trace without separate permission to share it.

## First usability session (15–20 minutes)

1. Confirm the task is comfortable. Let the person try their usual zoom, pointer size, and input device first. Note these settings without storing sensitive details.
2. Give the ZIP/install instructions or eventual store link. Observe installation without taking over. Record time, requests for help, and whether they reach the first assisted click.
3. Practice on the local lab without recording. Demonstrate Alt, Escape, and the toolbar off switch. Confirm they can recover themselves.
4. Run one 22-trial recorded block with extension off and one with steady selection on, if they voluntarily agree. Alternate order across participants (AB, BA, AB, BA). Use equal practice and breaks. The lab's condition label does not change extension settings; the operator must verify the toolbar setting before each block.
5. Ask: What felt easier? What felt slower? Did it ever select the wrong control? Was the outline understandable? Could you turn it off? Would you want to use it on a webpage you already use?
6. Let the participant choose whether to export. Keep anonymous session IDs separate from contact/consent information. Do not include names, diagnoses, URLs, or message contents in trace files.

The current lab records one attempt per prompt. It measures single-attempt accuracy and prompt-to-press time, **not attempts per completed task**. A future retry-to-completion task is needed to estimate that outcome. Breaks and familiarity affect these timings.

## Freeze before confirmatory data

Create a fresh protocol before opening held-out participant traces. Specify software hashes, participant-level grouping, order allocation, task geometry, primary outcome, meaningful effect threshold informed by users, exclusion rules, missing-data handling, and a fixed analysis. No threshold is invented here. Development seeds and already inspected traces cannot become a held-out confirmatory set.

Use each person as the comparison unit. Trial-level Wilson intervals in the replay code are descriptive for the synthetic trial generator; they are not participant-level confidence intervals. Report every participant's on/off difference and any negative experiences before considering aggregate statistics. Three to five users can reveal usability problems; they cannot establish a broad clinical claim.

## Two-week follow-up

Only if a participant voluntarily wants to keep the tool, let them choose non-sensitive sites. Agree on a contact method before the session. At about two weeks ask:

- Is it still installed? Is it enabled on any sites? Which kinds of tasks does it help?
- Has it caused a wrong activation, blocked an intentional repeat, or disrupted a page?
- Have you needed the bypass/off controls? Were they accessible?
- Would you keep it? What is the most useful change?

No covert telemetry. A participant can read the current page's counters from the popup if they want; those reset on reload and do not measure cumulative adoption. Report this limitation.

## Session sheet

| Field | Entry |
|---|---|
| Anonymous session ID | |
| Date / software version / hashes | |
| Browser / OS / mouse / zoom | |
| Agreed task and recording/export choices | |
| Block order | |
| Install success / minutes / help needed | |
| Off: trials / correct / wrong / miss / time | |
| On: trials / correct / wrong / miss / time | |
| Duplicate activations / compatibility failures | |
| Comfort / recovery / outline feedback | |
| Keep-using choice | |
| Follow-up agreement and result | |

Keep contacts and consent records in a separate approved location. Never commit personal information or participant traces to GitHub by default.
