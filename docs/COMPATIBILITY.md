# Compatibility and manual acceptance checks

Record browser/OS/version/date and actual outcome for each row. A blank or “not run” row is not a pass. Use a page you control before testing any external service. Never use a real purchase, account deletion, or message submission to test a correction.

| Check | Expected behavior | Status |
|---|---|---|
| Install production extension | No mandatory website grant; popup opens | Not run manually |
| Enable a current tab | Outline/assistance on this tab only | Not run manually |
| Always enable one site | Optional host permission requested in a user gesture | Not run manually |
| Forget site | Assistance off and stored host grant removed | Not run manually |
| Global pause / resume | Existing enabled pages stop / explicitly opted pages resume | Not run manually |
| Browser restart / worker suspension | Remembered sites restored; tab-only state ends at browser close | Not run manually |
| Reload and same-site navigation | No duplicate controllers; remembered setting retained | Not run manually |
| Navigate to a different host | Tab-only assistance does not follow | Not run manually |
| Normal safe button / nested span | One native trusted activation | Automated fixture suite |
| Clear near miss with outline | One synthetic click on outlined target | Automated fixture suite |
| Small press slip | One correction, no duplicate original activation | Automated fixture suite |
| Native click on another control | Kept on that control | Pure and mocked tests |
| Large drag / drag returning to start | No correction | Pure and mocked tests |
| Text editing / selection / double-click word | Normal behavior | Manual selection check still needed |
| Ctrl/Cmd/Shift/Alt clicks | Normal behavior; no correction | Fixture and mocked checks; Cmd manual |
| Keyboard Enter / Space | Native behavior | Enter fixture; Space manual |
| Repeat-click guard off | Both native clicks work | Automated fixture suite |
| Link / checkbox / label / summary | Native state changes; no duplicate activation | Broaden manual checks |
| Disabled / hidden / transparent / covered control | No redirected activation | Broaden manual checks |
| Form submit / password / file picker | Native input only | Manual fixtures |
| Trusted-only handler | Redirect may be rejected; native click works | Automated limitation fixture |
| Target moves / disappears / gets replaced during press | No stale correction | Broaden fixture checks |
| Pointer capture / scroll during press / blur / Alt release | Gesture cancels; no stuck bypass | Manual fixtures |
| Frame / shadow-root control | Native behavior; no targeting assistance | Manual fixtures |
| 5,000 links / frequent DOM changes | No wrong delivery; collect index and callback timing | Manual performance check |
| More than 6,000 discovered controls | Target assistance abstains | Manual cap check |
| Errors | Fail open; third error pauses page | Mock adapter checks still expandable |

External-site checklist: choose a static informational page, a normal link list, an ARIA-heavy app, a modal dialog, a zoomed page, and a page with a sticky header. Record whether native clicks remain correct, redirection is accepted, and any target flickers or stale geometry occur. Respect each site's normal access requirements. This package contains no claim that external sites were verified.

The automated suite is not a complete compatibility certification. Its temporary localhost host permission bypasses the native permission dialog; actual popup grants need a manual check in the production package.
