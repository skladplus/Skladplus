# 04 — Черновик доменной схемы

Черновик таблиц Prisma до первой миграции. Поведение и права — в
`docs/02-product-spec.md` (§-ссылки ниже); ответы и отложенное —
`docs/09-findings-backlog.md`, принятые решения — `docs/06-architecture.md`.
`#N` — номер пункта бэклога, ссылка на GitHub идёт со словом (`PR #23`,
`issue #16`).

Пункты, где ответ заказчика может изменить структуру, помечены
`заблокировано #N` — такие таблицы закладываются, но их наполнение
не реализуется до ответа.

## Сквозные конвенции

- Деньги — `BigInt`, целые копейки, суффикс `Kop` (решение в 06-architecture).
- Время — `DateTime @db.Timestamptz(3)`; расчёт «рабочих минут» — в
  `packages/core` (8:00–20:00 Kyiv, #5).
- У каждой клиентской таблицы — `accountId` + составные индексы
  `(accountId, createdAt)` и `(accountId, status)` где есть статус.
- Enum — английские, украинские подписи — в UI-слое (#49 ↷).
- Первичные ключи — `cuid()`; человекочитаемые номера (`Order.number`,
  `Supply.number`, `Return.number`, `Invoice.number`) — отдельные
  последовательности на account.
- Доступ: клиентские таблицы — только через `AccountScope.forAccount()`;
  кросс-аккаунтные выборки персонала — через `StaffScope` (06-architecture,
  02 §2).
- Деление на ограниченные контексты ниже — это и есть деление работ между
  двумя разработчиками «от таблицы до экрана» (06-architecture); контекст A
  (идентичность) делает один человек первым — от него зависят оба.

## A. Идентичность и доступ

Провайдер — **better-auth**: решение принято, строка в `docs/06-architecture.md`,
пункт #44 закрыт. Пять таблиц блока замещаются его схемой, пять остаются нашими;
само замещение выполняет задача 1.4, здесь зафиксировано соответствие.

**Замещается схемой better-auth.** Модели `user`, `session`, `account`,
`verification`; имена моделей задаются конфигурацией, поэтому переименовать
можно любую сторону. Полный состав полей генерируется CLI провайдера —
здесь только ключевые, чтобы видеть соответствие.

| Черновик | Чем замещается | Что донастроить |
|---|---|---|
| `User` | `user`: id · name · email `@unique` · emailVerified · image · createdAt · updatedAt | `phone` — через `user.additionalFields` |
| `Credential` | `account.password` при `providerId = "credential"` | argon2id вместо scrypt по умолчанию — своими `password.hash`/`verify` (02 §8) |
| `Session` | `session`: token `@unique` · expiresAt · ipAddress · userAgent · userId | ничего: «вийти з усіх пристроїв» — удаление строк по `userId` |
| `PasswordResetToken` | `verification`: строка с `identifier = "reset-password:<токен>"` | TTL ≤ 1 ч — `resetPasswordTokenExpiresIn`; хранить хешем — `verification.storeIdentifier: "hashed"` (02 §8) |
| `ContactVerificationToken` | ничем: ссылка подтверждения — JWT, подписанный секретом сервера, строки в базе нет | срок — `emailVerification.expiresIn`; выданную ссылку нельзя отозвать до истечения, в отличие от строки (02 §4.1.4) |

**Столкновение имён.** У better-auth `account` — связка человека с провайдером
входа и место хранения пароля; у нас `Account` — клиент-бизнес. Две сущности
с одним именем в одной схеме читаются неверно, поэтому одна из сторон
переименовывается в задаче 1.4.

**Остаются нашими.**

| Таблица | Поля (ключевое) | Связи / примечания |
|---|---|---|
| `LoginEvent` | userId? · email · ok: Boolean · ip · userAgent · createdAt | журнал входов, питает «Безпеку» в настройках; собственный rate limiting better-auth заводит таблицу только при `rateLimit.storage = "database"` |
| `StaffMember` | userId `@unique` · role: `OWNER \| MANAGER` · active · onShift: Boolean | персонал склада; `onShift` — дежурство в чате (#54); иерархии нет (#21) |
| `Account` | id · name · legalName · edrpou? · onboardingStatus (02 §5.4) · contactEmail · contactPhone · source? («звідки дізнались») · expectedVolume? · createdAt | клиент-бизнес; `balanceKop` не храним — постоплата (#19), долг считается по счетам |
| `AccountMembership` | accountId + userId `@@unique` · preset: `CLIENT_OWNER \| OPERATOR \| VIEWER` (#65) · active · invitedAt/acceptedAt | команда клиента |
| `ShipperProfile` | accountId · name · fopName · ipn? · npApiKeyEncrypted · npKeyLast4 · isDefault · active | ФОП-профиль отправителя; ключ НП шифруется прикладным ключом (#40), «последний использованный становится типовым» |

## B. Товары · поставки · остатки (контекст 1)

| Таблица | Поля (ключевое) | Связи / примечания |
|---|---|---|
| `ProductCategory` | accountId · name | создаётся «на льоту» из карточки |
| `Product` | accountId · sku · name · description? · brand? · categoryId? · imageUrl? · priceKop · costKop? · externalId? · isKit (#24) · isVirtual (#50) · minStockThreshold? + lowStockNotify (#51) · noMovementDaysThreshold = 30 (#52) · lengthMm?/widthMm?/heightMm? (от клиента) · weightG? (целые граммы, от клиента — подсказка для предзаполнения) · measuredVolumeCm3? (замер склада, #58) · archived · `@@unique(accountId, sku)` | `weightG` только предзаполняет вес отправления: фактический вводит склад по весам (`Shipment.weightG`), потому что НП требует его и для расчёта цены, и для создания ТТН; объём для тарифа хранения — только `measuredVolumeCm3`; без него зберігання не тарифицируется |
| `Barcode` | productId · code · `@@unique(accountId, code)` | до двух на товар — отдельной таблицей |
| `KitComponent` | kitId → Product · componentId → Product · quantity | состав комплекта (#24); резерв и списание — по компонентам |
| `Packing` | accountId · sku? · name · barcode? · priceKop? · imageUrl? · onHand | упаковка клиента (#60); пополняется поставкой, списается в заказ |
| `StorageCell` | code `@unique` · zone? · active | глобальная (склад один, #8); закладывается сразу (#9) |
| `Stock` | productId + cellId `@@unique` · onHand · reserved | материализация журнала; `available = onHand − reserved` (#23) |
| `StockMovement` | accountId · productId · cellId? · type: `SUPPLY_IN \| ORDER_RESERVE \| RESERVE_RELEASE \| ORDER_SHIP \| RETURN_IN \| ADJUSTMENT \| WRITE_OFF` · delta · orderId?/supplyId?/returnId?/inventorySessionId? · staffId? · comment? · createdAt | журнал-источник истины; остаток пересчитываем из него |
| `StockSnapshot` | accountId · date · totalVolumeCm3 · totalUnits | ежедневный снимок воркером — тариф хранения по среднему (#2) |
| `InventorySession` | scope (весь склад/клиент/категорія/комірка) · status: `OPEN \| APPLIED \| CANCELLED` · startedBy · appliedBy? · createdAt | инвентаризация (#25, 02 §4.3.4) |
| `InventoryLine` | sessionId · productId · cellId · systemQty · actualQty | дельта → `ADJUSTMENT` при применении |
| `Supply` | accountId · number · status (02 §5.3) · deliveryMethod: `NOVA_POSHTA \| SELF_DELIVERY \| PICKUP \| OTHER` · ttn? · expectedAt? · comment? | |
| `SupplyItem` | supplyId · productId · expectedQty · receivedQty? · unitCostKop? · discrepancyNote? | расхождение → акт (#15, заблокировано — форма акта) |

## C. Заказы · возвраты · сборка (контекст 2)

| Таблица | Поля (ключевое) | Связи / примечания |
|---|---|---|
| `Order` | accountId · number · channel: `CABINET \| MANUAL \| CRM \| PROM \| ROZETKA` · externalId? · `@@unique(accountId, channel, externalId)` (#43) · status: 02 §5.1 (`DRAFT`+17) · shipperProfileId · recipientId · paymentType: `FULL \| PREPAID \| COD` · totalKop · prepaidKop? · declaredValueKop? · deliveryPayer · codPayer? · assemblyComment? · awaitingCall: Boolean · reshipmentOfId? · createdAt | цена позиций фиксируется при создании (#6); `reshipmentOfId?` — self-relation: повторная отправка ссылается на исходный заказ (#26) |
| `OrderItem` | orderId · productId · quantity · priceKop (зафиксирована) · pickedQty = 0 | комиссия — по фактически собранному (#1); комплект хранится строкой комплекта, разворот — при сборке (#24) |
| `OrderPacking` | orderId · packingId · quantity | использованная упаковка (#60), отмечает менеджер |
| `Recipient` | type: `PERSON \| COMPANY` · firstName/middleName/lastName · phone · email? · cityRef?/branchRef?/address? · anonymizedAt? | отдельная таблица под обезличивание (#18); журналы не трогаются |
| `Shipment` | orderId `@unique` (#11) · ttn? · npStatus? (#59) · codInTransitKop? (#53) · weightG · npCostKop? · npCostQuotedAt? · handedOverAt? · carrierScanAt? · deliveredAt? | двухстадийный финиш SLA (#4); `weightG` обязателен — без него НП не создаёт ТТН; `npCostKop` и `npCostQuotedAt` пишутся вместе и только после успешного ответа API при создании ТТН; до этого момента котировка не хранится. Значение справочное: счёт выставляет НП клиенту напрямую (#12) |
| `OrderStatusEvent` | orderId · from → to · actor (`CLIENT \| STAFF \| SYSTEM`) · actorId? · comment? · createdAt | журнал переходов: «понад 30 хв», SLA-отчёты, статистика |
| `AssemblyTask` | orderId `@unique` · status (02 §5.5) · assigneeStaffId? · queuedAt · startedAt? · assembledAt? · handedOverAt? · slaDeadlineAt (рабочие минуты) · slaSpentSec (за вычетом пауз) | приоритет не хранится — вычисляется (02 §6); частичный индекс по активным статусам |
| `AssemblyPause` | taskId · kind: `PAUSE \| PROBLEM` · comment (обязателен) · startedAt · endedAt? · annulledBy? + annulledAt? (#48) | журнал пауз — экран 02 §4.3.9 |
| `AssemblyItemPick` | taskId · orderItemId · componentProductId? (для комплектов) · pickedQty · pickedAt | сканирование не используется, поля под него нет (#84) |
| `Return` | accountId · orderId · number · kind: `REFUSAL \| POST_DELIVERY` (#22) · status (02 §5.2) · returnTtn? · totalKop? · createdAt | |
| `ReturnItem` | returnId · orderItemId · quantity · condition: `OK \| DAMAGED \| MISSING` · resolution: `RESTOCK \| WRITE_OFF`? · photoUrl? | списание — #33 (заблокировано подтверждение) |
| `ReturnComment` | returnId · authorType/authorId · text · createdAt | лента комментариев |

## D. Поддержка · уведомления · настройки

| Таблица | Поля (ключевое) | Связи / примечания |
|---|---|---|
| `SupportThread` | accountId · subject? · linkedType?/linkedId? (замовлення/поставка/повернення) · status: `OPEN \| CLOSED` · assigneeStaffId? · createdAt | чат (#54, 02 §4.2.10/§4.3.6) |
| `SupportMessage` | threadId · authorType (`CLIENT \| STAFF`) · authorId · text · readAt? · createdAt | |
| `Setting` | scope: `PLATFORM \| ACCOUNT \| USER` · scopeId? · key · value Json · updatedBy · `@@unique(scope, scopeId, key)` | значения настроек; типы/валидация/подписи — `SettingDefinition` в коде с zod (конструктор, `docs/03-ux-ui.md`). Сюда: расписание дайджеста (#51), дежурный (#54), пороги, feature-флаги |

## E. Финансы (контекст 3)

| Таблица | Поля (ключевое) | Связи / примечания |
|---|---|---|
| `TariffVersion` | accountId · effectiveFrom · effectiveTo? · createdBy | тариф индивидуальный и версионный (#6); новая версия закрывает старую датой |
| `TariffLine` | tariffVersionId · serviceType: `ORDER_PROCESSING_BASE \| ORDER_PROCESSING_PER_UNIT \| RECEIVING_PER_UNIT \| STORAGE_M3 \| RETURN_REFUSAL \| RETURN_POST_DELIVERY \| INSERT \| CHECK \| PHOTO_REPORT \| CUSTOM` · priceKop · note? | строчная модель — новые услуги без миграции (#17, #22) |
| `LedgerEntry` | accountId · type (02 §7) · amountKop (знак) · orderId?/supplyId?/returnId?/serviceRequestId? · tariffLineId? · fixedPriceKop (цена в проводке, #6) · formulaNote? · invoiceId? · createdBy? · createdAt | долг клиента = сумма невыставленных + неоплаченных |
| `Invoice` | accountId · number · periodFrom/periodTo · totalKop · status: `ISSUED \| PAID \| OVERDUE` · issuedAt · paidAt? · confirmedBy? | постоплата (#19); что блокирует OVERDUE — #28 (заблокировано) |
| `CommissionRate` | staffId · percentBp (базисные пункты) · effectiveFrom · effectiveTo? | ставка версией (#47 ↷) |
| `CommissionEntry` | staffId · orderId · baseLedgerEntryId · rateSnapshotBp · amountKop · createdAt | начисляется при завершении сборки; при штрафном нуле — 0 (02 §7) |
| `ServiceRequest` | accountId · description · expectedAt? · linkedType?/linkedId? · status (02 §5.6) · executorComment? · timeSpentMin? · photoUrl? · priceKop? | доп. услуги заявками (#17) |

## Масштаб и индексы

15 000 заказов/мес ≈ 180 000/год — обычный Postgres без партиционирования.
Обязательные индексы: `(accountId, createdAt)` и `(accountId, status)` на
`Order`, `Supply`, `Return`, `LedgerEntry`, `SupportThread`; частичный индекс
на `AssemblyTask` по активным статусам (`QUEUED, IN_PROGRESS, PAUSED, PROBLEM`) —
очередь сборки читается чаще всего; `StockMovement(productId, createdAt)` —
история карточки товара.

## Что сознательно не закладываем сейчас

- Таблицы интеграций CRM/Prom/Rozetka — до выбора первой интеграции (#13);
  идемпотентность вебхуков обеспечивается `@@unique(accountId, channel,
  externalId)` уже сейчас (#43).
- СМС-шаблоны (#62), фискализация (#61), рейтинг получателя (#63), публичные
  API-ключи (#64) — после MVP.
- 2FA-поля персонала (#66) — вместе с реализацией better-auth, задача 1.4.
- Документооборот (акты как документы, претензии, #15) — форма актов
  заблокирована; данные для них уже есть (`SupplyItem`, `InventoryLine`).

## Открытые места, меняющие структуру

| # | Что может измениться |
|---|---|
| #22 ↷ | цены типов возвратов — только `TariffLine`, структура готова |
| #44 | провайдер auth — замена таблиц блока A (User/Credential/Session) |
| #47 ↷ | формула комиссий — только значения ставок, каркас готов |
| #58 | если замер объёма окажется не при приёмке — переедет поле `measuredVolumeCm3` |
