# performance - OpenSteady Web

- Pointer move queries a 64 px grid; never rescans the DOM. Index rebuilt on DOM change/scroll/resize.
- Index abstains above 6,000 controls. Browser suite covers 5,000 links.
- Hold to click ticks every 40 ms while enabled and focused. Stale-check timer in content.js.
- counters.slowestCallbackMs in the status report is the in-page measure to watch.
