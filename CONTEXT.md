# CONTEXTO DE BOLSI APP — Memoria para Agente IA

> Este archivo resume el contexto de la aplicación, los últimos cambios solicitados por el usuario y el punto exacto donde quedó el trabajo. Léelo completo antes de continuar cualquier tarea.

---

## 1. Resumen de la aplicación

- **Proyecto**: Bolsi App (aplicación personal de finanzas "Bolsi").
- **Stack**: Angular 21 (standalone components, signals, `strict: true`), TypeScript 5.9, Dexie (IndexedDB) v4.4.4, PWA (Service Worker + `@angular/service-worker`), RxJS 7.
- **Routing**: `HashLocationStrategy` (URLs tipo `#/...`).
- **Deploy**: GitHub Pages en `https://<usuario>.github.io/bolsi-app-v2/` vía `npx ngh`.
- **Versión actual**: `0.2.9` (git tag/commit `15fe5e9`, último bump).
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
25. **Fecha de pago de tarjeta se actualizaba al cambiar de mes** (bug reportado por el usuario) — ✅ corregido: `CreditCardStatementService.getPaymentDueDate()` calculaba la fecha desde el **mes de calendario actual** (`new Date(today.getFullYear(), today.getMonth(), closingDay)`), así que al pasar de agosto a septiembre la fecha saltaba de 1/9 a 1/10 aunque el statement no hubiera cambiado. **Fix**: la fecha se ancla al **período del statement** (`getStatementPeriod` = `lastCutoffMonth/Year`, estable) y solo avanza al período siguiente cuando (a) el statement está **pagado completo** (`statementBalance > 0` y `getAmountToPay <= 0`), o (b) se **procesa el corte**. Pago parcial o nulo → se mantiene. Fecha = `closingDay` del mes anterior al período + `creditDays` (con salto de feriados si `skipHolidays`). Nuevo helper privado `nextPeriod()`. Firma actualizada: `getPaymentDueDate(card, transfers: readonly Transfer[] = [])`; call-sites actualizados (`dashboard.buildCreditCardEntries` y `credit-card-detail.paymentDueDate`/`openPay` pasan sus transfers). Efecto colateral: la alerta "Vence hoy" del widget persiste hasta pagar o corte. Tests nuevos en `credit-card-statement.service.spec.ts` (5: estabilidad, pago completo, pago parcial, corte, cruce de año). `npm test` → **109 tests pasan**.

### FASE C — Gastos y listas — ✅ COMPLETADA (rama `feature/fase-c-gastos`)
8. **Gasto de retiro de ahorro como oculto** — ✅ implementado: `savings.service.ts withdraw()` marca el gasto de retiro con `hidden: true`; el depósito queda visible. **Corrección**: antes los movimientos de depósito/retiro solo se registraban como gasto si la cuenta de ahorro tenía bolsillo; ahora **siempre** se registran con `pocketId: account.pocketId ?? 0` (sin bolsillo también). No afecta el balance (`sumMonthExpenses` no filtra hidden).
9. **Toggle de gastos ocultos** — ✅ implementado en `expenses-list`: signal local `showHidden` (sin persistir), `filteredExpenses` excluye `hidden` si `!showHidden`, y acción "Ocultar/Mostrar" en el menú "more" de cada gasto (`toggleHiddenExpense`). Filas ocultas se atenúan con `.expense-row--hidden`. **Corrección de posición**: ya NO es un botón en el header; ahora es un **checkbox con leyenda "Mostrar movimientos ocultos" debajo del card "Total del mes"** (`.hidden-toggle`).
10. **Editar gasto: validar saldo solo si cambia el monto** — ✅ implementado: `expense-form-modal.onSave()` calcula el saldo disponible efectivo = `saldo actual + monto anterior` al editar (porque el gasto anterior se revierte primero y se devuelve su monto). Así, con saldo 55 y gasto 150, editar a 149 o 151 sí se permite (55+150−nuevo = saldo resultante ≥ 0). `expense.service.update()` valida crédito contra el **delta**.
11. **Crear/editar gasto sin bolsillo con confirmación** — ✅ implementado: opción seleccionable "Sin bolsillo" en el select; el form emite `saved` con `pocketId === 0` y el **padre** **cierra el bottom-sheet del form** y abre un `ConfirmDialogComponent` en su propio bottom-sheet. Aplica en **ambos padres**: `expenses-list` (`pendingExpense`/`pendingOriginalExpense` + `persistPendingExpense`) y **`dashboard`** (FAB de gasto: `confirmExpenseOpen`/`pendingExpense` + `persistExpense`). `onConfirm`/`onCancel` limpian los pendientes. Ya no hay confirmación anidada sobrepuesta.
12. **Scroll en gastos recientes del detalle** — ✅ implementado: `.app-list` en `payment-method-detail` con `max-height: 320px` + `overflow-y: auto`.
13. **Límites de caracteres** — ✅ implementado: `TextInputComponent` ahora acepta `[maxlength]`. Descripción gasto/ingreso/transfer = 100; nombre pago recurrente/plantilla/bolsillo = 50.

