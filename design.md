# design.md — Bolsi App Design System

## Philosophy

**Minimalist and functional.** The interface does not compete with the data — it serves it. A single primary color (Seagull), neutral grays for everything else. No decorative gradients, no heavy shadows, no multiple accent colors. What must stand out is the number, not the component.

---

## Color Palette

### Primary — Seagull

```scss
$seagull-50:  #eff9ff;
$seagull-100: #dff4ff;
$seagull-200: #b8eaff;
$seagull-300: #78dbff;
$seagull-400: #4dd2ff;  // hover states
$seagull-500: #06b5f1;  // main interactive
$seagull-600: #0093ce;  // primary buttons
$seagull-700: #0075a7;  // active / pressed buttons
$seagull-800: #02628a;  // text on light background
$seagull-900: #085172;  // strong emphasis
$seagull-950: #06334b;  // dark headers
```

### Neutrals — Zinc

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

### Semantic Colors

```scss
$color-success: #16a34a;  // positive balance, paid
$color-warning: #d97706;  // near limit (80%+)
$color-danger:  #dc2626;  // deficit, overdue, over limit
$color-info:    $seagull-600;
```

---

## CSS Custom Properties — Implementation

Define in `:root` for light mode and override in `@media (prefers-color-scheme: dark)`.
All components use **only** these custom properties — never hardcoded color values.

```scss
:root {
  // Backgrounds
  --background-primary:     #{$gray-50};
  --background-secondary:   #{$gray-100};
  --background-elevated:    #ffffff;
  --background-overlay:     rgba(0, 0, 0, 0.4);

  // Card and modal surfaces
  --surface:                #ffffff;
  --surface-alternate:      #{$gray-100};

  // Borders
  --border-default:         #{$gray-200};
  --border-focus:           #{$seagull-500};

  // Text
  --text-primary:           #{$gray-900};
  --text-secondary:         #{$gray-500};
  --text-disabled:          #{$gray-400};
  --text-inverse:           #ffffff;
  --text-on-primary:        #ffffff;

  // Primary interactive
  --color-primary:          #{$seagull-600};
  --color-primary-hover:    #{$seagull-700};
  --color-primary-subtle:   #{$seagull-50};
  --color-primary-muted:    #{$seagull-100};

  // Semantic
  --color-success:          #{$color-success};
  --color-success-subtle:   #dcfce7;
  --color-warning:          #{$color-warning};
  --color-warning-subtle:   #fef3c7;
  --color-danger:           #{$color-danger};
  --color-danger-subtle:    #fee2e2;

  // Navigation
  --navigation-height:      64px;
  --navigation-background:  #ffffff;
  --navigation-border:      #{$gray-200};

  // Border radius
  --radius-small:           6px;
  --radius-medium:          10px;
  --radius-large:           16px;
  --radius-extra-large:     24px;
  --radius-full:            9999px;

  // Shadows
  --shadow-small:           0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-medium:          0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-large:           0 8px 24px rgba(0, 0, 0, 0.10);

  // Spacing scale — 4px base
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;

  // Typography scale
  --text-size-extra-small:  11px;
  --text-size-small:        13px;
  --text-size-base:         15px;
  --text-size-medium:       17px;
  --text-size-large:        20px;
  --text-size-extra-large:  24px;
  --text-size-display:      32px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background-primary:     #{$gray-950};
    --background-secondary:   #{$gray-900};
    --background-elevated:    #{$gray-900};

    --surface:                #{$gray-800};
    --surface-alternate:      #{$gray-900};

    --border-default:         #{$gray-700};
    --border-focus:           #{$seagull-400};

    --text-primary:           #{$gray-50};
    --text-secondary:         #{$gray-400};
    --text-disabled:          #{$gray-600};

    --color-primary:          #{$seagull-500};
    --color-primary-hover:    #{$seagull-400};
    --color-primary-subtle:   rgba(6, 181, 241, 0.12);
    --color-primary-muted:    rgba(6, 181, 241, 0.18);

    --color-success-subtle:   rgba(22, 163, 74, 0.15);
    --color-warning-subtle:   rgba(217, 119, 6, 0.15);
    --color-danger-subtle:    rgba(220, 38, 38, 0.15);

    --navigation-background:  #{$gray-900};
    --navigation-border:      #{$gray-800};

    --shadow-small:           0 1px 2px rgba(0, 0, 0, 0.30);
    --shadow-medium:          0 4px 12px rgba(0, 0, 0, 0.40);
    --shadow-large:           0 8px 24px rgba(0, 0, 0, 0.50);
  }
}
```

---

## Typography

Use the system font stack for zero loading cost:

```scss
--font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-family-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;
// mono is reserved for large monetary display amounts only
```

