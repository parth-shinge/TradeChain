/**
 * Blockchain service — ethers v6 contract connections.
 * Placeholder functions for each contract call.
 * Actual blockchain writes will be integrated in Phase 4.
 */
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Load ABIs
const loadABI = (filename) => {
  const abiPath = path.join(__dirname, "..", "abi", filename);
  if (fs.existsSync(abiPath)) {
    return JSON.parse(fs.readFileSync(abiPath, "utf8"));
  }
  console.warn(`ABI file not found: ${abiPath}`);
  return [];
};

const UserRegistryABI = loadABI("UserRegistry.json");
const OrderTrackingABI = loadABI("OrderTracking.json");
const DisputeManagerABI = loadABI("DisputeManager.json");
const SchemeRegistryABI = loadABI("SchemeRegistry.json");

// Provider and signer
let provider = null;
let signer = null;
let contracts = {};

function getProvider() {
  if (!provider) {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return provider;
}

function getSigner() {
  if (!signer && process.env.DEPLOYER_PRIVATE_KEY) {
    signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, getProvider());
  }
  return signer;
}

function getContract(name, address, abi) {
  if (!contracts[name] && address) {
    const s = getSigner();
    contracts[name] = s
      ? new ethers.Contract(address, abi, s)
      : new ethers.Contract(address, abi, getProvider());
  }
  return contracts[name] || null;
}

function getUserRegistry() {
  return getContract("UserRegistry", process.env.USER_REGISTRY_ADDRESS, UserRegistryABI);
}

function getOrderTracking() {
  return getContract("OrderTracking", process.env.ORDER_TRACKING_ADDRESS, OrderTrackingABI);
}

function getDisputeManager() {
  return getContract("DisputeManager", process.env.DISPUTE_MANAGER_ADDRESS, DisputeManagerABI);
}

function getSchemeRegistry() {
  return getContract("SchemeRegistry", process.env.SCHEME_REGISTRY_ADDRESS, SchemeRegistryABI);
}

// ──────────────── UserRegistry Functions ────────────────

async function registerUserOnChain(address, sapCode, sapName, role, drugLicenseNo) {
  const contract = getUserRegistry();
  if (!contract) return { success: false, error: "Contract not configured" };
  try {
    const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role + "_ROLE"));
    const tx = await contract.registerUser(address, sapCode, sapName, roleHash, drugLicenseNo || "");
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function revokeUserOnChain(address) {
  const contract = getUserRegistry();
  if (!contract) return { success: false, error: "Contract not configured" };
  try {
    const tx = await contract.revokeUser(address);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ──────────────── OrderTracking Functions ────────────────

async function createOrderOnChain(orderCode, fromSAP, toSAP, itemsHash, totalAmount, tempAtDispatch, maxTempThreshold) {
  const contract = getOrderTracking();
  if (!contract) return { success: false, error: "Contract not configured" };
  try {
    const tx = await contract.createOrder(
      orderCode, fromSAP, toSAP, itemsHash,
      BigInt(Math.round(totalAmount * 100)),
      Math.round(tempAtDispatch * 10),
      Math.round(maxTempThreshold * 10)
    );
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function confirmDeliveryOnChain(orderCode, receivedItemsHash, tempAtReceipt) {
  const contract = getOrderTracking();
  if (!contract) return { success: false, error: "Contract not configured" };
  try {
    const tx = await contract.confirmDelivery(
      orderCode, receivedItemsHash, Math.round(tempAtReceipt * 10)
    );
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getOrderOnChain(orderCode) {
  const contract = getOrderTracking();
  if (!contract) return null;
  try {
    return await contract.getOrder(orderCode);
  } catch (err) {
    return null;
  }
}

// ──────────────── DisputeManager Functions ────────────────

async function raiseDisputeOnChain(orderCode, reason, evidenceIpfsHash, raiserAddress) {
  const contract = getDisputeManager();
  if (!contract) return { success: false, error: "Contract not configured" };
  try {
    const tx = await contract.raiseDispute(orderCode, reason, evidenceIpfsHash || "", raiserAddress);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function resolveDisputeOnChain(disputeId, resolution) {
  const contract = getDisputeManager();
  if (!contract) return { success: false, error: "Contract not configured" };
  try {
    const tx = await contract.resolveDispute(disputeId, resolution);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function rejectDisputeOnChain(disputeId, reason) {
  const contract = getDisputeManager();
  if (!contract) return { success: false, error: "Contract not configured" };
  try {
    const tx = await contract.rejectDispute(disputeId, reason);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ──────────────── SchemeRegistry Functions ────────────────

async function createSchemeOnChain(title, productSAP, validFrom, validTo, termsHash) {
  const contract = getSchemeRegistry();
  if (!contract) return { success: false, error: "Contract not configured" };
  try {
    const tx = await contract.createScheme(
      title, productSAP,
      Math.floor(new Date(validFrom).getTime() / 1000),
      Math.floor(new Date(validTo).getTime() / 1000),
      ethers.keccak256(ethers.toUtf8Bytes(termsHash || ""))
    );
    const receipt = await tx.wait();
    
    // Parse SchemeCreated event to get the on-chain numeric schemeId
    let onChainSchemeId = null;
    const iface = new ethers.Interface(['event SchemeCreated(uint256 indexed schemeId, string title, string productSAP)']);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed.name === 'SchemeCreated') {
          onChainSchemeId = Number(parsed.args.schemeId);
          break;
        }
      } catch (e) { /* not this event */ }
    }
    
    return { success: true, txHash: receipt.hash, onChainSchemeId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function verifySchemeOnChain(schemeId) {
  const contract = getSchemeRegistry();
  if (!contract) return null;
  try {
    const [scheme, currentlyActive] = await contract.verifyScheme(schemeId);
    return { scheme, currentlyActive };
  } catch (err) {
    return null;
  }
}

module.exports = {
  getProvider, getSigner,
  getUserRegistry, getOrderTracking, getDisputeManager, getSchemeRegistry,
  registerUserOnChain, revokeUserOnChain,
  createOrderOnChain, confirmDeliveryOnChain, getOrderOnChain,
  raiseDisputeOnChain, resolveDisputeOnChain, rejectDisputeOnChain,
  createSchemeOnChain, verifySchemeOnChain,
};