### FASE D — Ahorros
14. **Ordenar transacciones de ahorro por fecha descendente** + scroll en la lista (`savings-detail`).
15. **NO tocar el sistema de ahorros programados** (el usuario lo hizo explícito).

### FASE E — Dashboard / UI
16. **Bolsillo con balance negativo**: no llenar la barra de progreso y mostrar el número en rojo (`pocket-summary-widget`).
17. **Ingresos y Pagos**: items con título+monto arriba y detalles debajo (una línea por item, igual que gastos).
18. **Layout de listas**: verificar consistencia con el `list-item` optimizado.

### FASE F — Dashboard y pagos (plan aprobado 2026-08) — ✅ COMPLETADA
El usuario pidió estos 5 puntos (algunos descubiertos al probar el deploy v0.2.7). Implementados en la rama `feature/fase-f-dashboard-ingresos`. Detalles:

19. **Widget "Pagos urgentes" del dashboard clickeable** — ✅ implementado (2ª versión): el elemento completo de cada pago es un `<button class="urgent-pay">` clickeable (sin botón "Pagar" separado) que emite `markAsPaid`; el dashboard navega a `/monthly-payments?pagar=<id>` (`onMarkPaymentAsPaid`) y `MonthlyPaymentsListComponent` lee el query param en `openRequestedMarkAsPaid()` (tras `load()`) y abre el bottom-sheet existente (`openMarkAsPaid`).
20. **Botones del bottom-sheet "Marcar como pagado" sin estilos** — ✅ corregido: `ButtonDirective` agregada a `imports` de `MonthlyPaymentsListComponent`.
21. **Alerta de cercanía de fecha de pago en widget de tarjetas** — ✅ implementado (2ª versión): `buildCreditCardEntries` envía `paymentDueDate` **ISO**; el widget calcula `daysUntilDue` y muestra `app-badge` **en la misma fila que los montos** (`.card-extra` con `flex-row` + `space-between`), rojo "Vence hoy" si `daysUntilDue === 0`, amarillo "Vence mañana" si `=== 1`; solo si `amountToPay > 0` (pagada = sin alerta). **Toda la tarjeta cambia de color**: `card-row--alert-danger` (fondo `color-danger-subtle` + borde danger) y `card-row--alert-warning` (fondo `color-warning-subtle` + borde warning). Badge más grande (`--text-size-small`).
22. **Onboarding se omite al recargar** (bug) — ✅ corregido: `MonthService.autoReplicateIfNeeded()` hace early-return si no hay `record` o `!record.setupComplete`; al guardar usa `setupComplete: record?.setupComplete ?? false` (también en `settings.component.ts`).
23. **IMPORTANTE — Replicación de ingresos mensuales/quincenales** — ✅ implementado:
   - `IncomeService.replicateRecurring(originMonth, originYear, targetMonth, targetYear)` + función pura exportada `buildReplicatedIncomes(...)` (testeable).
   - **Mensual**: copia con fecha +1 mes, `month/year` destino, `status: 'expected'`.
   - **Quincenal**: agrupa el par (description+amount+paymentMethodId+category), usa la fecha más temprana como ancla y crea el **par** en el mes destino (día del ancla + 15 días), ambos `expected`.
   - **Bug corregido (2ª ronda)**: las copias conservaban el `id` original del registro fuente → `bulkAdd` fallaba con ConstraintError (por eso no se replicaba nada). Fix: se elimina el `id` en las copias (`const { id: _id, ...rest }`) — misma técnica que `MonthlyPaymentService.replicateRecurring`.
   - Tracking separado en `AppSettings.replicatedIncomeMonths` (migración: meses ya en `replicatedMonths` igual reciben ingresos). Integrado en `MonthService.autoReplicateIfNeeded`.
   - Tests: `income.service.spec.ts` (9 tests de `buildReplicatedIncomes`, incluye strip de id) y `month.service.spec.ts` (5 tests de `autoReplicateIfNeeded`, incluye fix de onboarding y migración).
