# Start here

This is OpenSteady Web 0.1.4.

1. Unzip this download. Open the outer **opensteady-web** folder.
2. In Chrome, open `chrome://extensions`. Turn on **Developer mode**. Click **Load unpacked** and select the **extension** folder.
3. Open Terminal. Type `cd ` (with a space after it), drag the outer **opensteady-web** folder into the window, and press Enter.
4. Paste:

   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

   The first time you run `python3`, your Mac may offer to install Apple's command line developer tools. Say yes, wait for it to finish, then paste the line again.

5. Open <http://127.0.0.1:8000/lab/index.html>.
6. Click the puzzle piece at the top right of Chrome, then the pin next to **OpenSteady Web**, so its icon stays in the toolbar. Click that icon and choose **Enable on this tab**.

Move slowly beside a small button. If a green outline appears, a near miss can be corrected. Some gaps deliberately get no correction. Correct clicks keep normal behavior.

**What is new in 0.1.4.** If the pointer is shaking just before you press, the press may wander further and still count as a click. A quick drag on a link or button is kept as a click. Selected text somewhere on the page no longer switches assistance off. To try the second one, move the mouse a little while clicking a link in the lab's **Dense list**. To try the first, shake the mouse for half a second beside a small button with the outline showing, then click while still shaking.

**To drag a link on purpose:** press, wait half a second, then move. A drag that starts the instant you press is treated as a slip. You can switch this off under **Settings & privacy**.

**Optional hold to click:** open the toolbar and choose **Turn on hold to click**. Keep the outline on a lab target until the progress bar fills (0.9 seconds). It clicks without pressing the mouse. Move 32 pixels away for a quarter second before trying again. Change the countdown under **Settings & privacy**. Turn this feature off before making press and release recordings.

**Escape** pauses this page. Use the toolbar to resume or to turn assistance off. A click made with Shift, Control, Command or Option held is left to the browser. Keep Terminal open for the lab. Control+C stops its server.

The full project, tests, benchmark, measurement probes, and evaluation materials are in this folder. A separate extension-only ZIP is in **release** for later store submission. It is not a published store app.

This is an experimental release. It has not established benefit for people with tremor. Every measurement of this build comes from a scripted hand on Linux (in Chromium for the browser tests), not from people and not from a Mac. Read **docs/VALIDATION.md** for exactly what passed and what still needs checking on your Mac. If you are updating an older copy, read **UPDATE-MAC.md**.
