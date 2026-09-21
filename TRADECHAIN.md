# TradeChain — Blockchain-Based Drug Supply Chain Tracking for Pharmaceutical Distribution

## Project Context & History

This project evolved through several iterations:
- Started as AgroChain (medicinal plant tracking for MAHA FPO)
- Pivoted to FMCG GT Order Tracking (general trade distribution)
- Final pivot: **TradeChain** — applying the same blockchain order-tracking architecture to pharmaceutical distribution, anchored to Serum Institute of India as the real-world reference

The core technical insight remains: **track ORDERS, not individual products**. One QR code per delivery slip, not per medicine strip. This makes blockchain viable for high-volume pharmaceutical distribution.

---

## Problem Statement

Pharmaceutical companies like Serum Institute can track drugs only until the C&F agent/distributor through SAP. Beyond that, they have zero verifiable proof of whether medicines actually reached the medical store, in what quantity, at what temperature, and on time — leading to counterfeit drug infiltration, expired stock circulation, cold chain violations for vaccines, scheme absorption by distributors, and potential patient harm. WHO estimates 10-30% of drugs in developing countries are counterfeit.

**Solution:** Replace paper-based delivery slips with blockchain-anchored QR-coded orders. Each dispatch and receipt is recorded on-chain with quantity and temperature verification at the medical store level. AI-powered anomaly detection flags mismatches, cold chain breaks, and suspicious distribution patterns in real-time — giving pharma companies end-to-end visibility from manufacturing line to pharmacy shelf.

---

## Why Pharma Needs This More Than Any Other Sector