24. **IMPORTANTE — Respaldo JSON incompleto** (agregado por el usuario) — ✅ corregido: `DataPortabilityService` solo exportaba 12 tablas; faltaban **`transfers`, `refunds` y `catalogs`**. Se agregaron al payload (versión bump a `BACKUP_VERSION = 2`), al `collect()`, al import (clear + bulkAdd vía mapping) y se hizo el import tolerante a backups v1 (tablas faltantes = vacías). `npm test` → **104 tests pasan**. Build verificado OK.

---

## 6. DÓNDE ME QUEDÉ / ESTADO ACTUAL

### Estructura de ramas (importante)
- **`master`** — contiene Fase A commiteada (`a013088`, commit `feat: replicación automática mensual de pagos recurrentes y presupuestos`): `month.service.ts` (nuevo), `app-settings.model.ts` (`replicatedMonths`), `budget.service.ts` (`replicateBudgets`), `monthly-payment.service.ts` (`getByMonth` con dueDate, `markAsPaid` en mes real), `app.ts` (hookup MonthService), `settings.component.ts|html` (eliminado "Cierre de mes"), `CONTEXT.md`.
- **`feature/credit-cards`** — rama de trabajo para TODO el tema de tarjetas de crédito. Contiene:
  - `d8e9ce9` — Fase B: `credit-card-statement.service.ts` (guardia de fecha eliminada en `getAmountToPay`), `balance.service.ts` (`sumBillableDebt` sin guardia de fecha), `catalog.service.ts` (`CARD_PAYMENT_CATEGORY`), `expense.service.ts` (`skipBalanceEffect`, `assertPocketExists` permite 0), `credit-card-detail.component.ts` (pago como gasto "Pago de tarjeta" sin bolsillo + validación de saldo).
  - `a9be038` — Fix match estable de pagos: `getStatementPeriod()` nuevo en `credit-card-statement.service.ts` (usa `lastCutoffMonth/Year`, estable a través del cambio de mes); `getAmountToPay()` y `BalanceService.sumBillableDebt()` matchean contra `getStatementPeriod()`; `TransferService.create()` y `credit-card-detail.onSavePayment()` etiquetan pagos con el período del statement; `payment-methods-list.component.ts` muestra "A pagar" **neto** (statementBalance − pagos del período) cargando transfers.
  - **Fix zombie 2 (sin commitear aun)** — `transfer.service.ts` + `balance.service.ts`:
    - **Causa 1 (cuota MSI marcada como pagada)**: `TransferService.create()` en la rama "before cutoff" marcaba como pagadas las cuotas con `cutoffMonth` = `transfer.month` (mes actual), en vez del período que el statement congelado realmente cubre. Al pagar un zombie (ej. NU el 5 sep antes del corte 26) marcaba la cuota MSI de septiembre como pagada → desaparecía del "saldo usado del mes". Fix: solo marca cuotas del período cubierto = `previousPeriod(getStatementPeriod(card))` (un mes antes del label del statement) y solo si `statementBalance > 0 && isCreditCardPayment`. Nuevo helper `previousPeriod()`.
    - **Causa 2 (deuda exigible sin los cargos del período actual)**: `BalanceService.sumBillableDebt()` había perdido la guardia `today.getDate() >= closingDay` en el fix anterior; con ella restaurada, las tarjetas cuyo día de corte aún no ha pasado (NU, MP) vuelven a la rama "en vivo" → aportan su uso actual. Con ambos fixes: deuda esperada = $13,971.70 = Santander $2,778.77 + BBVA $2,860.00 + Liverpool $199.00 + NU $4,354.34 + MP $3,779.59.
  - Build verificado OK (`npx ng build`). `version.ts` queda modificado sin commitear (autogenerado por el build).

