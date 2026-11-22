# ADR 0005 — Sistema de UI: tokens CSS y primitivas accesibles

## Estado

Aceptada (T7, 2026-11-20)

## Contexto

La aplicación de escritorio necesita una interfaz con apariencia terminada,
bilingüe, priorizada para el teclado y verificada con WCAG, sin adoptar un framework
de componentes que la haga parecer una plantilla. La dirección de diseño D9 fija
colores exactos, umbrales de contraste, tipografía, espaciado, movimiento y valores
de layout. Esos valores son contratos, no sugerencias: el plan pide una prueba que
los analice y falle cuando un par caiga por debajo de su ratio WCAG documentado.

## Decisión

- **Tokens en propiedades personalizadas de CSS.** `src/ui/design/tokens.css` es la
  única fuente para color, tipografía, espaciado, radios, elevación, movimiento y
  z-index. El tema claro es `:root`; el oscuro explícito es
  `:root[data-theme="dark"]`; la preferencia del sistema es un bloque
  `prefers-color-scheme: dark` restringido a `:root:not([data-theme])`.
  `theme.ts` establece `data-theme` solo para claro u oscuro explícitos, así que el
  sistema operativo controla "Sistema".
- **Las fuentes se incluyen en el propio proyecto (vendored).** `npm run fonts:sync`
  copia los subconjuntos latinos variables en woff2 y los textos OFL desde
  Fontsource 5.3.0 hacia `src/ui/design/fonts/`. No se hace ninguna solicitud de red
  para una fuente (S1).
- **CSS Modules para los estilos de componentes.** Sin Tailwind, sin CSS-in-JS en
  tiempo de ejecución y sin un sistema de diseño duplicado. Una declaración
  `*.module.css` mantiene las clases tipadas.
- **Primitivas de Radix para los comportamientos de accesibilidad complejos** (trampa
  de foco y retorno de foco en Dialog, foco roving en Tabs, Tooltip, ToggleGroup,
  Switch, Slider), con estilos propios. `lucide-react` aporta íconos con una sola
  importación nombrada.
- **i18n tipado, no i18next.** `en.ts` es la fuente de verdad `as const`; `es.ts` se
  tipa con la misma forma. Una prueba de paridad falla ante claves faltantes,
  cadenas vacías o `{params}` que no coinciden. `Intl.PluralRules` impulsa `tp`.
- **Las pruebas son contratos.** `tokens.contrast.test.ts` analiza el CSS y recalcula
  cada ratio de D9; las pruebas de primitivas cubren el comportamiento de teclado;
  axe se ejecuta sobre el shell y la galería en ambos temas.

## Consecuencias

- Un cambio de token es un cambio probado, y un ratio que falla identifica el par.
- La aplicación incluye tres archivos woff2 (~125 KB) y no depende de la red para
  las fuentes.
- Los componentes nuevos deben reutilizar primitivas; agregar un modal o un toggle
  propio es un defecto de revisión.
- La ruta de la galería (`#/design`) solo se compila fuera de producción, para que el
  bundle de producción no tenga un punto de entrada exclusivo de diseño.
- La paleta de D9 no definía un color de texto para el relleno de acento. Agregamos
  `--color-on-accent` (`#15171C` en ambos temas) porque la puerta de contraste debe
  cubrir el texto colocado sobre el acento; D9 solo registró el ratio del tema claro
  (10.91).

## Alternativas

- **Tailwind + shadcn/ui:** descartado en D8 (aspecto de plantilla, capa extra de
  build, y los valores de los tokens vivirían en la configuración en lugar de en el
  CSS vinculante).
- **CSS-in-JS:** descartado (costo en tiempo de ejecución, dependencia adicional y
  sin análisis estático para el contrato de contraste).
- **i18next:** descartado en D11; la app necesita dos diccionarios estáticos, no un
  ecosistema de plugins.
