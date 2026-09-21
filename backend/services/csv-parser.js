const fs = require("fs");
const csvParser = require("csv-parser");
const { Readable } = require("stream");

/**
 * Parse a pharma SAP CSV file or buffer.
 * Expected columns: SAP Code, SAP Name, Sale Date, Bill Number,
 *   MaterialSAPCode, Drug Name, Batch Number, Quantity, Amount, Requires Cold Chain
 *
 * @param {Buffer|string} input - CSV buffer or file path
 * @returns {Promise<Array<object>>} Parsed rows
 */
function parseCSV(input) {
  return new Promise((resolve, reject) => {
    const results = [];
    let stream;

    if (Buffer.isBuffer(input)) {
      stream = Readable.from(input.toString());
    } else if (typeof input === "string") {
      stream = fs.createReadStream(input);
    } else {
      return reject(new Error("Input must be a Buffer or file path string"));
    }

    stream
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header.trim(),
          mapValues: ({ value }) => value.trim(),
        })
      )
      .on("data", (row) => {
        results.push({
          sapCode: row["SAP Code"] || row["sap_code"] || "",
          sapName: row["SAP Name"] || row["sap_name"] || "",
          saleDate: row["Sale Date"] || row["sale_date"] || "",
          billNumber: row["Bill Number"] || row["bill_number"] || "",
          materialSAPCode: row["MaterialSAPCode"] || row["material_sap_code"] || "",
          drugName: row["Drug Name"] || row["drug_name"] || "",
          batchNumber: row["Batch Number"] || row["batch_number"] || "",
          quantity: parseInt(row["Quantity"] || row["quantity"] || "0", 10),
          amount: parseFloat(row["Amount"] || row["amount"] || "0"),
          requiresColdChain:
            (row["Requires Cold Chain"] || row["requires_cold_chain"] || "")
              .toLowerCase() === "yes",
        });
      })
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

/**
 * Group parsed CSV rows by bill number to create orders.
 * @param {Array<object>} rows - Parsed CSV rows
 * @returns {Array<object>} Grouped orders
 */
function groupByBill(rows) {
  const billMap = {};

  for (const row of rows) {
    const key = row.billNumber || `AUTO-${Date.now()}`;
    if (!billMap[key]) {
      billMap[key] = {
        billNumber: key,
        sapCode: row.sapCode,
        sapName: row.sapName,
        saleDate: row.saleDate,
        items: [],
        totalAmount: 0,
      };
    }
    billMap[key].items.push({
      materialSAPCode: row.materialSAPCode,
      drugName: row.drugName,
      batchNumber: row.batchNumber,
      quantity: row.quantity,
      amount: row.amount,
      requiresColdChain: row.requiresColdChain,
    });
    billMap[key].totalAmount += row.amount;
  }

  return Object.values(billMap);
}

module.exports = { parseCSV, groupByBill };
