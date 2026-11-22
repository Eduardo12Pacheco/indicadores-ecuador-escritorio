# Installation guide

Ecuador Indicators ships as an unsigned desktop application for Windows, macOS
and Linux. The installers are built on native GitHub Actions runners, installed
on a clean runner and smoke-tested with `ecuador-indicators --self-check` before
the release is published. This page explains how to install each build and how
to verify that the file you downloaded is the one the project published.

- [Download](#download)
- [Verify the download](#verify-the-download)
- [Windows](#windows)
- [macOS](#macos)
- [Linux](#linux)
- [What the application writes](#what-the-application-writes)
- [Uninstall](#uninstall)
- [Privacy and limitations](#privacy-and-limitations)

## Download

Open the [latest release](https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio/releases/latest)
and pick the file that matches your operating system. Asset names follow
`ecuador-indicators_<version>_<platform>_<arch>.<ext>`.

| Operating system | Architecture | Recommended file | Alternative |
|---|---|---|---|
| Windows 10/11 | x64 | `ecuador-indicators_0.1.0_windows_x64.exe` (NSIS) | `ecuador-indicators_0.1.0_windows_x64.msi` |
| macOS 11 or newer | Apple Silicon (arm64) | `ecuador-indicators_0.1.0_macos_arm64.dmg` | — |
| macOS 11 or newer | Intel (x64) | `ecuador-indicators_0.1.0_macos_x64.dmg` | — |
| Linux | x64 | `ecuador-indicators_0.1.0_linux_x64.deb` (Debian/Ubuntu) | `ecuador-indicators_0.1.0_linux_x64.rpm`, `ecuador-indicators_0.1.0_linux_x64.AppImage` |

Every release also publishes `SHA256SUMS.txt`. The build is not code-signed
and not notarized; the operating system will warn you. The warnings are
expected and are explained per platform below.

## Verify the download

Verify the checksum before running an installer. Download `SHA256SUMS.txt`
from the same release next to the installer.

Linux and macOS:

```bash
sha256sum -c SHA256SUMS.txt          # Linux
shasum -a 256 -c SHA256SUMS.txt      # macOS
```

Windows PowerShell:

```powershell
Get-FileHash .\ecuador-indicators_0.1.0_windows_x64.exe -Algorithm SHA256
# Compare the printed hash with the line for that file in SHA256SUMS.txt
```

GitHub also records build provenance for every asset. With the GitHub CLI
installed and authenticated:

```bash
gh attestation verify ecuador-indicators_0.1.0_linux_x64.deb \
  --repo Eduardo12Pacheco/indicadores-ecuador-escritorio
```

The same command works for the `.exe`, `.msi` and `.dmg` files. A successful
verification proves the file was produced by this repository's release
workflow; it does not replace the checksum, and it does not make an unsigned
build trusted by the operating system.

## Windows

### NSIS installer (recommended)

1. Run `ecuador-indicators_0.1.0_windows_x64.exe`.
2. Windows SmartScreen shows "Windows protected your PC". Choose **More info**
   and then **Run anyway**.
3. The NSIS package installs per user by default, so it does not need
   administrator rights. It creates Start Menu and desktop shortcuts and an
   uninstaller in Windows Settings → Apps.

Windows 11 **Smart App Control** may block the unsigned executable outright,
with no per-app override. Smart App Control can only be turned off globally in
Windows Security → App & browser control → Smart App Control. Only do that if
you understand the trade-off; otherwise use a machine where Smart App Control
is already off.

### MSI installer

The MSI is provided for managed environments. Run it from the release folder;
administrators can deploy it with the usual `msiexec /i` options. The MSI does
not include a download of WebView2 beyond the configured bootstrapper, so an
offline machine must already have the WebView2 Runtime installed.

### WebView2

Ecuador Indicators uses the Microsoft Edge WebView2 Runtime that ships with
current Windows 10 and Windows 11 installations. If it is missing, the
bundled bootstrapper downloads it during installation, which needs a network
connection once. After installation the application itself is fully offline.

## macOS

1. Open `ecuador-indicators_0.1.0_macos_arm64.dmg` (Apple Silicon) or
   `ecuador-indicators_0.1.0_macos_x64.dmg` (Intel).
2. Drag **Ecuador Indicators** to `/Applications`.
3. The build is ad-hoc signed, not notarized. Gatekeeper therefore warns that
   the developer cannot be verified. Open **System Settings → Privacy &
   Security**, scroll to the security section and choose **Open Anyway** for
   Ecuador Indicators. Apple documents this path in
   [Open a Mac app from an unidentified developer](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac).
4. Launch the app again. Apple Silicon macOS requires at least an ad-hoc
   signature; this build provides one, but the approval step is still needed
   because the app is not notarized.

As an advanced last resort, if you trust the downloaded file and the checksum
matches, you can remove the quarantine attribute:

```bash
xattr -dr com.apple.quarantine "/Applications/Ecuador Indicators.app"
```

Prefer the **Open Anyway** flow; disabling Gatekeeper globally or stripping
quarantine from untrusted files reduces the protection of your machine.

## Linux

### Debian / Ubuntu (`.deb`)

```bash
sudo apt install ./ecuador-indicators_0.1.0_linux_x64.deb
ecuador-indicators
```

### Fedora / RHEL (`.rpm`)

```bash
sudo dnf install ./ecuador-indicators_0.1.0_linux_x64.rpm
ecuador-indicators
```

### AppImage (any distribution)

```bash
chmod +x ecuador-indicators_0.1.0_linux_x64.AppImage
./ecuador-indicators_0.1.0_linux_x64.AppImage
```

The AppImage needs FUSE. If FUSE is not available, extract and run it in one
step:

```bash
./ecuador-indicators_0.1.0_linux_x64.AppImage --appimage-extract-and-run
```

The desktop entry is installed by the `.deb` and `.rpm` packages; the AppImage
can be integrated manually with your desktop environment. The Linux build needs
WebKitGTK 4.1, which current Debian/Ubuntu and Fedora releases provide.

## What the application writes

The application is local-first and has no server, account or telemetry.

| Data | Linux | macOS | Windows |
|---|---|---|---|
| Saved views and settings (`user.db`) | `$XDG_DATA_HOME/io.github.eduardo12pacheco.ecuadorindicators` (default `~/.local/share/...`) | `~/Library/Application Support/io.github.eduardo12pacheco.ecuadorindicators` | `%APPDATA%\io.github.eduardo12pacheco.ecuadorindicators` |
| Rolling log files | `$XDG_DATA_HOME/io.github.eduardo12pacheco.ecuadorindicators` | `~/Library/Logs/io.github.eduardo12pacheco.ecuadorindicators` | `%LOCALAPPDATA%\io.github.eduardo12pacheco.ecuadorindicators` |

The bundled World Bank snapshot is opened read-only and is never modified. A
custom snapshot chosen in Settings is also opened read-only and can be reset to
the bundled one at any time. The environment variables
`ECUADOR_INDICATORS_HOME`, `ECUADOR_INDICATORS_LOG` and
`ECUADOR_INDICATORS_SNAPSHOT` override those locations for portable or
diagnostic setups.

## Uninstall

- **Windows:** Settings → Apps → Ecuador Indicators → Uninstall. The NSIS
  uninstaller removes the application; delete `%APPDATA%` and `%LOCALAPPDATA%`
  folders listed above to remove saved views, settings and logs.
- **macOS:** quit the app, drag **Ecuador Indicators** from `/Applications` to
  the Trash, then remove the Application Support and Logs folders listed above
  if you also want to delete your data.
- **Linux:** `sudo apt remove ecuador-indicators` or
  `sudo dnf remove ecuador-indicators`; remove the AppImage file if you used it.
  Delete `$XDG_DATA_HOME/io.github.eduardo12pacheco.ecuadorindicators` to remove
  saved views, settings and logs.

## Privacy and limitations

The app reads a bundled World Bank WDI snapshot licensed under CC BY 4.0 and
republishes it; it is not an official statistics product and does not replace
BCE or INEC publications. Data is annual with the reporting lags documented in
[`DATA.md`](DATA.md). The only optional network path is the notify-only update
check, which is **off by default** and, when enabled, contacts the GitHub
releases API at most once every 24 hours. Export files are written only where
you choose in the native save dialog. See [`SECURITY.md`](../SECURITY.md) for
the full privacy and threat-model summary.
