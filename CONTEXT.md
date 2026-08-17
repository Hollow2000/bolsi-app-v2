# CONTEXTO DE BOLSI APP — Memoria para Agente IA

> Este archivo resume el contexto de la aplicación, los últimos cambios solicitados por el usuario y el punto exacto donde quedó el trabajo. Léelo completo antes de continuar cualquier tarea.

---

## 1. Resumen de la aplicación

- **Proyecto**: Bolsi App (aplicación personal de finanzas "Bolsi").
- **Stack**: Angular 21 (standalone components, signals, `strict: true`), TypeScript 5.9, Dexie (IndexedDB) v4.4.4, PWA (Service Worker + `@angular/service-worker`), RxJS 7.
- **Routing**: `HashLocationStrategy` (URLs tipo `#/...`).
- **Deploy**: GitHub Pages en `https://<usuario>.github.io/bolsi-app-v2/` vía `npx ngh`.
- **Versión actual**: `0.2.5` (git tag/commit `67fcd01`, último bump).
- **UI**: Español. Nombres de variables/código en inglés. Estilos SCSS. Iconos Material Symbols (`material-symbols-outlined`).
- **Patrón**: componentes standalone con `changeDetection: ChangeDetectionStrategy.OnPush`, `input()`/`output()` por función, `computed()` para estado derivado, servicios con `providedIn: 'root'` e `inject()`.
- **Convención**: NO agregar comentarios al código salvo que se pidan. Mantener componentes pequeños. Formularios reactivos.

### Reglas del negocio relevantes
- El dinero se reparte en **bolsillos** (% del ingreso del mes).
- **Tarjetas de crédito**: tienen `statementClosingDay` (día de corte) y `statementPaymentDay` (día de pago). El sistema tiene cortes automáticos (`CreditCardStatementService`) y un flujo de pago manual en `credit-card-detail`.
- **Ahorros**: cuentas con saldo separado (excluidas del balance general), depósitos/retiros/rendimientos, y **ahorros programados** (scheduled savings).
- **Presupuestos**: por categoría/bolsillo/mes.
- **Pagos recurrentes** (antes "pagos mensuales"): renta, servicios, etc. con frecuencia `monthly` | `biweekly` | `weekly`.
- **Gastos**: tienen `applicationDate` (fecha de aplicación, usada para cortes de tarjeta) y `hidden?`.
- **Reembolsos**: modelo `Refund`, restan de cargos y de deuda facturable.

---

## 2. Base de datos Dexie — esquema actual (versión 11)

Tablas (en `src/app/core/database/bolsi.database.ts`):

| Tabla | Uso |
|---|---|
| `paymentMethods` | Cuentas/tarjetas (débito, crédito, efectivo, ahorro?). Campos `type`, `currentBalance`, `creditLimit`, `availableCredit`, `statementClosingDay`, `statementPaymentDay` |
| `expenses` | Gastos (`month`, `year`, `category`, `pocketId`, `paymentMethodId`, `isInstallment`, `hidden?`, `applicationDate?`) |
| `incomes` | Ingresos |
| `installmentPlans` | Planes a meses sin intereses |
| `pockets` | Bolsillos (porcentajes) |
| `monthlyPayments` | Pagos recurrentes (`dueDate`, `month`, `year`, `isRecurring`, `frequency`, `paid`, `amountPaid`, `pocketId?`, `expenseCategory?`) |
| `budgets` | Presupuestos (`month`, `year`, `category`, `pocketId`, `estimatedAmount`) |
| `expenseTemplates` | Plantillas de gastos |
| `transfers` | Transferencias entre métodos |
| `appSettings` | Settings (single row) |
| `savingsAccounts` | Cuentas de ahorro |
| `savingsTransactions` | Depósitos/retiros/rendimientos de ahorro |
| `catalogs` | Catálogo dinámico de categorías de gastos/ingresos |
| `savingsExecutions` | Ejecuciones de ahorro programado |
| `refunds` | Reembolsos |

---

## 3. Estado de git (momento de escribir este archivo)

```
67fcd01 chore: bump version to v0.2.5          <- HEAD (último commit)
86df961 feat: create reusable CategorySelectorComponent and migrate all forms
90b103d chore: bump version to v0.2.4
506e7a0 feat: Se agrega boton para omitir ahorros programados
fb0c227 chore: bump version to v0.2.3
...
```

