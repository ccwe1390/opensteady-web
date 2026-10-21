# Update to 0.1.5

Starting with 0.1.5 the project lives on GitHub at <https://github.com/ccwe1390/opensteady-web>, so updating is a Git pull instead of copying folders.

## If your project folder is a Git clone of that repository

1. Open Terminal in your project folder (type `cd `, drag the folder in, press Enter).
2. Run:

   ```sh
   git status --short
   git pull
   ```

   If `git status --short` lists files you changed yourself, commit or move them first.
3. Confirm `extension/manifest.json` says version **0.1.5**.
4. Open `chrome://extensions`. On the OpenSteady card, click the circular **Reload** arrow. Confirm it now says **0.1.5**.
5. Reload your test page tab with **Command+Shift+R**, then press **Control+Shift+S** (the new shortcut) or use the toolbar's **Enable on this tab**.

## If you still have a folder from a ZIP

Clone the repository next to it and load the new `extension` folder instead:

```sh
git clone https://github.com/ccwe1390/opensteady-web.git
```

In `chrome://extensions`, remove the old OpenSteady card first, then **Load unpacked** and pick `opensteady-web/extension`. Do not install two copies at once. Your settings and remembered sites belong to the old card and are not carried over. Turn your sites on again from the toolbar.

## What changes for you

Clicking behaves exactly as in 0.1.4. New: the **Control+Shift+S** shortcut (change it at `chrome://extensions/shortcuts`), an **Outline style** choice under **Settings & privacy**, and dark mode that follows your Mac's appearance setting.

## Check after updating

Start the lab server (`python3 -m http.server 8000 --bind 127.0.0.1` in the project folder) and open <http://127.0.0.1:8000/lab/index.html>. Press Control+Shift+S. The toolbar icon shows **ON**. Move slowly beside a small button until the outline appears and click. The lab shows "Activated" with the target's name. Press Control+Shift+S again and the badge clears. If the shortcut does nothing, Chrome may not have assigned it (for example when another extension already uses it). Open `chrome://extensions/shortcuts` and set it there. The popup also shows which key is set.

None of the 0.1.5 checks were run on a Mac. If something differs, note your macOS and Chrome versions and open an issue.
