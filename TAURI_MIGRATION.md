# CJ Board Tauri Direction

## Current Stage

CJ Board now has a Tauri v2 desktop shell under `src-tauri/`.

The shell keeps the current working architecture:

- React/Vite frontend
- Local Node API server at `http://127.0.0.1:4173`
- JSON data files in `data/`
- PowerShell reminder watcher
- Terminal Codex assistant bridge

When the Tauri app starts, it launches `scripts/start-studyboard.ps1` in the background, waits for port `4173`, and opens CJ Board in a native desktop window.

## Why This Stage

This avoids a risky rewrite. Task persistence, notes, reminders, and the Assistant already work, so the first Tauri step only replaces the browser surface with a desktop window.

## Commands

```powershell
npm run setup-tauri
npm run setup-desktop
npm run setup-cjboard
npm run desktop:tauri
npm run tauri info
npm run tauri:dev
npm run tauri:build
scripts\tauri-build.cmd
```

`setup-tauri` installs Rust and Microsoft Build Tools prerequisites. Run it from an Administrator PowerShell if Build Tools installation fails.

`desktop:tauri` starts the existing CJ Board local service and then launches the Tauri desktop window.

`setup-desktop` and `setup-cjboard` create desktop and startup shortcuts for the Tauri app. The current shortcuts point directly to:

```text
D:\agent-projects\learning-kanban\src-tauri\target\release\cj-board.exe
```

Shortcut locations:

- Desktop: `C:\Users\Novak\OneDrive\Desktop\CJ Board.lnk`
- Startup: `C:\Users\Novak\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\CJ Board.lnk`

## Required Windows Dependencies

Current machine status:

- WebView2: installed
- Rust: installed under `D:\tools\rust`
- Cargo: installed under `D:\tools\rust\cargo`
- npm cache: `D:\tools\npm-cache`
- Tauri build output: `D:\agent-projects\learning-kanban\src-tauri\target`
- MSVC Build Tools: currently usable from `C:\BuildTools`
- Windows SDK: installed under the Windows shared SDK location

The old `C:\Users\Novak\.cargo` and `C:\Users\Novak\.rustup` folders were moved to:

- `D:\tools\rust\migrated-from-c-users-Novak\cargo-old`
- `D:\tools\rust\migrated-from-c-users-Novak\rustup-old`

MSVC was not fully moved to D because protected files under `C:\BuildTools` denied a normal move. The build scripts prefer `D:\BuildTools` if a valid install exists, then fall back to `C:\BuildTools`.

Install or repair prerequisites:

Recommended command:

```powershell
cd D:\agent-projects\learning-kanban
npm run setup-tauri
```

If the command cannot install Build Tools because of permissions, open PowerShell as Administrator and run it again. Microsoft Visual Studio and Windows SDK may still keep shared installer or SDK components on C by design.

## Productization Roadmap

1. Desktop shell
   - Keep Node server and reminder watcher.
   - Open CJ Board in a standalone Tauri window.

2. Service packaging
   - Bundle the server as a sidecar or replace it with Rust commands.
   - Move hard-coded `D:\agent-projects\learning-kanban` into packaged app data paths.

3. Data layer cleanup
   - Move from JSON files to SQLite if the data model grows.
   - Keep export/import for backups.

4. Native integration
   - Add tray menu.
   - Add native notification controls.
   - Add startup toggle inside Settings.

5. Installer
   - Build signed Windows installer.
   - Keep data under the user's app data directory.