- Working tree: SOLO `src/environments/version.ts` modificado (APP_VERSION regenerado `0.2.4` → `0.2.5` durante un build; no es un cambio funcional). Todo lo demás está commiteado.
- Rama: `master`, 1 commit local sin push (el bump a v0.2.5).

---

## 4. Últimos cambios implementados (ya commiteados)

Estos son los cambios que el usuario pidió en la ronda más reciente y ya están hechos:

1. **`CategorySelectorComponent` reutilizable** (commit `86df961`):
   - Creado en `src/app/shared/components/category-selector/category-selector.component.ts`.
   - Permite elegir categoría desde el catálogo dinámico (con iconos) en vez de listas hardcodeadas.
   - Migrados a usarlo: `edit-income-modal`, `budget-form-modal`, `expense-form-modal`, `template-form-modal`, `monthly-payment-form-modal`.
   - Resuelve: categorías nuevas como "Cashback" no aparecían en los dropdowns de los formularios.

2. **Botón para omitir ahorros programados** y **omitir rendimiento definitivamente** (commits `506e7a0`, `1f64169`) — cambios hechos por el usuario/cambio menor.

3. **List-item layout optimizado** (commits `2ccec21`, `4c7f4f2`, `d941c1e`, `8e01613`): el monto alineado a la derecha con `flex-shrink:0`, título/subtítulo con ellipsis, sin divisores, mejor scroll.

---

## 5. PLAN PENDIENTE — cambios solicitados por el usuario (NO implementados todavía)

El usuario aprobó un plan por etapas para corregir una lista de problemas. **Solo se completó la etapa del CategorySelector.** El resto está pendiente. Detalles:

### FASE A — Replicación automática mes a mes (prioridad alta) — ✅ COMPLETADA
Contexto del bug: al cambiar de mes, los pagos recurrentes no se replican solos y los presupuestos no persisten. Además los pagos creados para meses futuros "desaparecen".

1. **`MonthService`** (`src/app/core/services/month.service.ts`) — ✅ creado:
   - `autoReplicateIfNeeded()`: al iniciar la app, si el mes actual no está en `replicatedMonths`, replica pagos recurrentes y presupuestos del mes anterior al actual, y marca el mes como replicado.
   - Rastrea meses replicados en `AppSettings.replicatedMonths`.
   - Conectado en `app.ts` `ngOnInit` (después de `catalogService.initialize()`).
2. **Pagos de meses futuros** — ✅ implementado:
   - `MonthlyPaymentService.getByMonth()` ahora devuelve también pagos cuyo `dueDate` cae en el mes consultado (aunque su `month`/`year` de creación sea otro). Así un pago creado con vencimiento futuro se ve en su mes de vencimiento y en el de creación.
   - `markAsPaid()` registra el gasto en el mes real del `dueDate` (no el de creación).
3. **Presupuestos mes a mes** — ✅ `BudgetService.replicateBudgets()` agregado (copia presupuestos del mes origen al destino; no duplica si ya existen para la misma categoría+bolsillo).
4. **Botón "Cerrar mes" de Ajustes** — ✅ eliminado (HTML + método `closeMonth()` + inyección `MonthlyPaymentService`).
   - `saveUserName()` ahora preserva todos los campos de settings (`...record`).

### FASE B — Tarjetas de crédito — ✅ COMPLETADA
5. **Monto a pagar desaparecía al cambiar de mes** — ✅ corregido:
   - `CreditCardStatementService.getAmountToPay()` tenía `if (today.getDate() < closingDay) return 0;`, lo que ocultaba el saldo pendiente cuando el mes cambiaba (parecía "dado por pagado"). Se eliminó esa guardia; ahora solo depende de `statementBalance > 0` y de los pagos del período.
   - `BalanceService.sumBillableDebt()` tenía la misma guardia de fecha; ahora usa `statementBalance > 0` sin importar la fecha.
6. **Pago de tarjeta como gasto con categoría especial** — ✅ implementado:
   - Nueva constante `CARD_PAYMENT_CATEGORY = 'Pago de tarjeta'` en `catalog.service.ts`.
   - Al registrar un pago de tarjeta en `credit-card-detail.onSavePayment`, además de la transferencia se crea un gasto con categoría `Pago de tarjeta`, bolsillo 0 (sin bolsillo), `icon: 'credit_card'`, y `skipBalanceEffect: true` para no descontar dos veces (la transferencia ya descuenta).
   - `ExpenseService.create(expense, { skipBalanceEffect?: boolean })` nuevo parámetro opcional que omite la deducción de balance y la validación de crédito disponible.
   - `assertPocketExists` ahora permite `pocketId === 0` (gasto sin bolsillo).
