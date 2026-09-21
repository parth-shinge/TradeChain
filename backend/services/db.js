const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client:", err);
  process.exit(-1);
});

/**
 * Execute a SQL query with optional parameters.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development") {
    console.log("Executed query", { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res;
};

/**
 * Get a client from the pool for transactions.
 */
const getClient = async () => {
  return pool.connect();
};

module.exports = { pool, query, getClient };
