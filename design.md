# design.md — Sistema de Diseño · Bolsi App

## Filosofía

Diseño **minimalista y funcional**. La interfaz no compite con los datos, los sirve. Paleta de un solo color primario (Seagull), grises neutros para el resto. Sin gradientes decorativos, sin sombras exageradas, sin colores de acento múltiples. Lo que debe destacar es el número, no el componente.

---

## Paleta de colores

### Primario — Seagull

```scss
$seagull-50:  #eff9ff;
$seagull-100: #dff4ff;
$seagull-200: #b8eaff;
$seagull-300: #78dbff;
$seagull-400: #4dd2ff;  // hover states
$seagull-500: #06b5f1;  // interactivo principal
$seagull-600: #0093ce;  // botones primarios
$seagull-700: #0075a7;  // botones activos / pressed
$seagull-800: #02628a;  // texto sobre fondo claro
$seagull-900: #085172;  // énfasis fuerte
$seagull-950: #06334b;  // headers oscuros
```

### Neutros — Gray (zinc)

```scss
$gray-50:  #fafafa;
$gray-100: #f4f4f5;
$gray-200: #e4e4e7;
$gray-300: #d4d4d8;
$gray-400: #a1a1aa;
$gray-500: #71717a;
$gray-600: #52525b;
$gray-700: #3f3f46;
$gray-800: #27272a;
$gray-900: #18181b;
$gray-950: #09090b;
```

### Semánticos

```scss
$color-success:  #16a34a;  // verde — saldo positivo, pagado
$color-warning:  #d97706;  // ámbar — cerca del límite (80%+)
$color-danger:   #dc2626;  // rojo — déficit, vencido, límite superado
$color-info:     $seagull-600;
```

---

## Variables CSS — Implementación

Definir en `:root` para modo claro y sobreescribir en `@media (prefers-color-scheme: dark)`. Todos los componentes usan **exclusivamente** estas variables, nunca valores hardcodeados.

```scss
:root {
  // Fondos
  --bg-primary:    #{$gray-50};
  --bg-secondary:  #{$gray-100};
  --bg-elevated:   #ffffff;
  --bg-overlay:    rgba(0, 0, 0, 0.4);

  // Superficies de cards y modales
  --surface:       #ffffff;
  --surface-alt:   #{$gray-100};

  // Bordes
  --border:        #{$gray-200};
  --border-focus:  #{$seagull-500};

  // Texto
  --text-primary:  #{$gray-900};
  --text-secondary:#{$gray-500};
  --text-disabled: #{$gray-400};
  --text-inverse:  #ffffff;
  --text-on-primary: #ffffff;

  // Primario interactivo
  --color-primary:        #{$seagull-600};
  --color-primary-hover:  #{$seagull-700};
  --color-primary-subtle: #{$seagull-50};
  --color-primary-muted:  #{$seagull-100};

  // Semánticos
  --color-success:        #{$color-success};
  --color-success-subtle: #dcfce7;
  --color-warning:        #{$color-warning};
  --color-warning-subtle: #fef3c7;
  --color-danger:         #{$color-danger};
  --color-danger-subtle:  #fee2e2;

  // Navegación
  --nav-height:    64px;
  --nav-bg:        #ffffff;
  --nav-border:    #{$gray-200};

  // Radios
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-full:9999px;

  // Sombras
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.10);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary:    #{$gray-950};
    --bg-secondary:  #{$gray-900};
    --bg-elevated:   #{$gray-900};

    --surface:       #{$gray-800};
    --surface-alt:   #{$gray-900};

    --border:        #{$gray-700};
    --border-focus:  #{$seagull-400};

    --text-primary:  #{$gray-50};
    --text-secondary:#{$gray-400};
    --text-disabled: #{$gray-600};

    --color-primary:        #{$seagull-500};
    --color-primary-hover:  #{$seagull-400};
    --color-primary-subtle: rgba(6, 181, 241, 0.12);
    --color-primary-muted:  rgba(6, 181, 241, 0.18);

    --color-success-subtle: rgba(22, 163, 74, 0.15);
    --color-warning-subtle: rgba(217, 119, 6, 0.15);
    --color-danger-subtle:  rgba(220, 38, 38, 0.15);

    --nav-bg:     #{$gray-900};
    --nav-border: #{$gray-800};

    --shadow-sm:  0 1px 2px rgba(0,0,0,0.3);
    --shadow-md:  0 4px 12px rgba(0,0,0,0.4);
    --shadow-lg:  0 8px 24px rgba(0,0,0,0.5);
  }
}
```

