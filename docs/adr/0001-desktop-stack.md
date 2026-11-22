# ADR 0001: Shell de escritorio con Tauri 2, UI en TypeScript y pipeline de datos en Python

## Estado

Aceptada

## Contexto

Ecuador Indicators debe distribuirse como una aplicación de escritorio pulida e
instalable en Linux, Windows y macOS, manteniéndose local-first, capaz de
funcionar sin conexión y sin cuentas, claves ni servicios de pago obligatorios.
El propietario tiene más fortaleza en Python y quiere que el trabajo de ingeniería
de datos sea visible, pero el producto también necesita un toolkit de UI moderno,
gráficos accesibles, interacción priorizando el teclado, pruebas de componentes,
pruebas end-to-end en navegador e instaladores pequeños y confiables.

El repositorio debe demostrar una arquitectura deliberada entre runtimes: capas
hexagonales, fronteras tipadas, trabajo guiado por pruebas y CI/CD en tres
sistemas operativos.

## Decisión

Usar Tauri 2 como shell de escritorio con un frontend de React 19 + TypeScript +
Vite. Mantener Rust deliberadamente delgado (integración con el sistema operativo,
SQLite, exportación, feed de actualizaciones) y poner toda la lógica de dominio
visible para el usuario en un núcleo TypeScript puro. Mantener la adquisición de
datos, la normalización y la construcción de la instantánea en un paquete Python
separado (`ecuador-data`), cuya salida es un artefacto SQLite versionado que se
incluye como recurso de Tauri. No incrustar Python en el runtime de escritorio.

Las versiones se fijan mediante lockfiles y se mantienen dentro de sus líneas
mayores. Política de respaldo: si una versión planificada no puede instalarse en
un runner compatible, quédate en la misma línea mayor, elige el parche compatible
más reciente y registra la desviación en el Log del plan. Nunca cambies a una
versión mayor preliminar (por ejemplo, Tauri 3 alpha) para desbloquear una tarea.

## Consecuencias

- La app usa el webview del sistema operativo en lugar de incluir un runtime de
  navegador, lo que mantiene pequeño el instalador, pero el renderizado depende
  del webview de cada plataforma.
- TypeScript y Rust agregan dos toolchains al CI; la matriz de tres sistemas
  operativos y los paquetes Linux de Tauri son obligatorios.
- El pipeline de Python es una dependencia solo de build: puede probarse y
  reproducirse de forma independiente y nunca se incluye en el binario de
  escritorio.
- El valor de esta elección (tamaño del instalador, tiempo de arranque) debe
  medirse con artefactos reales de release antes de afirmarlo en el README o en
  este ADR.

## Alternativas

- **PySide6**: el mejor encaje de lenguaje para el propietario, pero los gráficos,
  el tematizado y el pulido requieren mucho trabajo a medida; los instaladores son
  grandes y lentos de construir en tres sistemas operativos, y las herramientas de
  E2E y de componentes son más débiles.
- **Flet**: valores por defecto agradables, pero un ecosistema joven y un trabajo
  más difícil en gráficos personalizados y accesibilidad.
- **Electron**: maduro, pero incluye un Chromium completo por aplicación, lo
  opuesto a la sensación nativa y ligera que busca este proyecto.
- **Tauri + sidecar de PyInstaller**: duplica el trabajo de empaquetado y firma en
  cada plataforma sin mejorar la experiencia del usuario.
