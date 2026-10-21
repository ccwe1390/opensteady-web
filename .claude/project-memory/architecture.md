# architecture - OpenSteady Web

Full design: docs/ARCHITECTURE.md. Message protocol: docs/CONTRACTS.md.

Flow: popup/options/shortcut -> background.js (settings, session tab state, permissions, injection) -> content.js in ISOLATED world (FILES list in background.js) -> core/* pure modules -> HTMLElement.click() on redirect.
Core modules are UMD: module.exports in Node tests, globals (OpenSteadySelect, OpenSteadyPolicy, OpenSteadyJitter, OpenSteadyLinkDrag, OpenSteadyDwell, OpenSteadySettings) in the page.