### Bug reportado por el usuario (zombies) y diagnóstico
- El usuario registró pagos de cortes pendientes como **gastos provisionales de débito** (Sep 1/3), por lo que nunca tocaron el `statementBalance` de las tarjetas. Sus intentos de reconciliación (borrar gastos + pagar, o abonar saldo + pagar) no se reflejaban porque el match de pagos usaba `getCutoffPeriod(closingDay, hoy)` (cambiaba al cruzar el día de corte/mes), así que los pagos "se perdían" y la deuda volvía al `statementBalance` completo. El fix (commit `a9be038`) resuelve esto con el período estable.
- **Segunda ronda de pruebas**: el usuario cargó respaldo de producción, borró los gastos provisionales y pagó los zombies. Dos problemas residuales: (1) la cuota MSI pendiente se marcaba como pagada al pagar el zombie (fix en `transfer.service.ts` con `previousPeriod`); (2) la deuda exigible no incluía los cargos del período actual de las tarjetas pagadas (fix: restaurar guardia `today >= closingDay` en `sumBillableDebt`). **Pendiente de verificar por el usuario**: NU "saldo usado del mes" = $4,354.34 y deuda exigible = $13,971.70.

### Ronda 3 — Períodos de tarjeta basados en el corte, reactividad y consistencia del widget (sin commitear aun)
Problemas reportados: (1) al pasar la fecha de corte sin aplicar el corte el "monto usado" desaparece/queda en limbo; (2) al aplicar el corte el balance no se actualiza hasta recargar; (3) tras el corte el período no avanza hasta el día siguiente; (5) al pagar no se refleja en el widget hasta recargar; (6) el "Usado" del widget no coincide con el detalle (no usa `applicationDate` ni resta reembolsos).

**Cambios implementados:**
- **`credit-card-statement.service.ts`**: nuevo `getActivePeriod(card)` que deriva el período activo de `getStatementPeriod` (label = `lastCutoffMonth/Year`) → `start = closingDay+1 del mes anterior al label`, `end = closingDay del label`. Resuelve #1 y #3: antes del corte el período sigue cubriendo los cargos del período recién cerrado (siguen contando en la deuda); tras el corte avanza de inmediato. Añadido helper `previousPeriod`.
- **`balance.service.ts`**: la rama "en vivo" de `sumBillableDebt` ahora usa `getActivePeriod` + `getStatementPeriod` (gastos, cuotas, transfers y reembolsos alineados al período del corte). Se eliminaron los parámetros `month/year` de `sumBillableDebt` y el método muerto `calculateActivePeriod` + `DateRange` + `toIsoDate`.
- **`credit-card-detail.component.ts`**: `calculatePeriodRange` ahora devuelve `getActivePeriod` (mantiene shape `{startIso, endIso, month, year}` con label). `onSavePayment` y `closePeriod` llaman `dataRefresh.notify()`.
- **`dashboard.component.ts`**: `buildCreditCardEntries` usa `getActivePeriod`/`getStatementPeriod`, filtra con `(applicationDate ?? date)` y **resta reembolsos** (carga `database.refunds` en `loadAll`). El `effect` del constructor depende de `dataRefresh.version()`. Inyectado `DataRefreshService`.
- **`app.ts`**: `confirmCutoff` llama `dataRefresh.notify()` (cubre el prompt global de corte).
- **`data-refresh.service.ts`** (nuevo): señal de versión compartida con `notify()` para refrescar el dashboard en tiempo real.
- **Tests nuevos**: `credit-card-statement.service.spec.ts` (`getActivePeriod`: rango con label, cruce de año, corte día 1, fallback) y `data-refresh.service.spec.ts`. `npm test` → **90 tests pasan**.
- Build verificado OK (`npx ng build`). `version.ts` queda modificado sin commitear (autogenerado).

**Pendiente de verificar por el usuario (ronda 3)**: que el widget "Usado" coincida con el detalle (gasto 26/7 con aplicación 27/7, corte 26), que el usado siga contando tras la fecha de corte sin aplicarlo, que tras aplicar el corte avance y que el balance/widget se actualicen al instante (corte desde prompt global y desde detalle, y pago desde detalle).