---

## Tipografía

Usar la fuente del sistema (`system-ui`) para máxima velocidad de carga sin dependencias externas.

```scss
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono:   'SF Mono', 'Fira Code', 'Consolas', monospace; // solo para montos grandes
```

### Escala tipográfica

| Token | Tamaño | Peso | Uso |
|-------|--------|------|-----|
| `--text-xs`  | 11px | 400 | Labels de formulario, metadata |
| `--text-sm`  | 13px | 400 | Texto secundario, subtítulos de card |
| `--text-base`| 15px | 400 | Texto de cuerpo, listas |
| `--text-md`  | 17px | 500 | Títulos de sección, nombres de tarjeta |
| `--text-lg`  | 20px | 600 | Títulos de pantalla |
| `--text-xl`  | 24px | 700 | Montos destacados en cards |
| `--text-2xl` | 32px | 700 | Balance principal del dashboard |

### Montos de dinero

Los montos relevantes (balance, saldo disponible, totales) deben usar `--font-mono` para alineación visual y `--text-xl` o `--text-2xl`. Los montos en listas usan `--font-family` normal.

---

## Espaciado

Sistema de 4px base:

```scss
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
```

Padding interior de pantallas: `--space-4` (16px) en móvil, `--space-6` (24px) en tablet+.

---

## Componentes base

### Botón primario
```scss
.btn-primary {
  background: var(--color-primary);
  color: var(--text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover  { background: var(--color-primary-hover); }
  &:active { transform: scale(0.98); }
  &:disabled { background: var(--text-disabled); cursor: not-allowed; }
}
```

### Botón secundario (outline)
```scss
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-base);
  font-weight: 500;
}
```

### Botón destructivo
```scss
.btn-danger {
  background: var(--color-danger);
  color: #ffffff;
  // misma estructura que btn-primary
}
```

### Botón fantasma (ghost) — para acciones secundarias en listas
```scss
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  &:hover { background: var(--surface-alt); }
}
```

### Card
```scss
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}
```

### Input
```scss
.input-field {
  width: 100%;
  background: var(--bg-primary);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  color: var(--text-primary);
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-subtle);
  }

  &::placeholder { color: var(--text-disabled); }
}

.input-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

// Siempre incluir label visible — nunca solo placeholder
```

### Badge / Chip de estado
```scss
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;

  &--success { background: var(--color-success-subtle); color: var(--color-success); }
  &--warning { background: var(--color-warning-subtle); color: var(--color-warning); }
  &--danger  { background: var(--color-danger-subtle);  color: var(--color-danger);  }
  &--neutral { background: var(--surface-alt);          color: var(--text-secondary); }
  &--primary { background: var(--color-primary-muted);  color: var(--color-primary); }
}
```

### Barra de progreso (bolsillos)
```scss
.progress-bar {
  height: 6px;
  background: var(--surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;

  &__fill {
    height: 100%;
    border-radius: var(--radius-full);
    background: var(--color-primary);
    transition: width 0.3s ease;

    &--warning { background: var(--color-warning); }
    &--danger  { background: var(--color-danger); }
  }
}
// warning cuando > 80%, danger cuando > 100%
```

### Fila de lista (movimientos)
```scss
.list-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--surface-alt);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  &__content { flex: 1; min-width: 0; }
  &__title   { font-size: var(--text-base); font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  &__sub     { font-size: var(--text-sm); color: var(--text-secondary); }

  &__amount  {
    font-size: var(--text-base);
    font-weight: 600;
    white-space: nowrap;
    &--egreso  { color: var(--text-primary); }
    &--ingreso { color: var(--color-success); }
  }
}
```

