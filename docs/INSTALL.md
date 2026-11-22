# Guía de instalación

Ecuador Indicators se distribuye como una aplicación de escritorio sin firma para
Windows, macOS y Linux. Los instaladores se construyen en runners nativos de GitHub
Actions, se instalan en un runner limpio y se prueban con
`ecuador-indicators --self-check` antes de publicar la release. Esta página explica
cómo instalar cada build y cómo verificar que el archivo descargado es el que publicó
el proyecto.

- [Descarga](#descarga)
- [Verificar la descarga](#verificar-la-descarga)
- [Windows](#windows)
- [macOS](#macos)
- [Linux](#linux)
- [Qué escribe la aplicación](#qué-escribe-la-aplicación)
- [Desinstalar](#desinstalar)
- [Privacidad y limitaciones](#privacidad-y-limitaciones)

## Descarga

Abre la [última release](https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio/releases/latest)
y elige el archivo que corresponda a tu sistema operativo. Los nombres de los assets
siguen el patrón `ecuador-indicators_<version>_<platform>_<arch>.<ext>`.

| Sistema operativo | Arquitectura | Archivo recomendado | Alternativa |
|---|---|---|---|
| Windows 10/11 | x64 | `ecuador-indicators_0.1.0_windows_x64.exe` (NSIS) | `ecuador-indicators_0.1.0_windows_x64.msi` |
| macOS 11 o posterior | Apple Silicon (arm64) | `ecuador-indicators_0.1.0_macos_arm64.dmg` | — |
| macOS 11 o posterior | Intel (x64) | `ecuador-indicators_0.1.0_macos_x64.dmg` | — |
| Linux | x64 | `ecuador-indicators_0.1.0_linux_x64.deb` (Debian/Ubuntu) | `ecuador-indicators_0.1.0_linux_x64.rpm`, `ecuador-indicators_0.1.0_linux_x64.AppImage` |

Cada release también publica `SHA256SUMS.txt`. El build no está firmado con código ni
notarizado; el sistema operativo mostrará una advertencia. Esas advertencias son
esperadas y se explican por plataforma más abajo.

## Verificar la descarga

Verifica el checksum antes de ejecutar un instalador. Descarga `SHA256SUMS.txt` desde la
misma release, junto al instalador.

Linux y macOS:

```bash
sha256sum -c SHA256SUMS.txt          # Linux
shasum -a 256 -c SHA256SUMS.txt      # macOS
```

Windows PowerShell:

```powershell
Get-FileHash .\ecuador-indicators_0.1.0_windows_x64.exe -Algorithm SHA256
# Compare the printed hash with the line for that file in SHA256SUMS.txt
```

GitHub también registra la procedencia del build de cada asset. Con la GitHub CLI
instalada y autenticada:

```bash
gh attestation verify ecuador-indicators_0.1.0_linux_x64.deb \
  --repo Eduardo12Pacheco/indicadores-ecuador-escritorio
```

El mismo comando funciona para los archivos `.exe`, `.msi` y `.dmg`. Una verificación
exitosa demuestra que el archivo fue producido por el workflow de release de este
repositorio; no reemplaza el checksum y no hace que el sistema operativo confíe en un
build sin firma.

## Windows

### Instalador NSIS (recomendado)

1. Ejecuta `ecuador-indicators_0.1.0_windows_x64.exe`.
2. Windows SmartScreen muestra "Windows protegió su PC". Elige **Más información** y
   luego **Ejecutar de todas formas**.
3. El paquete NSIS se instala por usuario de forma predeterminada, así que no necesita
   derechos de administrador. Crea accesos directos en el menú Inicio y en el escritorio,
   además de un desinstalador en Configuración de Windows → Aplicaciones.

Windows 11 **Smart App Control** puede bloquear por completo el ejecutable sin firma, sin
excepción por aplicación. Smart App Control solo puede desactivarse de forma global en
Seguridad de Windows → Control de aplicaciones y del navegador → Smart App Control.
Hazlo solo si entiendes la compensación; de lo contrario, usa un equipo donde Smart App
Control ya esté desactivado.

### Instalador MSI

El MSI está pensado para entornos administrados. Ejecútalo desde la carpeta de la release;
las personas administradoras pueden desplegarlo con las opciones habituales de
`msiexec /i`. El MSI no incluye una descarga de WebView2 más allá del bootstrapper
configurado, así que un equipo sin conexión debe tener ya instalado el WebView2 Runtime.

### WebView2

Ecuador Indicators usa Microsoft Edge WebView2 Runtime, que incluyen las instalaciones
actuales de Windows 10 y Windows 11. Si falta, el bootstrapper incluido lo descarga durante
la instalación, lo que requiere una conexión de red una sola vez. Después de la instalación,
la aplicación funciona completamente sin conexión.

## macOS

1. Abre `ecuador-indicators_0.1.0_macos_arm64.dmg` (Apple Silicon) o
   `ecuador-indicators_0.1.0_macos_x64.dmg` (Intel).
2. Arrastra **Ecuador Indicators** a `/Applications`.
3. El build tiene firma ad-hoc, no está notarizado. Por eso Gatekeeper advierte que no se
   puede verificar al desarrollador. Abre **Ajustes del Sistema → Privacidad y seguridad**,
   desplázate a la sección de seguridad y elige **Open Anyway** para Ecuador Indicators.
   Apple documenta esta ruta en
   [Abrir una app de Mac de un desarrollador no identificado](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac).
4. Vuelve a abrir la app. macOS en Apple Silicon requiere al menos una firma ad-hoc; este
   build la incluye, pero el paso de aprobación sigue siendo necesario porque la app no está
   notarizada.

Como último recurso avanzado, si confías en el archivo descargado y el checksum coincide,
puedes quitar el atributo de cuarentena:

```bash
xattr -dr com.apple.quarantine "/Applications/Ecuador Indicators.app"
```

Prefiere el flujo **Open Anyway**; desactivar Gatekeeper de forma global o quitar la
cuarentena a archivos no confiables reduce la protección de tu equipo.

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

### AppImage (cualquier distribución)

```bash
chmod +x ecuador-indicators_0.1.0_linux_x64.AppImage
./ecuador-indicators_0.1.0_linux_x64.AppImage
```

El AppImage necesita FUSE. Si FUSE no está disponible, extrae y ejecútalo en un solo paso:

```bash
./ecuador-indicators_0.1.0_linux_x64.AppImage --appimage-extract-and-run
```

La entrada de escritorio la instalan los paquetes `.deb` y `.rpm`; el AppImage puede
integrarse manualmente con tu entorno de escritorio. El build de Linux necesita
WebKitGTK 4.1, que proveen las versiones actuales de Debian/Ubuntu y Fedora.

## Qué escribe la aplicación

La aplicación es local-first y no tiene servidor, cuenta ni telemetría.

| Datos | Linux | macOS | Windows |
|---|---|---|---|
| Vistas guardadas y ajustes (`user.db`) | `$XDG_DATA_HOME/io.github.eduardo12pacheco.ecuadorindicators` (por defecto `~/.local/share/...`) | `~/Library/Application Support/io.github.eduardo12pacheco.ecuadorindicators` | `%APPDATA%\io.github.eduardo12pacheco.ecuadorindicators` |
| Archivos de log rotativos | `$XDG_DATA_HOME/io.github.eduardo12pacheco.ecuadorindicators` | `~/Library/Logs/io.github.eduardo12pacheco.ecuadorindicators` | `%LOCALAPPDATA%\io.github.eduardo12pacheco.ecuadorindicators` |

La instantánea del Banco Mundial incluida se abre en modo solo lectura y nunca se modifica.
Una instantánea personalizada elegida en Ajustes también se abre en modo solo lectura y
puede restablecerse a la incluida en cualquier momento. Las variables de entorno
`ECUADOR_INDICATORS_HOME`, `ECUADOR_INDICATORS_LOG` y `ECUADOR_INDICATORS_SNAPSHOT`
sustituyen esas ubicaciones para configuraciones portátiles o de diagnóstico.

## Desinstalar

- **Windows:** Configuración → Aplicaciones → Ecuador Indicators → Desinstalar. El
  desinstalador NSIS elimina la aplicación; borra las carpetas `%APPDATA%` y
  `%LOCALAPPDATA%` indicadas arriba para eliminar vistas guardadas, ajustes y logs.
- **macOS:** cierra la app, arrastra **Ecuador Indicators** desde `/Applications` a la
  Papelera y, si también quieres borrar tus datos, elimina las carpetas Application Support
  y Logs indicadas arriba.
- **Linux:** `sudo apt remove ecuador-indicators` o `sudo dnf remove ecuador-indicators`;
  elimina el archivo AppImage si lo usaste. Borra
  `$XDG_DATA_HOME/io.github.eduardo12pacheco.ecuadorindicators` para eliminar vistas
  guardadas, ajustes y logs.

## Privacidad y limitaciones

La app lee una instantánea incluida de WDI del Banco Mundial bajo licencia CC BY 4.0 y la
vuelve a publicar; no es un producto oficial de estadísticas y no reemplaza las
publicaciones del BCE ni del INEC. Los datos son anuales, con los rezagos de reporte
documentados en [`DATA.md`](DATA.md). La única ruta de red opcional es la comprobación de
actualizaciones solo de notificación, que está **desactivada por defecto** y, cuando se
activa, consulta la API de releases de GitHub como máximo una vez cada 24 horas. Los
archivos de exportación se escriben solo en la ubicación que elijas en el diálogo nativo de
guardado. Consulta [`SECURITY.md`](../SECURITY.md) para el resumen completo de privacidad y
modelo de amenazas.