### Ronda 4 — Fix "limbo" al cierre de período + apartado de pagos de tarjeta pendientes de meses anteriores (commiteado)
Problemas reportados: (1) al llegar la fecha de corte de una tarjeta, el "monto usado" se queda en el limbo en la **Deuda exigible** del balance (aunque el widget de tarjetas y el detalle sí lo muestran); al confirmar el corte el balance vuelve a la normalidad. (2) Al pasar al mes siguiente, los pagos de tarjetas pendientes del mes pasado no se toman en cuenta; deberían restar en la proyección de fin de mes como **apartado nuevo** (no dentro de "Deuda exigible").

**Cambios implementados (Pasos 1 y 2):**
- **`credit-card-statement.service.ts`**: nuevo método público `isCutoffProcessed(card, today)` → `true` solo si `today >= closingDay` **y** el corte del período ya se procesó (`!needsCutoff`). Si el día de corte llegó pero el corte no se aplicó, devuelve `false`.
- **`balance.service.ts`**:
  - `sumBillableDebt`: la rama "statement" ahora se activa con `isCutoffProcessed(card, today)` en vez de `today.getDate() >= closingDay`. Así, si el corte no se ha aplicado, la tarjeta cae en la rama "en vivo" → el "monto usado del mes" sigue contando en la deuda exigible (fix del limbo).
  - Nuevo método `sumPendingCardDebtFromPreviousPeriods(methods, allTransfers)`: suma `getAmountToPay()` de las tarjetas cuyo corte **no** se ha procesado (el `statementBalance` del mes anterior sin pagar). Se resta en `netBalanceThisMonth` y `endOfMonthProjection`, pero **no** entra en `billableDebtThisMonth` (evita doble conteo). Integrado en `calculate()`.
  - Importado el tipo `Transfer`.
- **`monthly-balance.model.ts`**: campo nuevo `pendingCardDebtFromPreviousPeriods: number`.
- **`dashboard.component.html`**: línea nueva condicional en el desglose: "Pagos de tarjeta pendientes (meses anteriores)" (solo dashboard, como "Ahorros programados").
- Build verificado OK (`npx ng build`) y `npm test` → **90 tests pasan** (sin cambios en specs). `version.ts` queda modificado sin commitear (autogenerado).

**PENDIENTE — Paso 3 (rama futura aparte)**: tests con `fake-indexeddb` como devDependency (Dexie en memoria) + `balance.service.spec.ts` con `vi.setSystemTime` para escenarios: A) día de corte sin aplicar → el monto usado del mes cuenta en `billableDebtThisMonth` (limbo resuelto); B) corte aplicado → deuda = `statementBalance − pagos`; C) mes siguiente → `pendingCardDebtFromPreviousPeriods` refleja el statement anterior sin pagar y no se duplica en la deuda. **No implementado aún — se hará en una rama nueva.**

**Pendiente de verificar por el usuario (ronda 4)**: al llegar la fecha de corte sin aplicar el corte, la Deuda exigible debe seguir mostrando el monto usado del mes; y en el mes siguiente debe aparecer el apartado "Pagos de tarjeta pendientes (meses anteriores)" restando en la proyección.

### Estado de git actualizado (2026-08)
- **`feature/credit-cards` fue mergeada a `master`** (fast-forward, HEAD = `c3a46a8`). Toda la Fase B + rondas 3/4 de tarjetas quedó en master.
- **Deploy v0.2.7 realizado por el usuario**: `npm run deploy` bumpó a **v0.2.7** (commit `b9f3f0e`, tag `v0.2.7`) y publicó en GitHub Pages. Push de `master` y tag `v0.2.7` a origin OK. Working tree limpio (se restauró `version.ts` autogenerado).
- `npm test` → **90 tests pasan** en master tras el merge de tarjetas.

### FASE F mergeada y desplegada (v0.2.8)
- Rama `feature/fase-f-dashboard-ingresos` mergeada a `master` (fast-forward, commit `6098635`).
- **Deploy realizado**: `npm run deploy` bumpó a **v0.2.8** (commit `f3084f6`, tag `v0.2.8`) y publicó en GitHub Pages. Push de `master` y tag `v0.2.8` a origin OK.
- El usuario **confirmó** que la replicación de ingresos funciona y que los estilos de los widgets están correctos.
- `npm test` → **104 tests pasan**, build OK.