7. **Validar saldo del método de origen** — ✅ implementado en `onSavePayment`: si el monto excede el saldo disponible (currentBalance o availableCredit según tipo), muestra error "Saldo insuficiente" y no registra el pago.

### FASE C — Gastos y listas
8. **Gasto de retiro de ahorro como oculto**: marcar el gasto generado por un retiro de ahorro como `hidden: true`.
9. **Toggle de gastos ocultos** en pantalla de Gastos + ocultar/mostrar manualmente cada gasto.
10. **Editar gasto**: solo validar saldo del bolsillo si cambia el monto (deducir/devolver la diferencia).
11. **Crear/editar gasto sin bolsillo**: mostrar advertencia/confirmación.
12. **Scroll en gastos recientes** de débito/efectivo en el detalle.
13. **Límites de caracteres**: nombre 50, descripciones 100 (en formularios).

### FASE D — Ahorros
14. **Ordenar transacciones de ahorro por fecha descendente** + scroll en la lista (`savings-detail`).
15. **NO tocar el sistema de ahorros programados** (el usuario lo hizo explícito).

### FASE E — Dashboard / UI
16. **Bolsillo con balance negativo**: no llenar la barra de progreso y mostrar el número en rojo (`pocket-summary-widget`).
17. **Ingresos y Pagos**: items con título+monto arriba y detalles debajo (una línea por item, igual que gastos).
18. **Layout de listas**: verificar consistencia con el `list-item` optimizado.

---

## 6. DÓNDE ME QUEDÉ / ESTADO ACTUAL

### Estructura de ramas (importante)
- **`master`** — contiene Fase A commiteada (`a013088`, commit `feat: replicación automática mensual de pagos recurrentes y presupuestos`): `month.service.ts` (nuevo), `app-settings.model.ts` (`replicatedMonths`), `budget.service.ts` (`replicateBudgets`), `monthly-payment.service.ts` (`getByMonth` con dueDate, `markAsPaid` en mes real), `app.ts` (hookup MonthService), `settings.component.ts|html` (eliminado "Cierre de mes"), `CONTEXT.md`.
- **`feature/credit-cards`** — rama de trabajo para TODO el tema de tarjetas de crédito. Contiene:
  - `d8e9ce9` — Fase B: `credit-card-statement.service.ts` (guardia de fecha eliminada en `getAmountToPay`), `balance.service.ts` (`sumBillableDebt` sin guardia de fecha), `catalog.service.ts` (`CARD_PAYMENT_CATEGORY`), `expense.service.ts` (`skipBalanceEffect`, `assertPocketExists` permite 0), `credit-card-detail.component.ts` (pago como gasto "Pago de tarjeta" sin bolsillo + validación de saldo).
  - `a9be038` — Fix match estable de pagos: `getStatementPeriod()` nuevo en `credit-card-statement.service.ts` (usa `lastCutoffMonth/Year`, estable a través del cambio de mes); `getAmountToPay()` y `BalanceService.sumBillableDebt()` matchean contra `getStatementPeriod()`; `TransferService.create()` y `credit-card-detail.onSavePayment()` etiquetan pagos con el período del statement; `payment-methods-list.component.ts` muestra "A pagar" **neto** (statementBalance − pagos del período) cargando transfers.
  - Build verificado OK (`npx ng build`). `version.ts` queda modificado sin commitear (autogenerado por el build).

### Bug reportado por el usuario (zombies) y diagnóstico
- El usuario registró pagos de cortes pendientes como **gastos provisionales de débito** (Sep 1/3), por lo que nunca tocaron el `statementBalance` de las tarjetas. Sus intentos de reconciliación (borrar gastos + pagar, o abonar saldo + pagar) no se reflejaban porque el match de pagos usaba `getCutoffPeriod(closingDay, hoy)` (cambiaba al cruzar el día de corte/mes), así que los pagos "se perdían" y la deuda volvía al `statementBalance` completo. El fix (commit `a9be038`) resuelve esto con el período estable.
- **Pendiente de verificar por el usuario**: recrear el caso NU / Mercado Pago y confirmar que al pagar el neto, "A pagar" → $0 y la deuda exigible se descuenta.

