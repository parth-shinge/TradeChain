const { query } = require("../services/db");

/**
 * Authentication middleware.
 * Extracts wallet address from x-wallet-address header,
 * looks up user in PostgreSQL, attaches user to req.user.
 * Returns 401 if wallet not found or user not approved.
 */
async function auth(req, res, next) {
  try {
    const walletAddress = req.headers["x-wallet-address"];

    if (!walletAddress) {
      return res.status(401).json({ error: "Missing x-wallet-address header" });
    }

    const result = await query(
      "SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)",
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Wallet address not registered" });
    }

    const user = result.rows[0];

    if (!user.approved) {
      return res.status(401).json({ error: "Account pending admin approval" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

module.exports = auth;