### Toast / Snackbar
```scss
.toast {
  position: fixed;
  bottom: calc(var(--nav-height) + var(--space-4));
  left: 50%;
  transform: translateX(-50%);
  background: var(--gray-900);     // siempre oscuro en ambos modos
  color: #ffffff;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
  z-index: 9999;
  box-shadow: var(--shadow-lg);
  white-space: nowrap;
}
```

---

## Navegación (Bottom Nav)

```scss
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);         // 64px
  background: var(--nav-bg);
  border-top: 1px solid var(--nav-border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom); // soporte notch iOS
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color 0.15s ease;
  min-width: 48px;                   // tap target mínimo

  svg { width: 22px; height: 22px; }

  &--active {
    color: var(--color-primary);
  }
}
```

**Ítems del nav:** Dashboard · Gastos · Tarjetas · Pagos · Ajustes

---

## FAB (Floating Action Button)

```scss
.fab {
  position: fixed;
  bottom: calc(var(--nav-height) + var(--space-4));  // 64px + 16px = 80px
  right: var(--space-4);
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--text-on-primary);
  border: none;
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 90;
  transition: background 0.15s ease, transform 0.15s ease;

  svg { width: 24px; height: 24px; }

  &:active { transform: scale(0.94); }
  &:hover  { background: var(--color-primary-hover); }
}
```

---

## Layout general de pantalla

```scss
.screen {
  min-height: 100dvh;                        // dvh para mobile browsers
  background: var(--bg-primary);
  padding-bottom: var(--nav-height);         // espacio para el bottom nav
}

.screen-header {
  padding: var(--space-4) var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);

  h1 {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
}

.screen-content {
  padding: var(--space-4);
}
```

---

## Modal / Bottom Sheet

```scss
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  z-index: 200;
  display: flex;
  align-items: flex-end;             // bottom sheet en móvil
}

.modal-sheet {
  width: 100%;
  background: var(--surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-4) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
  max-height: 92dvh;
  overflow-y: auto;
}

.modal-handle {
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-4);
}

.modal-title {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}
```

---

## Wizard de Onboarding

```scss
.wizard-step-indicator {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  margin-bottom: var(--space-6);

  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--border);
    transition: all 0.2s ease;

    &--active   { background: var(--color-primary); width: 20px; }
    &--complete { background: var(--color-primary); opacity: 0.5; }
  }
}
```

---

## Accesibilidad

- Todo campo de formulario debe tener un `<label>` visible asociado con `for` / `id`. Nunca depender solo del `placeholder`.
- Los botones de ícono deben tener `aria-label` descriptivo.
- El contraste de texto sobre fondo debe cumplir WCAG AA (ratio mínimo 4.5:1 para texto normal).
- Tamaño mínimo de área táctil: 44×44px.
- Los errores de formulario deben estar vinculados al campo con `aria-describedby`.

---

## Reglas de uso del color — Lo que NO hacer

- ❌ No usar más de un color de acento por pantalla además del primario (Seagull)
- ❌ No usar colores neón, gradientes multicolor ni sombras de color
- ❌ No cambiar el color de fondo de toda la pantalla para indicar un estado
- ❌ No hardcodear colores en los componentes — siempre usar variables CSS
- ❌ No usar colores distintos de `--color-success`, `--color-warning`, `--color-danger` para estados semánticos

---

## Tokens de referencia rápida

```scss
// Los más usados en el día a día
var(--bg-primary)        // fondo de pantalla
var(--surface)           // fondo de card / modal
var(--border)            // líneas divisorias
var(--text-primary)      // texto principal
var(--text-secondary)    // texto de apoyo
var(--color-primary)     // botones, links, activos
var(--color-danger)      // errores, déficit, vencidos
var(--color-success)     // pagado, saldo positivo
var(--nav-height)        // 64px — usar en padding-bottom
```
