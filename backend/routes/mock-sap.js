const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const multer = require('multer');
const { parseCSV, groupByBill } = require('../services/csv-parser');
const upload = multer({ storage: multer.memoryStorage() });
const crypto = require('crypto');

router.use(auth);

// POST /import — upload CSV, parse, create orders
router.post('/import', requireRole(['ADMIN']), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const client = await db.getClient();
  try {
    // parseCSV accepts Buffer or string file path — pass the Buffer directly
    const records = await parseCSV(req.file.buffer);
    // groupByBill takes array of parsed rows, returns array of grouped order objects
    const grouped = groupByBill(records);

    await client.query('BEGIN');

    const createdOrders = [];

    for (const group of grouped) {
      const orderCode = 'IMP-' + crypto.randomBytes(4).toString('hex').toUpperCase();

      const totalAmount = group.totalAmount || 0;

      const orderRes = await client.query(
        `INSERT INTO orders (order_code, bill_number, from_sap_code, to_sap_code, order_level, sale_date, total_amount, status)
         VALUES ($1, $2, $3, $4, 'PRIMARY', $5, $6, 'DISPATCHED') RETURNING *`,
        [orderCode, group.billNumber, group.sapCode, group.sapCode, group.saleDate || new Date(), totalAmount]
      );

      const orderId = orderRes.rows[0].id;

      for (const item of group.items) {
        await client.query(
          `INSERT INTO order_items (order_id, material_sap_code, drug_name, batch_number, quantity_dispatched, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.materialSAPCode, item.drugName || 'Unknown', item.batchNumber, item.quantity || 0, item.amount || 0]
        );
      }

      createdOrders.push(orderCode);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Import successful', importedOrders: createdOrders, count: createdOrders.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to import CSV' });
  } finally {
    client.release();
  }
});

// POST /generate — generate N random demo orders
router.post('/generate', requireRole(['ADMIN']), async (req, res) => {
  const { count = 10 } = req.body;
  const client = await db.getClient();

  // Pull real SAP codes from DB for realistic data
  try {
    const senderRes = await client.query(
      "SELECT sap_code FROM users WHERE role IN ('ADMIN','CFA','DISTRIBUTOR','STOCKIST') AND approved = true LIMIT 10"
    );
    const receiverRes = await client.query(
      "SELECT sap_code FROM users WHERE approved = true LIMIT 20"
    );
    const productRes = await client.query(
      "SELECT material_sap_code, drug_name FROM products LIMIT 20"
    );

    const senders = senderRes.rows.map(r => r.sap_code);
    const receivers = receiverRes.rows.map(r => r.sap_code);
    const products = productRes.rows;

    if (senders.length === 0 || receivers.length === 0) {
      client.release();
      return res.status(400).json({ error: 'No users in database. Run seed-data.js first.' });
    }

    await client.query('BEGIN');
    const createdOrders = [];

    for (let i = 0; i < count; i++) {
      const orderCode = 'GEN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const billNumber = 'BILL-' + Math.floor(Math.random() * 100000);
      const fromSap = senders[Math.floor(Math.random() * senders.length)];
      let toSap = receivers[Math.floor(Math.random() * receivers.length)];
      if (toSap === fromSap && receivers.length > 1) {
        toSap = receivers.find(r => r !== fromSap) || toSap;
      }
      const totalAmount = (Math.random() * 10000).toFixed(2);

      const orderRes = await client.query(
        `INSERT INTO orders (order_code, bill_number, from_sap_code, to_sap_code, order_level, sale_date, total_amount, status)
         VALUES ($1, $2, $3, $4, 'PRIMARY', CURRENT_DATE, $5, 'DISPATCHED') RETURNING *`,
        [orderCode, billNumber, fromSap, toSap, totalAmount]
      );

      const orderId = orderRes.rows[0].id;

      const itemCount = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < itemCount; j++) {
        const prod = products.length > 0
          ? products[Math.floor(Math.random() * products.length)]
          : { material_sap_code: 'MAT-MOCK', drug_name: 'Mock Drug' };
        await client.query(
          `INSERT INTO order_items (order_id, material_sap_code, drug_name, batch_number, quantity_dispatched, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, prod.material_sap_code, prod.drug_name, 'BATCH-GEN-' + j, Math.floor(1 + Math.random() * 100), (Math.random() * 1000).toFixed(2)]
        );
      }

      createdOrders.push(orderCode);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: `Generated ${count} orders`, orders: createdOrders });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Mock generate error:', error);
    res.status(500).json({ error: 'Failed to generate mock data' });
  } finally {
    client.release();
  }
});

module.exports = router;
