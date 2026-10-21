# Compatibility and manual acceptance checks

Record browser, operating system, version, date and actual outcome for each row. A blank or "not run" row is not a pass. Use a page you control before testing any external service. Never use a real purchase, account deletion, or message submission to test a correction.

"Installed suite" below means `npm run test:browser`, which loads the real extension into Chromium and drives it with trusted mouse input. For 0.1.4 it was run on Linux with Chromium 141, not on a Mac. See `docs/VALIDATION.md`.

| Check | Expected behavior | Status for 0.1.4 |
|---|---|---|
| Install production extension | No mandatory website grant; popup opens | Not run manually |
| Enable a current tab | Outline and assistance on this tab only | Not run manually. The installed suite enables its own tab through the worker with a temporary localhost permission |
| Always enable one site | Optional host permission requested in a user gesture | Not run manually |
| Revoke remembered-site permission in Chrome | Existing tab assistance stops; site is forgotten | Mocked regression; manual check needed |
| Forget site | Assistance off and stored host grant removed | Not run manually |
| Global pause and resume | Existing enabled pages stop; explicitly opted pages resume | Mocked regression; not run manually |
| Browser restart and worker suspension | Remembered sites restored; tab-only state ends at browser close | Not run manually |
| Reload and same-site navigation | No duplicate controllers; remembered setting retained | Not run manually |
| Navigate to a different host | Tab-only assistance does not follow | Not run manually |
| Normal safe button, nested span | One native trusted activation | Installed suite |
| Clear near miss with outline | One synthetic click on the outlined target | Installed suite |
| Small press slip | One correction, no duplicate original activation | Installed suite |
| Wide slip after measured shake | One correction when the outline agreed; none for a steady hand | Installed suite |
| Native click on another control | Kept on that control, except after a drag the guard cancelled (see the quick drag guard rows below) | Pure and mocked tests; the probes saw no wrong clicks |
| Large drag, drag returning to start | No correction | Installed suite, pure and mocked tests |
| Text editing, selecting text, double-clicking a word | Normal behavior | Installed suite covers native selection; broaden manually |
| Press on selected link text | Treated as a press on the link | Installed suite |
| Press on selected plain text, steady hand | No assistance | Installed suite |
| Selected text somewhere else on the page | A near miss is still corrected | Installed suite |
| Press on selected plain text beside the outlined target, hand not steady | Delivered to the outlined target; the browser's drag of the selected words is cancelled | Installed suite |
| Only part of the text under the pointer is selected | A steady press on the unselected part is assisted; on the selected part it is not | Installed suite |
| Steady drag that selects text beside the outlined target | Nothing is clicked; the selection is kept | Installed suite |
| The same drag by a hand that is not steady | Delivered to the outlined target; the text it selected is deselected | Installed suite |
| Shift, Control, Command or Option clicks | Left to the browser; no correction | Installed suite for Shift and Control; mocked tests for all four; Command not run on a Mac |
| Keyboard Enter and Space | Native behavior | Enter in installed suite; Space manual |
| Hold to click on a small target with jitter | One activation after the full countdown, then movement required | Installed suite |
| Hold to click cancellation and exclusions | Manual press and Escape cancel; form, risky and no-assist controls stay native | Installed suite; broaden manually |
| Quick drag guard on (default), quick shaky press on a link | The drag is cancelled and the link is clicked once | Installed suite, paired replay, probes |
| Quick drag guard on, press, wait half a second, then drag | The browser drags as usual | Installed suite and `probes/intentional_drag.cjs` |
| Quick drag guard on, immediate long drag | Cancelled; nothing is clicked | Installed suite and `probes/intentional_drag.cjs` |
| Quick drag guard off, or a modifier held before the press | Native dragging is not cancelled | Installed suite |
| Link whose page cancels dragging itself, on the link or in a window listener added later | The page keeps its click however far or long the press goes; the guard does nothing | Installed suite |
| Link inside a clickable card (marked as a link, or with only a script), quick drag released on the card | The card gets no click | Installed suite |
| Mild tremor (measured 2 to 4 px) beside a target on text | Near misses are still corrected | Installed suite |
| Handle marked draggable inside a link | The page's own drag proceeds | Installed suite |
| Scroll event during a press after a cancelled drag | The click is still delivered | Installed suite |
| Control nested inside the pressed control | The page receives one trusted click, not a synthetic one | Installed suite |
| Repeat guard off | Both native clicks work | Installed suite |
| Link, checkbox, label, summary | Native state changes; no duplicate activation | Broaden manual checks |
| Disabled, hidden, transparent or covered control | No redirected activation | Installed suite covers risk and occlusion; broaden manually |
| Form submit, password, file picker | Native input only | Manual fixtures |
| Trusted-only handler | Redirect may be rejected; native click works | Installed suite (limitation fixture) |
| Target moves, disappears or is replaced during a press | No stale correction | Installed suite; broaden fixtures |
| Pointer capture, scroll during a press, blur | Gesture cancels | Mocked tests; check manually on real pages |
| Frame or custom-element control | Native behavior; no targeting assistance | Installed suite (closed custom element); other components manual |
| Explicit no-assist subtree, form gap | No redirected activation | Installed suite |
| 5,000 links, frequent DOM changes | No wrong delivery; collect index and callback timing | Installed suite stress check; manual performance check |
| More than 6,000 discovered controls | Target assistance abstains | Installed suite cap check |
| Errors | Fail open; third error pauses page | Mocked test |

External-site checklist: choose a static informational page, a normal link list, an ARIA-heavy app, a modal dialog, a zoomed page, and a page with a sticky header. Record whether native clicks remain correct, redirection is accepted, and any target flickers or stale geometry occur. Respect each site's normal access requirements. This package contains no claim that external sites were verified.

The automated suite is not a complete compatibility certification. Its temporary localhost host permission bypasses the native permission dialog. Actual popup grants need a manual check in the production package.

Custom-element subtrees and visible shadow hosts are excluded conservatively. A closed shadow root on an ordinary element cannot be identified reliably from the outside. Do not treat arbitrary shadow-DOM applications as verified. Site authors can mark containers with `data-opensteady-no-assist` to opt out.
