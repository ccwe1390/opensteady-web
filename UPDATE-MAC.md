# Update to 0.1.4

Keep your current project folder, particularly if you have already initialized Git there.

1. Double-click the new ZIP. If a folder called **opensteady-web** already sits in the same place, your Mac names the new one **opensteady-web 2**. That is fine. The steps below call it "the new folder".
2. In the new folder, confirm `extension/manifest.json` says version **0.1.4**.
3. If you put files of your own inside any folder of your existing project folder (for example a saved trace in `results`), move them somewhere else first. The next step replaces folders whole.
4. Open the new folder, select everything inside it (Command+A), and drag it all into your existing project folder. When Finder asks, choose **Replace** for each item. This version changes the files at the top level and in `extension`, `lab`, `benchmark`, `test`, `tools`, `docs`, `results` and `release`, and adds a `probes` folder, so copy all of them. Your hidden Git folder is not touched.
5. Open `chrome://extensions`. On the OpenSteady card, click the circular **Reload** arrow. Confirm it now says **0.1.4**.
6. Reload your test page tab with **Command+Shift+R**, open the OpenSteady toolbar menu, and choose **Enable on this tab**.

The server can remain running for this update. Do not install a second copy alongside the first.

If you had switched on **Prevent link dragging while clicking (experimental)** in 0.1.3, that setting has been replaced. The new setting, **Keep a quick drag on a link or button as a click**, starts on. Switch it off under **Settings & privacy** if you do not want it.

To update GitHub as well, open Terminal in your existing project folder and run:

```sh
git status --short
git add .
git commit -m "OpenSteady Web 0.1.4: press limit scales with measured shake, quick drag guard on by default"
git push
```

These Git commands apply only if your first commit and push already succeeded. If not, follow the initial repository setup instructions first. The commit includes the small extension ZIP in `release`, which is intended.

## Check after updating

Use the lab page at <http://127.0.0.1:8000/lab/index.html> with **Enable on this tab** chosen. The lab shows "Activated" with the name of a target each time one is clicked.

- A slow near miss beside a lab target with a visible outline should produce one activation.
- A normal direct click should still produce one activation.
- Click a link in the **Dense list** while moving the mouse a little. It should count as one activation, not start a drag.
- Press a link in the **Dense list**, hold still for a full second, then move. The browser should drag the link as usual, and nothing should be activated.
- Press a link and immediately drag it far away. Nothing should be activated.
- Select a few words of text anywhere on the page, then make a near miss beside a button with the outline showing. It should still be corrected.
- Hover beside a button until the outline shows, then hold Shift and click without moving. Nothing should be activated, because a click with a modifier key is never corrected.
- Press Escape. The outline should stop appearing. The toolbar should resume it.
- Open a new tab (Command+T), go to <http://127.0.0.1:8000/lab/fixtures.html>, click the OpenSteady icon and choose **Enable on this tab**. Click in the gap just beside the **Submit** button inside the form, and just beside the **Delete account** button. Neither should be activated by a near miss.
- If you remembered a site, revoke its permission in Chrome's extension controls and check that assistance stops there. You can explicitly enable it again afterward.

If something fails, write down the page, the exact steps, and the popup's correction and error counts. Take a screenshot of any Chrome **Errors** panel. Every result shipped in this package comes from a scripted hand on Linux (in Chromium for the browser tests). None of it has been checked on a Mac yet, and none of it establishes benefit for people with tremor.

## Run the automated checks on your Mac

These need Node version 20 or newer. Type `node --version` in Terminal to check. If the command is not found, install Node from <https://nodejs.org> first.

Leave the lab's server running in its own Terminal window. Open a second Terminal window, type `cd ` (with a space), drag your project folder in, press Enter, then run:

```sh
npm install
npx playwright install chromium
npm test
npm run check
npm run test:browser
npm run test:review-links
```

`npm test` should report 0 failures. `npm run test:browser` should print a line starting with PASS for every check and no error. `npm install` fetches a newer Playwright, and `npx playwright install chromium` a newer test browser, than the ones used for the results shipped here, so a different outcome on your Mac is possible. If anything differs, keep the output. That is useful information, not a mistake on your part.

The browser tests write their results into the `results` folder, replacing some of the Linux results shipped here. So commit the update first (the Git commands above), then run the tests. Afterwards, `git checkout results` puts the shipped results back. If you would rather keep your Mac results, commit them with a message that says they came from your Mac.

## Try hold to click

Open the toolbar and choose **Turn on hold to click**. The default countdown is 0.9 seconds. Aim at a small lab button without pressing the mouse and let its outline progress bar fill. It should activate once. Move away before another activation. Use **Settings & privacy** to adjust the delay. Escape pauses the page. Turn hold to click off before making press and release recordings.
