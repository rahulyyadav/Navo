# Navo offline route-reference proof of concept

No dependency installation, login, service or internet required:

```sh
python3 prototypes/offline-route-pack/prepare.py
python3 -m unittest discover -s prototypes/offline-route-pack -p 'test_*.py'
```

Open `phulchowki-pack.html` directly from your file manager. Disconnect internet, close the browser and reopen the saved file to perform the outstanding manual offline check. Keep the HTML file; its content does not depend on this repository or a running server. Phone local-HTML support must be verified on each platform.

This is **a route schematic and modelled profile, not offline maps or navigation**. It contains 269 public OSRM coordinates, 69 DEM-derived samples and provenance from Terrain Lab. No external font/script/image/tile is requested; CSP blocks resource connections. Raw data and input SHA256 digests are included in the expandable source section. The file is 46,974 bytes for the current input. No private account information is included.

The generator reports four preparation stages, validates input, atomically publishes a complete file and retains a previous file on validation/write failure. Retry by rerunning; remove the output file normally to clean it up. A hard process kill can leave a `.partial` file; it is never read as a completed pack and can be removed after confirming no generator is active. There is no network download queue, tile region, resumable tile transfer, live location or background GPS.

Python tests disable socket creation and verify generation/readback, incomplete profile rejection and interrupted replacement cleanup. Browser tooling disallows `file:` URLs, so visual file-open and physical airplane-mode tests are explicitly outstanding. See the Phase 4 audit reports for a native region architecture and test gates.