### Type Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-size-extra-small` | 11px | 400 | Form labels, metadata, badges |
| `--text-size-small`       | 13px | 400 | Secondary text, card subtitles |
| `--text-size-base`        | 15px | 400 | Body text, list items |
| `--text-size-medium`      | 17px | 500 | Section titles, card names |
| `--text-size-large`       | 20px | 600 | Screen titles |
| `--text-size-extra-large` | 24px | 700 | Highlighted amounts in cards |
| `--text-size-display`     | 32px | 700 | Main balance on dashboard |

Monetary amounts shown at display size must use `--font-family-mono` for digit alignment.

---

## Icon Library — Google Material Symbols

Import via CDN in `index.html` (outlined style, no fill):

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
/>
```

Usage in Angular templates:

```html
<span class="material-symbols-outlined icon">wallet</span>
<span class="material-symbols-outlined icon">credit_card</span>
```

```scss
.icon {
  font-size: 22px;
  line-height: 1;
  user-select: none;
  vertical-align: middle;
  // Always inherit color from parent — never hardcode icon color
}
.icon--small  { font-size: 18px; }
.icon--large  { font-size: 28px; }
```

### Icon Map — Use These Exact Names

| Context | Icon name |
|---------|-----------|
| Dashboard | `home` |
| Expenses | `shopping_cart` |
| Income | `trending_up` |
| Credit cards | `credit_card` |
| Monthly payments | `calendar_month` |
| Pockets (bolsillos) | `wallet` |
| Settings | `settings` |
| Add | `add` |
| Add circle (FAB) | `add_circle` |
| Edit | `edit` |
| Delete | `delete` |
| Close | `close` |
| Paid / confirmed | `check_circle` |
| Pending | `schedule` |
| Overdue / warning | `warning` |
| Installments (MSI) | `payments` |
| Balance | `account_balance` |
| Export / backup | `download` |
| Import / restore | `upload` |
| History | `history` |
| Chevron right | `chevron_right` |
| Expand / collapse | `expand_more` |
| Received income | `arrow_downward` |
| Expense outflow | `arrow_upward` |

---

## Base Components

### Primary Button

```scss
.button-primary {
  background: var(--color-primary);
  color: var(--text-on-primary);
  border: none;
  border-radius: var(--radius-medium);
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-size-base);
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  transition: background 0.15s ease;
  min-height: 44px;

  &:hover   { background: var(--color-primary-hover); }
  &:active  { transform: scale(0.98); }
  &:disabled {
    background: var(--text-disabled);
    cursor: not-allowed;
    pointer-events: none;
  }
}
```

### Secondary Button (outline)

```scss
.button-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-medium);
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-size-base);
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
}
```

### Destructive Button

```scss
.button-destructive {
  background: var(--color-danger);
  color: #ffffff;
  // same structure as button-primary
}
```

### Ghost Button (icon actions in lists)

```scss
.button-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: var(--space-2);
  border-radius: var(--radius-small);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;

  &:hover { background: var(--surface-alternate); }
}
```

### Card

```scss
.card {
  background: var(--surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-large);
  padding: var(--space-4);
  box-shadow: var(--shadow-small);
}

.card--interactive {
  cursor: pointer;
  transition: box-shadow 0.15s ease;
  &:hover { box-shadow: var(--shadow-medium); }
}
```

### Form Field

```scss
// Every input must be paired with a visible label — never use placeholder alone
.form-label {
  display: block;
  font-size: var(--text-size-small);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.form-input {
  width: 100%;
  background: var(--background-primary);
  border: 1.5px solid var(--border-default);
  border-radius: var(--radius-medium);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-size-base);
  color: var(--text-primary);
  transition: border-color 0.15s ease;
  min-height: 44px;

  &:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-subtle);
  }

  &::placeholder { color: var(--text-disabled); }
}

