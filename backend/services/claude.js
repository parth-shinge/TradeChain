/**
 * Claude AI service — PLACEHOLDER
 * Will be replaced with real Anthropic API calls in Phase 6.
 */

/**
 * Detect anomalies in supply chain data.
 * @param {object} data - Supply chain data to analyze
 * @returns {Promise<object>}
 */
async function anomalyDetection(data) {
  return {
    status: "mock",
    anomalies: [
      {
        type: "STUCK_ORDER",
        severity: "HIGH",
        message: "Order TC-3001 has been DISPATCHED for 7 days without confirmation",
        orderCode: "TC-3001",
        recommendation: "Contact distributor SAP-310001 for delivery status update",
      },
      {
        type: "HIGH_DISPUTE_RATE",
        severity: "MEDIUM",
        message: "Distributor SAP-310002 has 40% dispute rate (above 15% threshold)",
        sapCode: "SAP-310002",
        recommendation: "Schedule quality audit for Mumbai Region Distributor",
      },
      {
        type: "COLD_CHAIN_CLUSTER",
        severity: "HIGH",
        message: "3 cold chain violations from Distributor SAP-310001 in past 7 days",
        sapCode: "SAP-310001",
        recommendation: "Inspect cold storage facilities at Pune Region Distributor",
      },
    ],
    generatedAt: new Date().toISOString(),
    note: "PLACEHOLDER — will use Anthropic Claude API in Phase 6",
  };
}

/**
 * Generate route performance summary.
 * @param {object} data - Route data
 * @returns {Promise<object>}
 */
async function routeSummary(data) {
  return {
    status: "mock",
    summary: {
      period: "Last 7 days",
      routes: [
        {
          from: "SAP-200001 (Pune CFA)",
          to: "SAP-310001 (Pune Region Dist.)",
          totalOrders: 12,
          deliveredOnTime: 10,
          avgDeliveryHours: 18.5,
          disputeRate: "8.3%",
          tempComplianceRate: "91.7%",
        },
        {
          from: "SAP-310001 (Pune Region Dist.)",
          to: "SAP-410001 (Pune City Stockist)",
          totalOrders: 8,
          deliveredOnTime: 7,
          avgDeliveryHours: 6.2,
          disputeRate: "12.5%",
          tempComplianceRate: "100%",
        },
      ],
    },
    generatedAt: new Date().toISOString(),
    note: "PLACEHOLDER — will use Anthropic Claude API in Phase 6",
  };
}

/**
 * Predict expiry risk for batches.
 * @param {object} data - Batch data
 * @returns {Promise<object>}
 */
async function expiryRisk(data) {
  return {
    status: "mock",
    alerts: [
      {
        severity: "CRITICAL",
        batchNumber: "PAR2026B",
        drugName: "Paracetamol 500mg",
        unitsRemaining: 150,
        expiresIn: "18 days",
        currentLocation: "Distributor SAP-310002",
        recommendation: "Immediate dispatch or initiate recall procedure",
      },
      {
        severity: "WARNING",
        batchNumber: "COV2026A",
        drugName: "Covishield 0.5ml",
        unitsRemaining: 200,
        expiresIn: "45 days",
        currentLocation: "Stockist SAP-410003",
        recommendation: "Prioritize distribution to pharmacies with high demand",
      },
    ],
    generatedAt: new Date().toISOString(),
    note: "PLACEHOLDER — will use Anthropic Claude API in Phase 6",
  };
}

/**
 * Generate demand forecast for drugs.
 * @param {object} data - Historical order data
 * @returns {Promise<object>}
 */
async function demandForecast(data) {
  return {
    status: "mock",
    forecast: {
      period: "Next 30 days",
      predictions: [
        {
          materialSapCode: "5001001",
          drugName: "Covishield 0.5ml",
          predictedDemand: 5000,
          confidence: "82%",
          trend: "STABLE",
          seasonalFactor: "Vaccination drive expected in October",
        },
        {
          materialSapCode: "5001010",
          drugName: "Paracetamol 500mg",
          predictedDemand: 25000,
          confidence: "91%",
          trend: "INCREASING",
          seasonalFactor: "Monsoon season — flu cases rising",
        },
      ],
    },
    generatedAt: new Date().toISOString(),
    note: "PLACEHOLDER — will use Anthropic Claude API in Phase 6",
  };
}

module.exports = { anomalyDetection, routeSummary, expiryRisk, demandForecast };
