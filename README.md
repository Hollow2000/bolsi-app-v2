# Bolsi App

Control financiero personal **mobile-first**. Organiza tu dinero en bolsillos, controla gastos, ingresos, tarjetas de crédito, pagos recurrentes, presupuestos y ahorros. Interfaz en español, funciona como **PWA instalable** y guarda todos los datos localmente en el navegador (IndexedDB).

> Sitio desplegado: <https://hollow2000.github.io/bolsi-app-v2/>

---

## Características

- **Dashboard**: balance del mes, proyección de fin de mes, desglose de deuda y widgets (estado de bolsillos, pagos urgentes, estado de tarjetas de crédito).
- **Bolsillos**: reparto del ingreso en porcentajes, con barra de progreso y manejo de balance negativo.
- **Gastos**: categoría, bolsillo, método de pago, gastos ocultos, gastos sin bolsillo con confirmación, plantillas, y validación de saldo disponible.
- **Ingresos**: registro mensual/quincenal con **replicación automática entre meses**.
- **Tarjetas de crédito**: día de corte y de pago, **períodos de statement**, cierre de período, pagos que se registran como gasto "Pago de tarjeta", alertas "Vence hoy/mañana", planes MSI (meses sin intereses).
- **Pagos recurrentes**: renta, servicios, etc. con frecuencia `monthly` | `biweekly` | `weekly` y replicación automática mes a mes.
- **Presupuestos**: por categoría/bolsillo/mes, con replicación entre meses.
- **Ahorros**: cuentas con saldo separado del balance general, depósitos/retiros/rendimientos y **ahorros programados**.
- **Transferencias** entre métodos de pago.
- **Reembolsos**: restan de cargos y de deuda facturable.
- **Catálogo dinámico** de categorías de gastos/ingresos (con iconos).
- **Historial** de movimientos.
- **Respaldo y restauración** en JSON (exporta todas las tablas).
- **Onboarding** inicial y **PWA** con actualizaciones automáticas.

## Stack técnico

- **Angular 21** — componentes standalone, señales (`signals`), `changeDetection: OnPush`, detección de cambios *zoneless* y `strict: true`.
- **TypeScript 5.9**
- **Dexie** (IndexedDB) v4.4.4 — persistencia local.
- **RxJS 7**
- **PWA** con `@angular/service-worker`.
- **SCSS** con sistema de diseño propio (ver [`design.md`](design.md)).
- **Vitest** para pruebas unitarias.
- Iconos: Google **Material Symbols**.

## Arquitectura

```
src/app/
├── core/
│   ├── database/     # Esquema Dexie (BolsiDB, versión 11)
│   ├── guards/       # Guardas de onboarding
│   ├── models/       # Modelos tipados
│   ├── services/     # Lógica de negocio
│   └── validations/
├── features/         # Módulos por dominio (lazy-loaded)
└── shared/           # Componentes, pipes y servicios reutilizables
```

- **Lazy loading** por feature route y `HashLocationStrategy` (URLs tipo `#/...`).
- Servicios con `providedIn: 'root'` e `inject()`.
- Componentes pequeños con `input()`/`output()` por función y `computed()` para estado derivado.

## Modelo de datos (Dexie — `BolsiDB`)

| Tabla | Uso |
|---|---|
| `paymentMethods` | Cuentas/tarjetas (débito, crédito, efectivo) |
| `expenses` | Gastos (mes, categoría, bolsillo, método, MSI, ocultos) |
| `incomes` | Ingresos |
| `installmentPlans` | Planes a meses sin intereses |
| `pockets` | Bolsillos (porcentajes) |
| `monthlyPayments` | Pagos recurrentes |
| `budgets` | Presupuestos |
| `expenseTemplates` | Plantillas de gastos |
| `transfers` | Transferencias entre métodos |
| `appSettings` | Settings (single row) |
| `savingsAccounts` | Cuentas de ahorro |
| `savingsTransactions` | Depósitos/retiros/rendimientos de ahorro |
| `catalogs` | Catálogo dinámico de categorías |
| `savingsExecutions` | Ejecuciones de ahorro programado |
| `refunds` | Reembolsos |

## Primeros pasos

```bash
npm install
npm start        # ng serve --host 0.0.0.0  → http://localhost:4200/
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo |
| `npm run build` | Build de desarrollo (regenera `src/environments/version.ts`) |
| `npx ng build` | Verificación rápida de compilación |
| `npm test` | Pruebas unitarias con Vitest |
| `npm run bump` | Bump de versión patch + tag git |
| `npm run bump:minor` | Bump minor |
| `npm run deploy` | Bump + build prod (`--base-href /bolsi-app-v2/`) + publish a GitHub Pages |

## Deploy

El deploy se publica en **GitHub Pages** en `https://hollow2000.github.io/bolsi-app-v2/` usando `angular-cli-ghpages` (`npx ngh`). El comando `npm run deploy` bumpa la versión, construye en producción y publica.

## Diseño

La paleta de colores, tokens, tipografía y componentes base están documentados en [`design.md`](design.md).