1. **Counterfeit drugs kill people** — unlike fake snacks, fake medicines cause direct patient harm
2. **Regulatory mandate** — CDSCO (India's drug regulator) and DSCSA (US) require drug traceability by law
3. **Cold chain is critical** — vaccines from Serum Institute (Covishield, etc.) need 2-8°C storage; breaks are undetectable today
4. **High-value, low-volume** — drug margins justify blockchain gas costs far more than ₹20 snack packets
5. **Distributor independence** — pharma distributors are separate legal entities who can divert, hoard, or sell expired stock
6. **No existing solution** — no blockchain system integrates SAP + order-level tracking + AI + cold chain for pharma GT distribution

---

## Supply Chain Being Tracked

```
Serum Institute Factory (Pune)
    ↓ [SAP can see this — primary sales]
C&F Agent (Carrying & Forwarding)
    ↓ [BLIND SPOT STARTS HERE]
Distributor (Regional)
    ↓ [No data, no tracking, no proof]
Stockist (City-level)
    ↓ [Completely invisible to Serum Institute]
Medical Store / Pharmacy (GT)
    ↓
Patient
```

TradeChain fills the blind spot from C&F Agent → Medical Store.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Ethereum (Solidity 0.8.20) + Hardhat 2 + OpenZeppelin AccessControl |
| Testnet | Sepolia (free deployment) |
| Backend | Node.js + Express.js (CommonJS) |
| Database | PostgreSQL (off-chain mirror of blockchain events) |
| Frontend | React.js + TailwindCSS + Recharts |
| Auth | MetaMask wallet (wallet address = identity, no username/password) |
| QR | qrcode.react (generation) + html5-qrcode (smartphone scanning) |
| AI | Claude Sonnet 4.5 API — anomaly detection, route summaries, expiry alerts |
| Cold Chain | Temperature logging at each transfer point (manual entry or IoT placeholder) |
| Off-chain Storage | IPFS via Pinata (batch certificates, lab reports, delivery photos) |
| SAP Mock | CSV import matching real SAP export format + mock API endpoint |

---

## Smart Contracts (4 total)

### 1. UserRegistry.sol
Manages roles for all supply chain participants using OpenZeppelin AccessControl.

**Roles:**
- `ADMIN_ROLE` — Serum Institute admin (deployer)
- `CFA_ROLE` — C&F Agent
- `DISTRIBUTOR_ROLE` — Regional distributor
- `STOCKIST_ROLE` — City-level stockist
- `PHARMACY_ROLE` — Medical store / pharmacy

**Functions:**
- registerUser(address, sapCode, sapName, role)
- getUser(address) → returns sapCode, sapName, role
- getUserBySAP(sapCode) → returns address, role
- revokeUser(address)
- isRegistered(address) → bool

**Events:** UserRegistered, UserRevoked

### 2. OrderTracking.sol
Records every drug order dispatch and delivery confirmation on-chain.

**Functions:**
- createOrder(orderCode, fromSAP, toSAP, itemsHash, totalAmount, temperatureAtDispatch)
- confirmDelivery(orderCode, receivedItemsHash, temperatureAtReceipt, hasDispute)
- getOrder(orderCode) → full order struct
- getOrdersByParty(sapCode) → array of order codes

**Status:** CREATED → DISPATCHED → DELIVERED / DISPUTED

**Events:** OrderCreated, DeliveryConfirmed, DeliveryDisputed

**Temperature tracking:** Both dispatch and receipt temperatures recorded on-chain. If temperature at receipt exceeds threshold (e.g., >8°C for vaccines), auto-flags as DISPUTED.

### 3. DisputeManager.sol
Records disputes on-chain with tamper-proof evidence.

**Functions:**
- raiseDispute(orderCode, reason, evidenceIpfsHash)
- resolveDispute(disputeId, resolution)
- rejectDispute(disputeId, reason)

**Dispute reasons:** QUANTITY_MISMATCH, DAMAGED, EXPIRED, WRONG_PRODUCT, COLD_CHAIN_BREAK, COUNTERFEIT_SUSPECT

**Events:** DisputeRaised, DisputeResolved, DisputeRejected

### 4. SchemeRegistry.sol
Locks promotional scheme terms on-chain so distributors cannot alter or absorb them.

**Functions:**
- createScheme(title, productSAP, validFrom, validTo, termsHash)
- verifyScheme(schemeId) → returns scheme + active status

**Events:** SchemeCreated

---

## Database Schema (PostgreSQL)

### Table: users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| wallet_address | text unique | MetaMask address |
| sap_code | text unique | SAP party code |
| sap_name | text | Name in SAP |
| role | enum | ADMIN, CFA, DISTRIBUTOR, STOCKIST, PHARMACY |
| drug_license_no | text | DL number for pharmacies/distributors |
| mobile_no | text | |
| city | text | |
| region | text | |
| approved | boolean | Admin must approve |
| registered_at | timestamptz | |

### Table: products (drugs/medicines)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| material_sap_code | text unique | SAP material code |
| drug_name | text | e.g. "Covishield Vaccine 0.5ml" |
| generic_name | text | e.g. "ChAdOx1 nCoV-19" |
| hsn_code | text | |
| category | enum | VACCINE, TABLET, SYRUP, INJECTION, OINTMENT, DIAGNOSTIC |
| requires_cold_chain | boolean | True for vaccines |
| max_temp_celsius | decimal | Max allowed temperature (e.g. 8.0 for vaccines) |
| shelf_life_days | integer | Days from manufacture to expiry |
| schedule | text | Schedule H, H1, X, etc. |
| created_at | timestamptz | |

### Table: batches
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_id | uuid FK → products | |
| batch_number | text unique | e.g. "4122Z001A" |
| manufacture_date | date | |
| expiry_date | date | |
| quantity_manufactured | integer | |
| lab_report_ipfs_hash | text | Quality certificate on IPFS |
| blockchain_tx_hash | text | |
| created_at | timestamptz | |

### Table: orders
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| order_code | text unique | e.g. "TC-4821" |
| bill_number | text | From SAP |
| from_sap_code | text FK | Who dispatched |
| to_sap_code | text FK | Who should receive |
| order_level | enum | PRIMARY, SECONDARY, TERTIARY |
| sale_date | date | |
| total_amount | decimal | |
| status | enum | CREATED, DISPATCHED, DELIVERED, DISPUTED |
| temperature_at_dispatch | decimal | °C reading at send |
| temperature_at_receipt | decimal | °C reading at receive |
| dispatch_timestamp | timestamptz | |
| delivery_timestamp | timestamptz | |
| qr_code_payload | jsonb | |
| blockchain_tx_hash | text | |
| created_at | timestamptz | |

### Table: order_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| order_id | uuid FK | |
| material_sap_code | text FK | |
| drug_name | text | |
| batch_number | text | Links to batches table |
| quantity_dispatched | integer | |
| quantity_received | integer | Nullable until confirmed |
| quantity_mismatch | integer | Auto-calculated |
| expiry_date | date | Per batch |
| amount | decimal | |

### Table: disputes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| order_id | uuid FK | |
| raised_by_sap_code | text FK | |
| reason | enum | QUANTITY_MISMATCH, DAMAGED, EXPIRED, WRONG_PRODUCT, COLD_CHAIN_BREAK, COUNTERFEIT_SUSPECT |
| description | text | |
| evidence_ipfs_hash | text | Photo proof |
| status | enum | OPEN, RESOLVED, REJECTED |
| resolution_notes | text | |
| blockchain_tx_hash | text | |
| created_at | timestamptz | |
| resolved_at | timestamptz | |

### Table: schemes
Same as before, with product_material_sap_code linking to drugs.

### Table: claude_logs
Same as before — logs all AI interactions.

---

## Auth & Roles

### Login Flow
1. User opens app → clicks "Connect MetaMask Wallet"
2. Signs challenge message → backend verifies signature
3. If registered + approved → routes to role-specific dashboard
4. If new → registration form → pending admin approval

### 5 Roles
| Role | Description | Can do |
|------|-------------|--------|
| ADMIN | Serum Institute HQ | Full access, imports, disputes, AI, schemes |
| CFA | C&F Agent | Confirm receipt from factory, dispatch to distributors |
| DISTRIBUTOR | Regional distributor | Dispatch to stockists, confirm receipt, raise disputes |
| STOCKIST | City stockist | Dispatch to pharmacies, confirm receipt |
| PHARMACY | Medical store | Scan QR, confirm receipt, raise disputes, view schemes |

---

## Permission Matrix

| Action | Admin | CFA | Distributor | Stockist | Pharmacy |
|--------|-------|-----|-------------|----------|----------|
| Import from SAP (CSV) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Register drug batches | ✅ | ❌ | ❌ | ❌ | ❌ |
| View ALL orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own orders | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/dispatch order | ✅ | ✅ | ✅ | ✅ | ❌ |
| Scan QR confirm receipt | ✅ | ✅ | ✅ | ✅ | ✅ |
| Log temperature | ✅ | ✅ | ✅ | ✅ | ✅ |
| Raise dispute | ❌ | ✅ | ✅ | ✅ | ✅ |
| Resolve/reject dispute | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/lock scheme | ✅ | ❌ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ❌ | Own route | ❌ | ❌ |
| Claude AI features | ✅ | ❌ | Route summary | ❌ | ❌ |
| Verify drug authenticity | Anyone — no login required |

---

## Pages / Screens (10 total)

### 1. Login / Wallet Connect
- MetaMask connect button
- Registration form for new wallets (name, SAP code, role, drug license no, city)
- Pending approval screen

### 2. Admin Dashboard
- Stats: total pharmacies, total orders, in-transit, open disputes, cold chain alerts
- Live order pipeline: Factory → CFA → Distributor → Stockist → Pharmacy with counts
- Cold chain alert panel (orders where temperature exceeded threshold)
- Recent orders table
- Claude AI anomaly alerts

### 3. SAP Import / Batch Registration
- CSV upload matching SAP export format
- Batch registration form: drug, batch number, manufacture date, expiry, quantity, upload lab report to IPFS
- Mock SAP data generator for demo

### 4. Order Tracking (role-filtered)
- Admin sees all; others see own orders
- Filters: status, date, drug name, batch number
- Table: Order Code, From, To, Drug Count, Amount, Status, Temperature, Date
- Click → Order Detail with items, timeline, blockchain proof

### 5. Create Order / Dispatch
- Select destination (CFA/distributor/stockist/pharmacy)
- Add drugs: search by name or SAP code, select batch, enter quantity
- Log temperature at dispatch
- On submit: blockchain write + QR code generated
- Print QR for delivery carton

### 6. QR Scan & Confirm Delivery
- Camera scan using html5-qrcode
- Shows expected drugs + quantities
- Enter received quantity per item
- Log temperature at receipt
- If temp > max_temp → auto-flag cold chain break
- If qty mismatch → auto-raise dispute
- Confirm → blockchain write

### 7. Batch Tracking Page
- Search by batch number
- Shows: drug name, manufacture date, expiry, full journey from factory to current location
- Expiry countdown: "This batch expires in 14 days"
- All orders containing this batch listed with status

### 8. Disputes Page
- Raise: select order, reason (including COLD_CHAIN_BREAK and COUNTERFEIT_SUSPECT), upload photo
- Admin: side-by-side blockchain evidence, resolve/reject
- Dispute reasons specific to pharma

### 9. Analytics + AI Dashboard
- Order fulfilment rate by distributor (bar chart)
- Cold chain violation heatmap by region
- Drug movement by SKU (which drugs move fastest)
- Expiry risk alerts: "47 units of Batch 4122Z001A expire in 21 days, still at Distributor SAP-310002"
- Claude AI: anomaly detection, route summaries, demand forecasting, expiry prediction

### 10. Public Drug Verification
- No login required
- Scan QR or enter order code
- Shows: drug name, batch, manufacture/expiry dates, full chain of custody
- Green "Verified — Authentic Drug" or Red "Not Found — Potential Counterfeit"
- Temperature history: was cold chain maintained?

---

## QR Code — What It Contains

QR goes on the **delivery slip / carton** — NOT on individual medicine strips.

```json
{
  "order_code": "TC-4821",
  "bill_number": "INV-28934",
  "from_sap": "310001",
  "from_name": "Pune Region Distributor",
  "to_sap": "520034",
  "to_name": "HealthFirst Pharmacy, Baner",
  "items": [
    {
      "material_sap": "5001001",
      "name": "Covishield 0.5ml",
      "batch": "4122Z001A",
      "qty": 50,
      "expiry": "2027-03-15",
      "requires_cold_chain": true
    },
    {
      "material_sap": "5001045",
      "name": "Paracetamol 500mg",
      "batch": "PAR2026B",
      "qty": 200,
      "expiry": "2028-06-01",
      "requires_cold_chain": false
    }
  ],
  "dispatch_date": "2026-08-13",
  "temperature_at_dispatch": 4.2,
  "total_amount": 15600.00,
  "blockchain_tx": "0x789abc..."
}
```

---

## Mock SAP Module

Since we don't have Serum Institute's actual SAP, we build a mock:

### CSV Import Format
```
SAP Code, SAP Name, Sale Date, Bill Number, MaterialSAPCode, Drug Name, Batch Number, Quantity, Amount, Requires Cold Chain
310001, Pune Region Distributor, 13-08-2026, INV-28934, 5001001, Covishield 0.5ml, 4122Z001A, 50, 12500.00, Yes
310001, Pune Region Distributor, 13-08-2026, INV-28934, 5001045, Paracetamol 500mg, PAR2026B, 200, 3100.00, No
```

### Seed Data
- 1 admin (Serum Institute HQ)
- 2 C&F agents
- 3 distributors (Pune, Mumbai, Nashik)
- 5 stockists
- 15 pharmacies/medical stores
- 20 drugs (vaccines, tablets, syrups, injections)
- 50 historical orders across 3 months

---

## Claude AI Features

### 1. Anomaly Detection
- Orders stuck in DISPATCHED > 5 days
- Distributors with abnormally high dispute rates
- Sudden volume spikes (potential hoarding before shortage)
- Cold chain violations clustered at specific distributors

### 2. Route Performance Summary
- Weekly summary per distribution route
- Delivery success rate, avg time, dispute rate
- Temperature compliance rate per route

### 3. Expiry Risk Prediction
- Batches nearing expiry that haven't moved from distributor
- "Batch PAR2026B has 200 units expiring in 21 days, still at Distributor SAP-310002 — flag for immediate dispatch or recall"

### 4. Demand Forecasting
- Predict next month's demand per drug per region
- Seasonal patterns (flu season → paracetamol surge)

---

## Project Structure

```
tradechain/
├── contracts/
│   ├── UserRegistry.sol
│   ├── OrderTracking.sol
│   ├── DisputeManager.sol
│   └── SchemeRegistry.sol
├── test/
│   ├── UserRegistry.test.js
│   ├── OrderTracking.test.js
│   ├── DisputeManager.test.js
│   └── SchemeRegistry.test.js
├── scripts/
│   ├── deploy.js
│   └── seed-admin.js
├── backend/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── products.js          # drugs/medicines
│   │   ├── batches.js           # batch registration + tracking
│   │   ├── orders.js
│   │   ├── disputes.js
│   │   ├── schemes.js
│   │   ├── mock-sap.js
│   │   ├── analytics.js
│   │   ├── claude.js
│   │   └── public.js
│   ├── services/
│   │   ├── blockchain.js
│   │   ├── qr.js
│   │   ├── csv-parser.js
│   │   ├── db.js
│   │   ├── claude.js
│   │   └── temperature.js       # cold chain validation
│   ├── middleware/
│   │   ├── auth.js
│   │   └── requireRole.js
│   ├── scripts/
│   │   ├── create-tables.sql
│   │   └── seed-data.js
│   ├── abi/
│   ├── index.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── SAPImport.jsx
│   │   │   │   ├── BatchRegister.jsx
│   │   │   │   ├── Orders.jsx
│   │   │   │   ├── OrderDetail.jsx
│   │   │   │   ├── Disputes.jsx
│   │   │   │   ├── Schemes.jsx
│   │   │   │   ├── Analytics.jsx
│   │   │   │   └── Users.jsx
│   │   │   ├── cfa/
│   │   │   │   └── Dashboard.jsx
│   │   │   ├── distributor/
│   │   │   │   └── Dashboard.jsx
│   │   │   ├── stockist/
│   │   │   │   └── Dashboard.jsx
│   │   │   ├── pharmacy/
│   │   │   │   └── Dashboard.jsx
│   │   │   └── public/
│   │   │       ├── Verify.jsx
│   │   │       └── BatchTrack.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── QRDisplay.jsx
│   │   │   ├── QRScanner.jsx
│   │   │   ├── OrderTimeline.jsx
│   │   │   ├── TemperatureLog.jsx
│   │   │   ├── ExpiryBadge.jsx
│   │   │   ├── ColdChainAlert.jsx
│   │   │   ├── StatsCard.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── CSVUploader.jsx
│   │   ├── hooks/
│   │   │   ├── useWallet.js
│   │   │   ├── useAuth.js
│   │   │   └── useApi.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── App.jsx
│   └── package.json
├── hardhat.config.js
├── .env.example
├── TRADECHAIN.md               # THIS FILE
└── README.md
```

---

## Build Phases

| Phase | What | Time |
|-------|------|------|
| 1 | Smart contracts + tests | 2-3 days |
| 2 | Backend API + PostgreSQL + mock SAP + batch tracking + cold chain | 3-4 days |
| 3 | Frontend auth + admin dashboard + SAP import | 2-3 days |
| 4 | Order tracking + QR scan + dispatch + temperature logging | 3-4 days |
| 5 | Disputes + schemes + batch tracking page | 2-3 days |
| 6 | Analytics + Claude AI (anomaly, expiry, cold chain alerts) | 3-4 days |
| 7 | Public verification + polish + testing | 2-3 days |

---

## Paper & Patent Scope

### Research Paper
- **Title:** "Blockchain-Based Drug Supply Chain Traceability with Cold Chain Monitoring and LLM-Powered Anomaly Detection"
- **Novel contribution:** Order-level (not product-level) blockchain tracking for pharma distribution with integrated cold chain and AI
- **Target:** IEEE ICBC, ACM Blockchain, Journal of Pharmaceutical Sciences, IJPP

### Patents
1. "System and method for QR-encoded blockchain-verified drug order tracking in pharmaceutical distribution networks"
2. "Automated cold chain violation detection via smart contract with temperature threshold enforcement"
3. "AI-augmented pharmaceutical supply chain monitoring with predictive expiry and anomaly alerting"

---

## Three Pitch Points

1. **The Blind Spot That Kills** — Serum Institute ships millions of vaccine doses. SAP tells them what left the factory. But did that Covishield batch reach the pharmacy at 4°C or 25°C? Did the pharmacy get 50 vials or 45? Nobody knows. Our system makes every delivery verifiable.

2. **Unique Tech Combination** — No existing system combines Ethereum smart contracts for tamper-proof order tracking, SAP integration for plug-and-play deployment, cold chain temperature logging on-chain, AND Claude AI for real-time anomaly detection. This combination does not exist in published literature or patents.

3. **Zero Hardware Investment** — The pharmacist scans a QR on the delivery carton with their existing phone, enters the temperature reading, confirms quantities. That's it. No blockchain wallet knowledge needed, no barcode scanners, no IoT devices (though IoT-ready for future).

---

## Environment Variables

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/tradechain
PORT=3001
SEPOLIA_RPC_URL=
DEPLOYER_PRIVATE_KEY=
USER_REGISTRY_ADDRESS=
ORDER_TRACKING_ADDRESS=
DISPUTE_MANAGER_ADDRESS=
SCHEME_REGISTRY_ADDRESS=
ANTHROPIC_API_KEY=
PINATA_API_KEY=
PINATA_SECRET=
```

---

## Demo Scenario

1. Admin registers Covishield vaccine batch (4122Z001A, mfg Aug 2026, exp Mar 2027, cold chain required, max 8°C)
2. Admin imports SAP CSV with 10 orders
3. CFA agent dispatches 50 vials to Pune Region Distributor — temperature logged at 3.5°C — QR generated
4. Distributor scans QR, confirms receipt at 4.2°C — blockchain records
5. Distributor creates order for HealthFirst Pharmacy — 20 vials + 100 Paracetamol — QR generated
6. Pharmacy owner scans QR — enters received: 18 vials (2 missing!) — temp: 4.8°C — confirms
7. System auto-raises dispute for 2 missing vials — blockchain proof
8. Admin sees dispute — blockchain shows dispatched 20, received 18 — resolves
9. Claude AI generates alert: "Distributor SAP-310001 has 3 cold chain violations this week — investigate storage conditions"
10. Claude AI warns: "Batch PAR2026B — 150 units expire in 18 days, still at Stockist SAP-410003"
11. Random person scans QR on pharmacy shelf → Public page shows: "Verified Authentic — Covishield, Batch 4122Z001A, manufactured Aug 2026, cold chain maintained throughout"
