# Start here

1. Unzip this download. Open the outer **opensteady-web** folder.
2. In Chrome, open `chrome://extensions`. Turn on **Developer mode**. Click **Load unpacked** and select the **extension** folder.
3. Open Terminal. Type `cd `, drag the outer **opensteady-web** folder into the window, and press Enter.
4. Paste:

   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

5. Open <http://127.0.0.1:8000/lab/index.html>.
6. Click the OpenSteady toolbar icon and choose **Enable on this tab**.

Move slowly beside a small button. If a green outline appears, a small near miss can be corrected. Some gaps deliberately get no correction. Correct clicks keep normal behavior.

**Alt** bypasses assistance. **Escape** pauses this page. Use the toolbar to resume or turn it off. Keep Terminal open for the lab; Control+C stops its server.

The full project, tests, benchmark, and evaluation materials are in this folder. A separate extension-only ZIP is in **release** for later store submission; it is not a published store app.

This is an experimental release. It has not established benefit for people with tremor. Read **docs/VALIDATION.md** for exactly what passed and what still needs checking on your Mac.