### FASE C mergeada y desplegada (v0.2.9)
- Rama `feature/fase-c-gastos` mergeada a `master` (fast-forward, commit `2040c19`).
- **Deploy realizado**: `npm run deploy` bumpó a **v0.2.9** (commit `15fe5e9`, tag `v0.2.9`) y publicó en GitHub Pages. Push de `master` y tag `v0.2.9` a origin OK.
- El usuario **confirmó** C1, C2 y C3; C4 se corrigió (confirmación también desde el FAB del dashboard, botón rojo).
- `npm test` → **104 tests pasan**, build OK.

### Próximo paso (después de FASE C)
Siguen pendientes las **FASES D y E** (ver sección 5):
- FASE D — Ahorros (ordenar transacciones descendente; NO tocar ahorros programados).
- FASE E — Dashboard/UI (bolsillo negativo, layout ingresos/pagos, consistencia de listas).

**NOTA**: deploy de FASE C aprobado por el usuario (se hizo en v0.2.9). Para próximas fases, preguntar antes de desplegar. Comando de deploy: `npm run deploy`. **Importante**: tras el fix de respaldo, si el usuario restaura un backup v1 antiguo, las tablas `transfers`/`refunds`/`catalogs` quedarán vacías (no existían en ese backup) — no es un error de import, es data que nunca se exportó.

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
- `src/app/features/expenses/expenses-list.component.ts|html` — lista de gastos (FASE C: toggle de ocultos + ocultar/mostrar manual).
- `src/app/features/expenses/expense-form-modal.component.ts|html` — form de gastos (FASE C: validar saldo solo si cambia monto + confirmación sin bolsillo + maxlength 100).
- `src/app/features/credit-cards/credit-card-detail.component.ts|html` — detalle tarjeta, pago manual (gasto "Pago de tarjeta" sin bolsillo + validación de saldo + billingPeriod estable).
- `src/app/features/credit-cards/payment-methods-list.component.ts|html` — listado de métodos; "A pagar" neto (statementBalance − pagos del período).
- `src/app/core/services/transfer.service.ts` — transfers; `create()` etiqueta pagos de tarjeta con el período estable del statement.
- `src/app/core/services/balance.service.ts` — `sumBillableDebt` sin guardia de fecha, matchea pagos contra `getStatementPeriod()`.
- `src/app/features/savings/savings-detail.component.*` — transacciones de ahorro.
- `src/app/features/dashboard/widgets/pocket-summary-widget.component.*` — barra de bolsillos (negativos).
- `src/app/features/dashboard/widgets/urgent-payments-widget.component.*` — pagos urgentes (FASE F: elemento completo clickeable + output `markAsPaid`).
- `src/app/features/dashboard/widgets/credit-card-status-widget.component.*` — estado de tarjetas (FASE F: alerta de fecha de pago junto a montos + color de tarjeta).
- `src/app/features/monthly-payments/monthly-payments-list.component.ts|html` — pagos recurrentes (FASE F: fix `ButtonDirective`, leer query param `pagar`).
- `src/app/features/income/income-list.component.ts` — listado de ingresos (FASE F: verificación de replicación).
- `src/app/core/services/income.service.ts` — ingresos (FASE F: `replicateRecurring` + `buildReplicatedIncomes` pura; strip de `id` en copias).
- `src/app/core/models/app-settings.model.ts` — settings (FASE F: `replicatedMonths` + `replicatedIncomeMonths`).
- `src/app/core/services/data-portability.service.ts` — respaldo JSON (FASE F: ahora exporta/importa `transfers`, `refunds`, `catalogs`; version 2).
- `src/app/core/services/savings.service.ts` — ahorros (FASE C: gasto de retiro con `hidden: true`).
- `src/app/core/services/expense.service.ts` — gastos (FASE C: `update()` valida saldo por delta).
- `src/app/features/credit-cards/payment-method-detail.component.*` — detalle de método (FASE C: scroll en gastos recientes).
- `src/app/shared/components/text-input/text-input.component.*` — input de texto (FASE C: soporta `maxlength`).
- `scripts/bump-version.js`, `scripts/generate-version.js` — versionado.
