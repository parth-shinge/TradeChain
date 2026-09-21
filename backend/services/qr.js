const QRCode = require("qrcode");

/**
 * Build the QR payload JSON for an order.
 * @param {object} order - Order data
 * @param {Array} items - Array of order items
 * @returns {object} QR payload
 */
function buildQRPayload(order, items) {
  return {
    order_code: order.order_code,
    bill_number: order.bill_number || "",
    from_sap: order.from_sap_code,
    from_name: order.from_name || "",
    to_sap: order.to_sap_code,
    to_name: order.to_name || "",
    items: (items || []).map((item) => ({
      material_sap: item.material_sap_code,
      name: item.drug_name,
      batch: item.batch_number || "",
      qty: item.quantity_dispatched,
      expiry: item.expiry_date || "",
      requires_cold_chain: item.requires_cold_chain || false,
    })),
    dispatch_date: order.sale_date || new Date().toISOString().split("T")[0],
    temperature_at_dispatch: order.temperature_at_dispatch || null,
    total_amount: parseFloat(order.total_amount) || 0,
    blockchain_tx: order.blockchain_tx_hash || "",
  };
}

/**
 * Generate QR code as PNG buffer from order data.
 * @param {object} order - Order data
 * @param {Array} items - Array of order items
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateQR(order, items) {
  const payload = buildQRPayload(order, items);
  const jsonStr = JSON.stringify(payload);
  const buffer = await QRCode.toBuffer(jsonStr, {
    type: "png",
    width: 400,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  return buffer;
}

/**
 * Generate QR code as data URL string.
 * @param {object} order - Order data
 * @param {Array} items - Array of order items
 * @returns {Promise<string>} Data URL
 */
async function generateQRDataURL(order, items) {
  const payload = buildQRPayload(order, items);
  const jsonStr = JSON.stringify(payload);
  return QRCode.toDataURL(jsonStr, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

module.exports = { buildQRPayload, generateQR, generateQRDataURL };