.form-error {
  font-size: var(--text-size-extra-small);
  color: var(--color-danger);
  margin-top: var(--space-1);
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-4);
}
```

### Status Badge

```scss
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-size-extra-small);
  font-weight: 600;

  &--success { background: var(--color-success-subtle); color: var(--color-success); }
  &--warning { background: var(--color-warning-subtle); color: var(--color-warning); }
  &--danger  { background: var(--color-danger-subtle);  color: var(--color-danger);  }
  &--neutral { background: var(--surface-alternate);    color: var(--text-secondary); }
  &--primary { background: var(--color-primary-muted);  color: var(--color-primary); }
}
```

### Progress Bar

```scss
.progress-bar {
  height: 6px;
  background: var(--surface-alternate);
  border-radius: var(--radius-full);
  overflow: hidden;

  &__fill {
    height: 100%;
    border-radius: var(--radius-full);
    background: var(--color-primary);
    transition: width 0.3s ease;

    &--warning { background: var(--color-warning); } // pocket usage > 80%
    &--danger  { background: var(--color-danger);  } // pocket usage > 100%
  }
}
```

### List Item (transactions)

```scss
.list-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-default);

  &:last-child { border-bottom: none; }

  &__icon {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-medium);
    background: var(--surface-alternate);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  &__content  { flex: 1; min-width: 0; }

  &__title {
    font-size: var(--text-size-base);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__subtitle {
    font-size: var(--text-size-small);
    color: var(--text-secondary);
  }

  &__amount {
    font-size: var(--text-size-base);
    font-weight: 600;
    white-space: nowrap;

    &--expense { color: var(--text-primary); }
    &--income  { color: var(--color-success); }
  }
}
```

### Toast / Snackbar

```scss
.toast {
  position: fixed;
  bottom: calc(var(--navigation-height) + var(--space-4));
  left: 50%;
  transform: translateX(-50%);
  background: #{$gray-900};         // always dark regardless of color scheme
  color: #ffffff;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-full);
  font-size: var(--text-size-small);
  font-weight: 500;
  z-index: 9999;
  box-shadow: var(--shadow-large);
  white-space: nowrap;
  pointer-events: none;
}
```

---

## Navigation

### Bottom Navigation Bar

```scss
.bottom-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--navigation-height);             // 64px
  background: var(--navigation-background);
  border-top: 1px solid var(--navigation-border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);  // iOS notch support
}

.navigation-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--text-size-extra-small);
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-medium);
  transition: color 0.15s ease;
  min-width: 48px;
  text-decoration: none;

  &--active { color: var(--color-primary); }
}
```

Navigation items in order: Dashboard · Expenses · Cards · Payments · Settings

### Floating Action Button

```scss
.floating-action-button {
  position: fixed;
  bottom: calc(var(--navigation-height) + var(--space-4));  // 64 + 16 = 80px
  right: var(--space-4);
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--text-on-primary);
  border: none;
  box-shadow: var(--shadow-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 90;
  transition: background 0.15s ease, transform 0.15s ease;

  &:active { transform: scale(0.94); }
  &:hover  { background: var(--color-primary-hover); }
}
```

---

## Screen Layout

```scss
.screen {
  min-height: 100dvh;                              // dvh handles mobile browser chrome
  background: var(--background-primary);
  padding-bottom: var(--navigation-height);        // always leave room for bottom navigation
}

.screen-header {
  padding: var(--space-4) var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--border-default);
  background: var(--background-elevated);
  position: sticky;
  top: 0;
  z-index: 10;

  h1 {
    font-size: var(--text-size-large);
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
  background: var(--background-overlay);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.modal-sheet {
  width: 100%;
  background: var(--surface);
  border-radius: var(--radius-extra-large) var(--radius-extra-large) 0 0;
  padding: var(--space-4) var(--space-4)
           calc(var(--space-4) + env(safe-area-inset-bottom));
  max-height: 92dvh;
  overflow-y: auto;
}

.modal-handle {
  width: 36px;
  height: 4px;
  background: var(--border-default);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-4);
}

.modal-title {
  font-size: var(--text-size-medium);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}
```

---

## Onboarding Wizard Step Indicator

```scss
.wizard-step-indicator {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  margin-bottom: var(--space-6);
}

.step-dot {
  height: 8px;
  width: 8px;
  border-radius: var(--radius-full);
  background: var(--border-default);
  transition: all 0.2s ease;

  &--active   { background: var(--color-primary); width: 20px; }
  &--complete { background: var(--color-primary); opacity: 0.45; }
}
```

---

## Accessibility Rules

- Every form field must have a visible `<label>` linked via `for`/`id`. Never rely on `placeholder` alone.
- Icon-only buttons must include `aria-label` with descriptive text.
- Text contrast must meet WCAG AA (minimum 4.5:1 ratio for normal text).
- Minimum tap target size: 44×44px for any interactive element.
- Form errors must be linked to the field with `aria-describedby`.
- Focus states must be clearly visible in both light and dark mode.

---

## Forbidden Patterns

- Do not use more than one accent color per screen beyond the primary Seagull palette.
- Do not use neon colors, multi-color gradients, or colored drop shadows.
- Do not change the full screen background to communicate a state.
- Do not hardcode any color value in a component — always use CSS custom properties.
- Do not use abbreviations in CSS class names. Write the full word: `button` not `btn`, `navigation` not `nav`, `image` not `img`.

---

## Quick Reference — Most Used Tokens

```
--background-primary    screen background
--surface               card and modal background
--border-default        divider lines
--text-primary          main readable text
--text-secondary        supporting / muted text
--color-primary         buttons, links, active states
--color-danger          errors, deficit, overdue
--color-success         paid, positive balance
--color-warning         approaching limit
--navigation-height     64px — always add as padding-bottom to screen
```
