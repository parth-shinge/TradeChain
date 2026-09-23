const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const qrService = require('../services/qr');
const { validateTemperature } = require('../services/temperature');
const { createOrderOnChain, confirmDeliveryOnChain } = require('../services/blockchain');

// GET /:orderCode/qr — no auth needed (public QR endpoint)
router.get('/:orderCode/qr', async (req, res) => {
  try {
    const { orderCode } = req.params;
    const orderRes = await db.query('SELECT * FROM orders WHERE order_code = $1', [orderCode]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderRes.rows[0];
    const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    const qrBuffer = await qrService.generateQR(order, itemsRes.rows);
    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

// All remaining routes require auth
router.use(auth);

// POST / — create order
router.post('/', requireRole(['ADMIN', 'CFA', 'DISTRIBUTOR', 'STOCKIST']), async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { orderCode, billNumber, fromSapCode, toSapCode, orderLevel, saleDate, totalAmount, temperatureAtDispatch, items } = req.body;

    const qrPayload = qrService.buildQRPayload(
      { order_code: orderCode, bill_number: billNumber, from_sap_code: fromSapCode, to_sap_code: toSapCode, total_amount: totalAmount, temperature_at_dispatch: temperatureAtDispatch, sale_date: saleDate },
      items || []
    );

    const orderRes = await client.query(
      `INSERT INTO orders (order_code, bill_number, from_sap_code, to_sap_code, order_level, sale_date, total_amount, temperature_at_dispatch, dispatch_timestamp, qr_code_payload, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, 'DISPATCHED') RETURNING *`,
      [orderCode, billNumber, fromSapCode, toSapCode, orderLevel, saleDate, totalAmount, temperatureAtDispatch, JSON.stringify(qrPayload)]
    );

    const order = orderRes.rows[0];

    for (const item of (items || [])) {
      await client.query(
        `INSERT INTO order_items (order_id, material_sap_code, drug_name, batch_number, quantity_dispatched, expiry_date, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.materialSapCode, item.drugName, item.batchNumber, item.quantityDispatched, item.expiryDate, item.amount]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(order);

    // Fire-and-forget blockchain call
    const itemsHash = require('ethers').keccak256(require('ethers').toUtf8Bytes(JSON.stringify(items || [])));
    createOrderOnChain(
      orderCode, fromSapCode, toSapCode, itemsHash,
      totalAmount || 0, temperatureAtDispatch || 0, 8 // default max temp threshold
    ).then(async (result) => {
      if (result.success) {
        await db.query('UPDATE orders SET blockchain_tx_hash = $1, blockchain_status = $2 WHERE id = $3', [result.txHash, 'CONFIRMED', order.id]);
        console.log(`[Chain] Order ${orderCode} confirmed: ${result.txHash}`);
      } else {
        await db.query('UPDATE orders SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', result.error, order.id]);
        console.warn(`[Chain] Order ${orderCode} failed: ${result.error}`);
      }
    }).catch(async (err) => {
      await db.query('UPDATE orders SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', err.message, order.id]).catch(() => {});
      console.error(`[Chain] Order ${orderCode} error:`, err.message);
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// POST /:orderCode/confirm
router.post('/:orderCode/confirm', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { orderCode } = req.params;
    const { items, temperatureAtReceipt } = req.body;

    const orderRes = await client.query('SELECT * FROM orders WHERE order_code = $1', [orderCode]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];

    // Look up max temp from products for cold chain check
    const coldCheckRes = await client.query(
      `SELECT MAX(p.max_temp_celsius) as max_temp
       FROM order_items oi
       JOIN products p ON oi.material_sap_code = p.material_sap_code
       WHERE oi.order_id = $1 AND p.requires_cold_chain = true`,
      [order.id]
    );
    const maxTemp = coldCheckRes.rows[0] ? coldCheckRes.rows[0].max_temp : null;
    const tempCheck = validateTemperature(temperatureAtReceipt, maxTemp);
    const newStatus = tempCheck.violation ? 'DISPUTED' : 'DELIVERED';

    await client.query(
      'UPDATE orders SET status = $1, temperature_at_receipt = $2, delivery_timestamp = NOW() WHERE id = $3',
      [newStatus, temperatureAtReceipt, order.id]
    );

    for (const item of (items || [])) {
      const matchRes = await client.query(
        'SELECT * FROM order_items WHERE order_id = $1 AND material_sap_code = $2',
        [order.id, item.materialSapCode]
      );
      if (matchRes.rows.length > 0) {
        const orderItem = matchRes.rows[0];
        const mismatch = orderItem.quantity_dispatched - (item.quantityReceived || 0);
        await client.query(
          'UPDATE order_items SET quantity_received = $1, quantity_mismatch = $2 WHERE id = $3',
          [item.quantityReceived, mismatch, orderItem.id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Order confirmed', status: newStatus, temperatureCheck: tempCheck });

    // Fire-and-forget blockchain call
    const receivedItemsHash = require('ethers').keccak256(require('ethers').toUtf8Bytes(JSON.stringify(items || [])));
    confirmDeliveryOnChain(orderCode, receivedItemsHash, temperatureAtReceipt || 0)
      .then(async (result) => {
        if (result.success) {
          await db.query('UPDATE orders SET blockchain_tx_hash = $1, blockchain_status = $2 WHERE id = $3', [result.txHash, 'CONFIRMED', order.id]);
          console.log(`[Chain] Confirm ${orderCode}: ${result.txHash}`);
        } else {
          await db.query('UPDATE orders SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', result.error, order.id]);
          console.warn(`[Chain] Confirm ${orderCode} failed: ${result.error}`);
        }
      }).catch(async (err) => {
        await db.query('UPDATE orders SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', err.message, order.id]).catch(() => {});
        console.error(`[Chain] Confirm ${orderCode} error:`, err.message);
      });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to confirm order' });
  } finally {
    client.release();
  }
});

// GET /
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { role, sap_code } = req.user;

    let query = 'SELECT * FROM orders';
    const params = [];
    let paramIndex = 1;
    const conditions = [];

    if (role !== 'ADMIN') {
      conditions.push(`(from_sap_code = $${paramIndex} OR to_sap_code = $${paramIndex})`);
      params.push(sap_code);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

// GET /:orderCode
router.get('/:orderCode', async (req, res) => {
  try {
    const { orderCode } = req.params;

    const orderQuery = `
      SELECT o.*, u1.sap_name as from_user_name, u2.sap_name as to_user_name
      FROM orders o
      LEFT JOIN users u1 ON o.from_sap_code = u1.sap_code
      LEFT JOIN users u2 ON o.to_sap_code = u2.sap_code
      WHERE o.order_code = $1
    `;
    const { rows: orderRows } = await db.query(orderQuery, [orderCode]);

    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRows[0];
    const { rows: itemRows } = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = itemRows;

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get order details' });
  }
});

module.exports = router;
