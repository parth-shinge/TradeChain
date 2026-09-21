require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../services/db');

async function main() {
  try {
    console.log('=== TradeChain Seed Script ===\n');

    // ────────────── CLEAR EXISTING DATA ──────────────
    console.log('Clearing existing data...');
    const tables = ['claude_logs', 'disputes', 'order_items', 'orders', 'batches', 'schemes', 'products', 'users'];
    for (const t of tables) {
      await db.query(`DELETE FROM ${t}`);
    }
    console.log('All tables cleared.\n');

    // ────────────── 1. USERS (26 total) ──────────────
    console.log('Inserting 26 users...');
    const users = [
      // [sap_code, sap_name, role, city, region, wallet_address, drug_license_no, mobile_no]
      ['SAP-100001', 'TradeChain Admin HQ', 'ADMIN', 'Pune', 'Maharashtra West', '0xA100000000000000000000000000000000000001', 'DL-ADMIN-001', '9800000001'],
      ['SAP-200001', 'Pune CFA', 'CFA', 'Pune', 'Maharashtra West', '0xC200000000000000000000000000000000000001', 'DL-CFA-001', '9800000002'],
      ['SAP-200002', 'Mumbai CFA', 'CFA', 'Mumbai', 'Maharashtra West', '0xC200000000000000000000000000000000000002', 'DL-CFA-002', '9800000003'],
      ['SAP-310001', 'Pune Region Distributor', 'DISTRIBUTOR', 'Pune', 'Maharashtra West', '0xD310000000000000000000000000000000000001', 'DL-DIST-001', '9800000004'],
      ['SAP-310002', 'Mumbai Region Distributor', 'DISTRIBUTOR', 'Mumbai', 'Maharashtra West', '0xD310000000000000000000000000000000000002', 'DL-DIST-002', '9800000005'],
      ['SAP-310003', 'Nashik Region Distributor', 'DISTRIBUTOR', 'Nashik', 'Maharashtra North', '0xD310000000000000000000000000000000000003', 'DL-DIST-003', '9800000006'],
      ['SAP-410001', 'Pune City Stockist', 'STOCKIST', 'Pune', 'Maharashtra West', '0xE410000000000000000000000000000000000001', 'DL-STK-001', '9800000007'],
      ['SAP-410002', 'Mumbai Central Stockist', 'STOCKIST', 'Mumbai', 'Maharashtra West', '0xE410000000000000000000000000000000000002', 'DL-STK-002', '9800000008'],
      ['SAP-410003', 'Nashik Central Stockist', 'STOCKIST', 'Nashik', 'Maharashtra North', '0xE410000000000000000000000000000000000003', 'DL-STK-003', '9800000009'],
      ['SAP-410004', 'Pune Suburban Stockist', 'STOCKIST', 'Pune', 'Maharashtra West', '0xE410000000000000000000000000000000000004', 'DL-STK-004', '9800000010'],
      ['SAP-410005', 'Mumbai North Stockist', 'STOCKIST', 'Mumbai', 'Maharashtra West', '0xE410000000000000000000000000000000000005', 'DL-STK-005', '9800000011'],
      ['SAP-520001', 'HealthFirst Pharmacy, Baner', 'PHARMACY', 'Pune', 'Maharashtra West', '0xF520000000000000000000000000000000000001', 'DL-PH-001', '9800000012'],
      ['SAP-520002', 'MedPlus, Kothrud', 'PHARMACY', 'Pune', 'Maharashtra West', '0xF520000000000000000000000000000000000002', 'DL-PH-002', '9800000013'],
      ['SAP-520003', 'Apollo Pharmacy, Andheri', 'PHARMACY', 'Mumbai', 'Maharashtra West', '0xF520000000000000000000000000000000000003', 'DL-PH-003', '9800000014'],
      ['SAP-520004', 'Wellness Forever, Dadar', 'PHARMACY', 'Mumbai', 'Maharashtra West', '0xF520000000000000000000000000000000000004', 'DL-PH-004', '9800000015'],
      ['SAP-520005', 'NetMeds Store, Viman Nagar', 'PHARMACY', 'Pune', 'Maharashtra West', '0xF520000000000000000000000000000000000005', 'DL-PH-005', '9800000016'],
      ['SAP-520006', 'Jan Aushadhi, Hadapsar', 'PHARMACY', 'Pune', 'Maharashtra West', '0xF520000000000000000000000000000000000006', 'DL-PH-006', '9800000017'],
      ['SAP-520007', 'MediBuddy Pharmacy, Hinjewadi', 'PHARMACY', 'Pune', 'Maharashtra West', '0xF520000000000000000000000000000000000007', 'DL-PH-007', '9800000018'],
      ['SAP-520008', 'CarePoint Pharmacy, Deccan', 'PHARMACY', 'Pune', 'Maharashtra West', '0xF520000000000000000000000000000000000008', 'DL-PH-008', '9800000019'],
      ['SAP-520009', 'Noble Pharmacy, Camp', 'PHARMACY', 'Pune', 'Maharashtra West', '0xF520000000000000000000000000000000000009', 'DL-PH-009', '9800000020'],
      ['SAP-520010', 'Sai Medical, Nashik Road', 'PHARMACY', 'Nashik', 'Maharashtra North', '0xF520000000000000000000000000000000000010', 'DL-PH-010', '9800000021'],
      ['SAP-520011', 'City Drug Store, Nashik', 'PHARMACY', 'Nashik', 'Maharashtra North', '0xF520000000000000000000000000000000000011', 'DL-PH-011', '9800000022'],
      ['SAP-520012', 'Lifeline Pharmacy, Pimpri', 'PHARMACY', 'Pune', 'Maharashtra West', '0xF520000000000000000000000000000000000012', 'DL-PH-012', '9800000023'],
      ['SAP-520013', 'Sanjeevani Medical, Chinchwad', 'PHARMACY', 'Pune', 'Maharashtra West', '0xF520000000000000000000000000000000000013', 'DL-PH-013', '9800000024'],
      ['SAP-520014', 'Global Pharmacy, Borivali', 'PHARMACY', 'Mumbai', 'Maharashtra West', '0xF520000000000000000000000000000000000014', 'DL-PH-014', '9800000025'],
      ['SAP-520015', 'Star Pharmacy, Thane', 'PHARMACY', 'Mumbai', 'Maharashtra West', '0xF520000000000000000000000000000000000015', 'DL-PH-015', '9800000026'],
    ];

    for (const u of users) {
      await db.query(
        `INSERT INTO users (sap_code, sap_name, role, city, region, wallet_address, drug_license_no, mobile_no, approved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
        u
      );
    }
    console.log(`  ✓ ${users.length} users inserted.\n`);

    // ────────────── 2. PRODUCTS (20 total) ──────────────
    console.log('Inserting 20 products...');
    const products = [
      // [material_sap_code, drug_name, generic_name, hsn_code, category, requires_cold_chain, max_temp_celsius, shelf_life_days, schedule]
      ['5001001', 'Covishield 0.5ml', 'COVID-19 Vaccine', '30021090', 'VACCINE', true, 8, 180, 'Schedule X'],
      ['5001002', 'BCG Vaccine', 'Bacillus Calmette-Guerin', '30021010', 'VACCINE', true, 8, 365, 'Schedule X'],
      ['5001003', 'Hepatitis B Vaccine', 'Hepatitis B Surface Antigen', '30021020', 'VACCINE', true, 8, 730, 'Schedule X'],
      ['5001004', 'Rabies Vaccine', 'Inactivated Rabies Virus', '30021030', 'VACCINE', true, 8, 365, 'Schedule X'],
      ['5001005', 'Typhoid Vaccine', 'Vi Polysaccharide', '30021040', 'VACCINE', true, 8, 730, 'Schedule X'],
      ['5001010', 'Paracetamol 500mg', 'Paracetamol', '30049099', 'TABLET', false, null, 730, 'Schedule H'],
      ['5001011', 'Amoxicillin 500mg', 'Amoxicillin Trihydrate', '30041090', 'TABLET', false, null, 730, 'Schedule H'],
      ['5001012', 'Azithromycin 250mg', 'Azithromycin Dihydrate', '30042090', 'TABLET', false, null, 730, 'Schedule H1'],
      ['5001013', 'Metformin 500mg', 'Metformin Hydrochloride', '30049039', 'TABLET', false, null, 730, 'Schedule H'],
      ['5001014', 'Ciprofloxacin 500mg', 'Ciprofloxacin HCl', '30042010', 'TABLET', false, null, 730, 'Schedule H1'],
      ['5001015', 'Cetirizine 10mg', 'Cetirizine Dihydrochloride', '30049042', 'TABLET', false, null, 730, 'Schedule H'],
      ['5001016', 'Omeprazole 20mg', 'Omeprazole', '30049049', 'TABLET', false, null, 730, 'Schedule H'],
      ['5001020', 'Cough Syrup 100ml', 'Dextromethorphan + Guaifenesin', '30049050', 'SYRUP', false, null, 730, 'Schedule H'],
      ['5001021', 'ORS Solution', 'Oral Rehydration Salts', '30049060', 'SYRUP', false, null, 365, 'OTC'],
      ['5001025', 'Insulin 40IU', 'Human Insulin', '30043010', 'INJECTION', true, 8, 365, 'Schedule H'],
      ['5001026', 'Vitamin B12 Injection', 'Cyanocobalamin', '30049070', 'INJECTION', false, null, 730, 'Schedule H'],
      ['5001030', 'Betadine Ointment', 'Povidone-Iodine', '30049080', 'OINTMENT', false, null, 730, 'OTC'],
      ['5001035', 'Rapid Antigen Test Kit', 'SARS-CoV-2 Antigen', '38220090', 'DIAGNOSTIC', false, null, 365, 'IVD'],
      ['5001036', 'Blood Glucose Strip', 'Glucose Oxidase', '38220010', 'DIAGNOSTIC', false, null, 365, 'IVD'],
      ['5001037', 'Urine Test Strip', 'Reagent Strip', '38220020', 'DIAGNOSTIC', false, null, 365, 'IVD'],
    ];

    // Insert products and collect their IDs for batch inserts
    const productIds = {};
    for (const p of products) {
      const res = await db.query(
        `INSERT INTO products (material_sap_code, drug_name, generic_name, hsn_code, category, requires_cold_chain, max_temp_celsius, shelf_life_days, schedule)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        p
      );
      productIds[p[0]] = res.rows[0].id;
    }
    console.log(`  ✓ ${products.length} products inserted.\n`);

    // ────────────── 3. BATCHES (10 total) ──────────────
    console.log('Inserting 10 batches...');
    const batches = [
      // [batch_number, material_sap_code_ref, manufacture_date, expiry_date, quantity_manufactured]
      ['COV2026A', '5001001', '2026-06-01', '2027-06-01', 10000],
      ['COV2026B', '5001001', '2026-07-15', '2027-07-15', 8000],
      ['BCG2026A', '5001002', '2026-05-01', '2027-05-01', 5000],
      ['HEP2026A', '5001003', '2026-04-01', '2027-04-01', 6000],
      ['PAR2026A', '5001010', '2026-03-01', '2028-03-01', 50000],
      ['PAR2026B', '5001010', '2026-06-01', '2028-06-01', 40000],
      ['AMX2026A', '5001011', '2026-05-15', '2028-05-15', 30000],
      ['INS2026A', '5001025', '2026-07-01', '2027-07-01', 3000],
      ['COU2026A', '5001020', '2026-06-01', '2028-06-01', 15000],
      ['AZT2026A', '5001012', '2026-04-15', '2028-04-15', 25000],
    ];

    for (const b of batches) {
      const pId = productIds[b[1]];
      await db.query(
        `INSERT INTO batches (batch_number, product_id, manufacture_date, expiry_date, quantity_manufactured)
         VALUES ($1, $2, $3, $4, $5)`,
        [b[0], pId, b[2], b[3], b[4]]
      );
    }
    console.log(`  ✓ ${batches.length} batches inserted.\n`);

    // ────────────── 4. ORDERS (50 total) + ORDER_ITEMS + DISPUTES ──────────────
    console.log('Inserting 50 orders with items and disputes...');

    // Supply chain flow pairs: [from_sap, to_sap, order_level]
    const flows = [
      ['SAP-100001', 'SAP-200001', 'PRIMARY'],   // Admin -> Pune CFA
      ['SAP-100001', 'SAP-200002', 'PRIMARY'],   // Admin -> Mumbai CFA
      ['SAP-200001', 'SAP-310001', 'PRIMARY'],   // Pune CFA -> Pune Dist
      ['SAP-200002', 'SAP-310002', 'PRIMARY'],   // Mumbai CFA -> Mumbai Dist
      ['SAP-200001', 'SAP-310003', 'PRIMARY'],   // Pune CFA -> Nashik Dist
      ['SAP-310001', 'SAP-410001', 'SECONDARY'], // Pune Dist -> Pune Stockist
      ['SAP-310001', 'SAP-410004', 'SECONDARY'], // Pune Dist -> Pune Sub Stockist
      ['SAP-310002', 'SAP-410002', 'SECONDARY'], // Mumbai Dist -> Mumbai Stockist
      ['SAP-310002', 'SAP-410005', 'SECONDARY'], // Mumbai Dist -> Mumbai N Stockist
      ['SAP-310003', 'SAP-410003', 'SECONDARY'], // Nashik Dist -> Nashik Stockist
      ['SAP-410001', 'SAP-520001', 'TERTIARY'],  // Pune Stockist -> Pharmacy
      ['SAP-410001', 'SAP-520002', 'TERTIARY'],
      ['SAP-410002', 'SAP-520003', 'TERTIARY'],
      ['SAP-410002', 'SAP-520004', 'TERTIARY'],
      ['SAP-410003', 'SAP-520010', 'TERTIARY'],
      ['SAP-410004', 'SAP-520005', 'TERTIARY'],
      ['SAP-410004', 'SAP-520006', 'TERTIARY'],
      ['SAP-410005', 'SAP-520014', 'TERTIARY'],
      ['SAP-410005', 'SAP-520015', 'TERTIARY'],
      ['SAP-410003', 'SAP-520011', 'TERTIARY'],
    ];

    // Product data for items
    const coldChainDrugs = [
      { sap: '5001001', name: 'Covishield 0.5ml', batch: 'COV2026A', expiry: '2027-06-01' },
      { sap: '5001002', name: 'BCG Vaccine', batch: 'BCG2026A', expiry: '2027-05-01' },
      { sap: '5001003', name: 'Hepatitis B Vaccine', batch: 'HEP2026A', expiry: '2027-04-01' },
      { sap: '5001025', name: 'Insulin 40IU', batch: 'INS2026A', expiry: '2027-07-01' },
    ];
    const normalDrugs = [
      { sap: '5001010', name: 'Paracetamol 500mg', batch: 'PAR2026A', expiry: '2028-03-01' },
      { sap: '5001011', name: 'Amoxicillin 500mg', batch: 'AMX2026A', expiry: '2028-05-15' },
      { sap: '5001012', name: 'Azithromycin 250mg', batch: 'AZT2026A', expiry: '2028-04-15' },
      { sap: '5001020', name: 'Cough Syrup 100ml', batch: 'COU2026A', expiry: '2028-06-01' },
      { sap: '5001013', name: 'Metformin 500mg', batch: 'PAR2026B', expiry: '2028-06-01' },
    ];

    for (let i = 1; i <= 50; i++) {
      const orderCode = `TC-${i.toString().padStart(4, '0')}`;
      const flow = flows[(i - 1) % flows.length];
      const fromSap = flow[0];
      const toSap = flow[1];
      const orderLevel = flow[2];
      const billNumber = `BILL-2026-${i.toString().padStart(5, '0')}`;

      // Determine status
      let status;
      if (i <= 35) status = 'DELIVERED';
      else if (i <= 45) status = 'DISPATCHED';
      else status = 'DISPUTED';

      // Cold chain for even orders in first 35, and for disputed 46-47
      const isColdChain = (i <= 35 && i % 3 === 0) || i === 46 || i === 47;
      const tempDispatch = isColdChain ? (3 + Math.random() * 2).toFixed(1) : (22 + Math.random() * 4).toFixed(1);

      let tempReceipt = null;
      if (status === 'DELIVERED') {
        tempReceipt = isColdChain ? (4 + Math.random() * 2).toFixed(1) : (23 + Math.random() * 3).toFixed(1);
      } else if (i === 46) {
        tempReceipt = 12.5; // Cold chain break
      } else if (i === 47) {
        tempReceipt = 15.0; // Cold chain break
      } else if (i === 48 || i === 49 || i === 50) {
        tempReceipt = isColdChain ? 5.0 : 24.0;
      }

      const totalAmount = (500 + Math.random() * 9500).toFixed(2);
      const saleDate = new Date(2026, 5 + Math.floor(i / 15), 1 + (i % 28));

      const orderRes = await db.query(
        `INSERT INTO orders (order_code, bill_number, from_sap_code, to_sap_code, order_level, sale_date, total_amount, status, temperature_at_dispatch, temperature_at_receipt, dispatch_timestamp, delivery_timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [
          orderCode, billNumber, fromSap, toSap, orderLevel, saleDate, totalAmount, status,
          tempDispatch, tempReceipt,
          new Date(saleDate.getTime()),
          (status === 'DELIVERED' || status === 'DISPUTED') ? new Date(saleDate.getTime() + 86400000 * (1 + Math.floor(Math.random() * 3))) : null,
        ]
      );

      const orderId = orderRes.rows[0].id;

      // Insert 1-3 order items
      const itemCount = 1 + (i % 3);
      for (let j = 0; j < itemCount; j++) {
        const drug = isColdChain
          ? coldChainDrugs[j % coldChainDrugs.length]
          : normalDrugs[j % normalDrugs.length];

        const qtyDispatched = 50 + Math.floor(Math.random() * 150);
        let qtyReceived = null;
        let qtyMismatch = 0;

        if (status === 'DELIVERED') {
          qtyReceived = qtyDispatched;
          qtyMismatch = 0;
        } else if (i === 48 && j === 0) {
          // Quantity mismatch dispute
          qtyReceived = qtyDispatched - 10;
          qtyMismatch = 10;
        } else if (status === 'DISPUTED') {
          qtyReceived = qtyDispatched;
          qtyMismatch = 0;
        }

        const itemAmount = (parseFloat(totalAmount) / itemCount).toFixed(2);

        await db.query(
          `INSERT INTO order_items (order_id, material_sap_code, drug_name, batch_number, quantity_dispatched, quantity_received, quantity_mismatch, expiry_date, amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [orderId, drug.sap, drug.name, drug.batch, qtyDispatched, qtyReceived, qtyMismatch, drug.expiry, itemAmount]
        );
      }

      // Insert disputes for orders 46-50
      if (status === 'DISPUTED') {
        let reason, description;
        if (i === 46) {
          reason = 'COLD_CHAIN_BREAK';
          description = 'Temperature at receipt was 12.5°C, exceeding 8°C maximum for Covishield vaccine';
        } else if (i === 47) {
          reason = 'COLD_CHAIN_BREAK';
          description = 'Temperature at receipt was 15.0°C, exceeding 8°C maximum for BCG vaccine';
        } else if (i === 48) {
          reason = 'QUANTITY_MISMATCH';
          description = 'Received 10 fewer units of Paracetamol 500mg than dispatched';
        } else if (i === 49) {
          reason = 'EXPIRED';
          description = 'Batch PAR2026A received past expiry date';
        } else {
          reason = 'DAMAGED';
          description = 'Outer packaging damaged, 5 strips of Amoxicillin crushed';
        }

        await db.query(
          `INSERT INTO disputes (order_id, raised_by_sap_code, reason, description, status)
           VALUES ($1, $2, $3, $4, 'OPEN')`,
          [orderId, toSap, reason, description]
        );
      }

      if (i % 10 === 0) console.log(`  ... ${i}/50 orders inserted`);
    }

    console.log('  ✓ 50 orders with items inserted.');
    console.log('  ✓ 5 disputes inserted (2 COLD_CHAIN_BREAK, 1 QUANTITY_MISMATCH, 1 EXPIRED, 1 DAMAGED).\n');

    console.log('=== Seed completed successfully! ===');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await db.pool.end();
    process.exit(0);
  }
}

main();