**Próximo paso (FASE C)**: correcciones de Gastos y listas (ver sección 5, FASE C):
1. Gasto de retiro de ahorro como `hidden: true`.
2. Toggle de gastos ocultos en pantalla de Gastos + ocultar/mostrar manualmente.
3. Editar gasto: validar saldo del bolsillo solo si cambia el monto.
4. Crear/editar gasto sin bolsillo con advertencia/confirmación.
5. Scroll en gastos recientes de débito/efectivo del detalle.
6. Límites de caracteres (nombre 50, descripciones 100).
7. **NO desplegar** (el usuario quiere probar antes). Además, al terminar Fase C considerar merge de `feature/credit-cards` a master.

**IMPORTANTE — No desplegar sin aprobación explícita del usuario.** El usuario dijo: *"no realices el deploy, quiero probarlo antes"*. Comando de deploy (NO ejecutar todavía): `npm run deploy`.

### Nota de verificación (aprendida en la sesión)
Antes de asumir que algo existe, VERIFICA en el repo: en resúmenes previos se asumió que `MonthService`, `replicateBudgets` y `replicatedMonths` ya existían, pero **NO existen** (grep da 0 resultados). El estado real está descrito arriba en las secciones 4-6.

---

## 7. Comandos útiles

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo (`ng serve --host 0.0.0.0`) |
| `npm run build` | Build de desarrollo (regenera `version.ts`) |
| `npx ng build` | Build (verificación rápida de compilación) |
| `npm run bump` | Bump de versión patch + tag git |
| `npm run bump:minor` | Bump minor |
| `npm run deploy` | Bump + build prod (`--base-href /bolsi-app-v2/`) + `npx ngh` (NO usar sin permiso) |

## 8. Rutas de archivos clave

- `src/app/app.ts` — bootstrap, cortes de tarjeta automáticos, update PWA.
- `src/app/core/database/bolsi.database.ts` — esquema Dexie.
- `src/app/core/services/monthly-payment.service.ts` — pagos recurrentes (`create`, `getByMonth`, `markAsPaid`, `replicateRecurring`). `getByMonth` incluye pagos por dueDate; `markAsPaid` registra gasto en mes real.
- `src/app/core/services/month.service.ts` — replicación automática mensual (`autoReplicateIfNeeded`) — NUEVO.
- `src/app/core/services/budget.service.ts` — presupuestos (`getByMonth`, `replicateBudgets`, `getProgressForMonth`).
- `src/app/core/services/credit-card-statement.service.ts` — cortes, `getStatementPeriod()` (período estable del statement), `amountToPay`, `getAvailableCredit`.
- `src/app/core/services/expense.service.ts` — gastos; `create(expense, { skipBalanceEffect? })`, `assertPocketExists` permite bolsillo 0.
- `src/app/core/services/catalog.service.ts` — catálogo dinámico + `CARD_PAYMENT_CATEGORY`.
- `src/app/core/models/app-settings.model.ts` — modelo de settings (ya incluye `replicatedMonths`).
- `src/app/features/settings/settings.component.ts|html` — "Cierre de mes" eliminado.
- `src/app/shared/components/category-selector/category-selector.component.ts` — selector reutilizable (ya creado).
- `src/app/features/expenses/expenses-list.component.ts|html` — lista de gastos (candidata para toggle de ocultos).
- `src/app/features/credit-cards/credit-card-detail.component.ts|html` — detalle tarjeta, pago manual (gasto "Pago de tarjeta" sin bolsillo + validación de saldo + billingPeriod estable).
- `src/app/features/credit-cards/payment-methods-list.component.ts|html` — listado de métodos; "A pagar" neto (statementBalance − pagos del período).
- `src/app/core/services/transfer.service.ts` — transfers; `create()` etiqueta pagos de tarjeta con el período estable del statement.
- `src/app/core/services/balance.service.ts` — `sumBillableDebt` sin guardia de fecha, matchea pagos contra `getStatementPeriod()`.
- `src/app/features/savings/savings-detail.component.*` — transacciones de ahorro.
- `src/app/features/dashboard/widgets/pocket-summary-widget.component.*` — barra de bolsillos (negativos).
- `scripts/bump-version.js`, `scripts/generate-version.js` — versionado.
