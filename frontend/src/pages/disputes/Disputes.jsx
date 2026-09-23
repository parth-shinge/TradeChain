import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuthContext } from '../../context/AuthContext';
import DataTable from '../../components/DataTable';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import {
  ShieldExclamationIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  PhotoIcon,
  PlusIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import './Disputes.css';

const REASONS = [
  { value: 'COLD_CHAIN_BREAK', label: 'Cold Chain Break', icon: '🌡️' },
  { value: 'COUNTERFEIT_SUSPECT', label: 'Counterfeit Suspect', icon: '⚠️' },
  { value: 'QUANTITY_MISMATCH', label: 'Quantity Mismatch', icon: '📦' },
  { value: 'DAMAGED', label: 'Damaged', icon: '💔' },
  { value: 'EXPIRED', label: 'Expired', icon: '⏰' },
  { value: 'WRONG_PRODUCT', label: 'Wrong Product', icon: '🔄' },
];

function DisputeStatusBadge({ status }) {
  const cls = (status || '').toLowerCase();
  return <span className={`dispute-status ${cls}`}>{status}</span>;
}

function ReasonBadge({ reason }) {
  const r = REASONS.find((x) => x.value === reason);
  return (
    <span className="reason-badge">
      {r?.icon} {r?.label || reason}
    </span>
  );
}

// ─── Raise Dispute Modal ───────────────────────────────────────────
function RaiseDisputeModal({ onClose, onSubmitted, api, userSapCode }) {
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ orderCode: '', reason: '', description: '' });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get('/orders?status=DELIVERED&limit=100')
      .then((res) => {
        // Also fetch DISPUTED orders since they may want to raise another dispute
        api.get('/orders?status=DISPUTED&limit=100').then((res2) => {
          setOrders([...res.data, ...res2.data]);
        });
      })
      .catch(console.error);
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!form.orderCode || !form.reason || !form.description) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      // Mock IPFS hash — real Pinata upload deferred to later phase
      const evidenceIpfsHash = file
        ? `mock-ipfs-Qm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
        : null;

      await api.post('/disputes', {
        orderCode: form.orderCode,
        reason: form.reason,
        description: form.description,
        evidenceIpfsHash,
      });
      toast.success('Dispute raised successfully');
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to raise dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dispute-modal-overlay" onClick={onClose}>
      <div className="dispute-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dispute-modal-header">
          <h2>Raise a Dispute</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ✕
          </button>
        </div>
        <div className="dispute-modal-body">
          <label>Order *</label>
          <select value={form.orderCode} onChange={(e) => setForm({ ...form, orderCode: e.target.value })}>
            <option value="">Select an order…</option>
            {orders.map((o) => (
              <option key={o.order_code} value={o.order_code}>
                {o.order_code} — ₹{o.total_amount} ({o.status})
              </option>
            ))}
          </select>

          <label>Reason *</label>
          <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
            <option value="">Select reason…</option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.icon} {r.label}
              </option>
            ))}
          </select>

          <label>Description *</label>
          <textarea
            placeholder="Describe the issue in detail…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label>Photo Evidence</label>
          <div
            className={`file-upload-area ${file ? 'has-file' : ''}`}
            onClick={() => document.getElementById('evidence-file-input').click()}
          >
            <PhotoIcon style={{ width: 32, height: 32, margin: '0 auto 0.5rem', color: '#9ca3af' }} />
            {file ? (
              <p className="text-sm font-medium text-green-700">{file.name}</p>
            ) : (
              <p className="text-sm text-gray-500">Click to upload photo evidence</p>
            )}
            <input id="evidence-file-input" type="file" accept="image/*" onChange={handleFile} hidden />
          </div>
        </div>
        <div className="dispute-modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Dispute'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Resolve / Reject Modal ────────────────────────────────────────
function ActionModal({ title, actionLabel, actionClass, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!notes.trim()) {
      toast.error('Please enter notes');
      return;
    }
    setSubmitting(true);
    await onConfirm(notes);
    setSubmitting(false);
  };

  return (
    <div className="dispute-modal-overlay" onClick={onClose}>
      <div className="dispute-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dispute-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ✕
          </button>
        </div>
        <div className="dispute-modal-body">
          <label>{title === 'Reject Dispute' ? 'Rejection Reason' : 'Resolution Notes'} *</label>
          <textarea
            placeholder="Enter your notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="dispute-modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className={actionClass} onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Processing…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Temperature Comparison Visual ─────────────────────────────────
function TempComparison({ dispatchTemp, receiptTemp, maxThreshold }) {
  const maxVal = Math.max(dispatchTemp || 0, receiptTemp || 0, maxThreshold || 0, 10);
  const scale = (val) => Math.max(((val || 0) / maxVal) * 120, 24);
  const isViolation = receiptTemp > maxThreshold;

  return (
    <div className="temp-compare">
      <div className="temp-compare-header">
        <ExclamationTriangleIcon style={{ width: 20, height: 20 }} />
        Cold Chain Temperature Analysis
      </div>
      <div className="temp-bar-container">
        <div className="temp-bar-item">
          <div className="temp-bar" style={{ height: scale(dispatchTemp), background: '#3B82F6' }}>
            <span className="temp-bar-value">{dispatchTemp ?? '-'}°C</span>
          </div>
          <span className="temp-bar-label">Dispatch</span>
        </div>
        <div className="temp-bar-item">
          <div
            className="temp-bar"
            style={{
              height: scale(receiptTemp),
              background: isViolation ? '#E24B4A' : '#02C39A',
            }}
          >
            <span className="temp-bar-value">{receiptTemp ?? '-'}°C</span>
          </div>
          <span className="temp-bar-label">Receipt</span>
        </div>
        <div className="temp-bar-item">
          <div className="temp-bar" style={{ height: scale(maxThreshold), background: '#6b7280', opacity: 0.6 }}>
            <span className="temp-bar-value">{maxThreshold ?? '-'}°C</span>
          </div>
          <span className="temp-bar-label">Max Allowed</span>
        </div>
      </div>
      {isViolation && (
        <p style={{ textAlign: 'center', color: '#E24B4A', fontWeight: 700, fontSize: '0.85rem', marginTop: '0.5rem' }}>
          ⚠ Receipt temperature exceeds allowed threshold by {(receiptTemp - maxThreshold).toFixed(1)}°C
        </p>
      )}
    </div>
  );
}

// ─── Admin Dispute Detail View ─────────────────────────────────────
function DisputeDetail({ dispute, onBack, onAction, api }) {
  const [orderData, setOrderData] = useState(null);
  const [actionModal, setActionModal] = useState(null); // 'resolve' | 'reject'

  useEffect(() => {
    if (dispute.order_code || dispute.order_id) {
      // We need the order code. disputes table stores order_id, but list endpoint returns it.
      // Try to fetch order by order_code if available, else by finding it via the order list
      const code = dispute.order_code;
      if (code) {
        api.get(`/orders/${code}`).then((res) => setOrderData(res.data)).catch(console.error);
      }
    }
  }, [dispute]);

  const maxTemp = orderData?.items?.reduce((max, item) => {
    if (item.max_temp_celsius && item.max_temp_celsius > max) return item.max_temp_celsius;
    return max;
  }, 0) || 8; // default threshold

  const handleAction = async (type, notes) => {
    try {
      await api.patch(`/disputes/${dispute.id}/${type}`, { resolutionNotes: notes });
      toast.success(`Dispute ${type === 'resolve' ? 'resolved' : 'rejected'} successfully`);
      setActionModal(null);
      onAction();
    } catch (err) {
      toast.error(`Failed to ${type} dispute`);
    }
  };

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to All Disputes
      </button>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-navy">Dispute Detail</h2>
          <DisputeStatusBadge status={dispute.status} />
        </div>
        {dispute.status === 'OPEN' && (
          <div className="flex gap-2">
            <button className="btn-resolve" onClick={() => setActionModal('resolve')}>
              <CheckCircleIcon style={{ width: 18, height: 18 }} /> Resolve
            </button>
            <button className="btn-reject" onClick={() => setActionModal('reject')}>
              <XCircleIcon style={{ width: 18, height: 18 }} /> Reject
            </button>
          </div>
        )}
      </div>

      <div className="dispute-detail-grid">
        {/* LEFT: Dispute Info */}
        <div className="dispute-detail-card">
          <h3>Dispute Information</h3>
          <div className="dispute-info-row">
            <span className="dispute-info-label">Order Code</span>
            <span className="dispute-info-value font-mono">{dispute.order_code || '—'}</span>
          </div>
          <div className="dispute-info-row">
            <span className="dispute-info-label">Raised By</span>
            <span className="dispute-info-value">{dispute.raised_by_sap_code}</span>
          </div>
          <div className="dispute-info-row">
            <span className="dispute-info-label">Reason</span>
            <span className="dispute-info-value">
              <ReasonBadge reason={dispute.reason} />
            </span>
          </div>
          <div className="dispute-info-row">
            <span className="dispute-info-label">Date Raised</span>
            <span className="dispute-info-value">{new Date(dispute.created_at).toLocaleString()}</span>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <span className="dispute-info-label">Description</span>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#374151', lineHeight: 1.6 }}>
              {dispute.description || 'No description provided.'}
            </p>
          </div>
          {dispute.evidence_ipfs_hash && (
            <div style={{ marginTop: '1rem' }}>
              <span className="dispute-info-label">Evidence</span>
              <div
                style={{
                  marginTop: '0.5rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <p className="text-xs text-gray-500 font-mono break-all">{dispute.evidence_ipfs_hash}</p>
                <p className="text-xs text-gray-400 mt-1 italic">IPFS upload pending (mock hash)</p>
              </div>
            </div>
          )}
          {dispute.resolution_notes && (
            <div style={{ marginTop: '1rem' }}>
              <span className="dispute-info-label">Resolution Notes</span>
              <p
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.9rem',
                  color: dispute.status === 'REJECTED' ? '#991b1b' : '#065f46',
                  background: dispute.status === 'REJECTED' ? '#fef2f2' : '#f0fdf4',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  lineHeight: 1.6,
                }}
              >
                {dispute.resolution_notes}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Blockchain Evidence / Order Data */}
        <div className="dispute-detail-card">
          <h3>Blockchain Evidence</h3>
          {orderData ? (
            <>
              <div className="dispute-info-row">
                <span className="dispute-info-label">From</span>
                <span className="dispute-info-value">{orderData.from_user_name || orderData.from_sap_code}</span>
              </div>
              <div className="dispute-info-row">
                <span className="dispute-info-label">To</span>
                <span className="dispute-info-value">{orderData.to_user_name || orderData.to_sap_code}</span>
              </div>
              <div className="dispute-info-row">
                <span className="dispute-info-label">Total Amount</span>
                <span className="dispute-info-value">₹{orderData.total_amount}</span>
              </div>
              <div className="dispute-info-row">
                <span className="dispute-info-label">Blockchain TX</span>
                <span className="dispute-info-value font-mono text-xs">
                  {orderData.blockchain_tx_hash
                    ? `${orderData.blockchain_tx_hash.slice(0, 16)}…`
                    : 'Pending'}
                </span>
              </div>
              <div className="dispute-info-row">
                <span className="dispute-info-label">Chain Status</span>
                <span className="dispute-info-value">
                  {dispute.blockchain_status === 'CONFIRMED' && '🟢 Confirmed'}
                  {dispute.blockchain_status === 'PENDING' && '🟡 Pending'}
                  {dispute.blockchain_status === 'FAILED' && '🔴 Failed'}
                  {!dispute.blockchain_status && '—'}
                </span>
              </div>

              {/* COLD_CHAIN_BREAK: Temperature comparison */}
              {dispute.reason === 'COLD_CHAIN_BREAK' && (
                <TempComparison
                  dispatchTemp={orderData.temperature_at_dispatch}
                  receiptTemp={orderData.temperature_at_receipt}
                  maxThreshold={maxTemp}
                />
              )}

              {/* QUANTITY_MISMATCH: Item comparison table */}
              {dispute.reason === 'QUANTITY_MISMATCH' && orderData.items && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 className="text-sm font-bold text-navy mb-2 uppercase tracking-wider">Quantity Comparison</h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Drug</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Dispatched</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Received</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderData.items.map((item, idx) => {
                          const mismatch = (item.quantity_dispatched || 0) - (item.quantity_received || 0);
                          return (
                            <tr key={idx} className={mismatch > 0 ? 'qty-mismatch-row' : ''}>
                              <td className="px-3 py-2 font-medium">{item.drug_name}</td>
                              <td className="px-3 py-2 text-right">{item.quantity_dispatched}</td>
                              <td className="px-3 py-2 text-right">{item.quantity_received ?? '—'}</td>
                              <td className={`px-3 py-2 text-right ${mismatch > 0 ? 'qty-mismatch-cell' : ''}`}>
                                {mismatch > 0 ? `-${mismatch}` : '✓'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Order Timeline */}
              <div style={{ marginTop: '1.25rem' }}>
                <h4 className="text-sm font-bold text-navy mb-2 uppercase tracking-wider">Order Timeline</h4>
                <div className="order-timeline">
                  <div className="timeline-item">
                    <div className="timeline-title">Order Created</div>
                    <div className="timeline-time">{new Date(orderData.created_at).toLocaleString()}</div>
                  </div>
                  {orderData.dispatch_timestamp && (
                    <div className="timeline-item">
                      <div className="timeline-title">
                        Dispatched (Temp: {orderData.temperature_at_dispatch ?? '—'}°C)
                      </div>
                      <div className="timeline-time">{new Date(orderData.dispatch_timestamp).toLocaleString()}</div>
                    </div>
                  )}
                  {orderData.delivery_timestamp && (
                    <div className="timeline-item">
                      <div className="timeline-title">
                        Delivered (Temp: {orderData.temperature_at_receipt ?? '—'}°C)
                      </div>
                      <div className="timeline-time">{new Date(orderData.delivery_timestamp).toLocaleString()}</div>
                    </div>
                  )}
                  <div className="timeline-item alert">
                    <div className="timeline-title">Dispute Raised — {REASONS.find((r) => r.value === dispute.reason)?.label}</div>
                    <div className="timeline-time">{new Date(dispute.created_at).toLocaleString()}</div>
                  </div>
                  {dispute.resolved_at && (
                    <div className="timeline-item">
                      <div className="timeline-title">
                        {dispute.status === 'RESOLVED' ? 'Resolved' : 'Rejected'}
                      </div>
                      <div className="timeline-time">{new Date(dispute.resolved_at).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <LoadingSpinner />
          )}
        </div>
      </div>

      {/* Action modals */}
      {actionModal === 'resolve' && (
        <ActionModal
          title="Resolve Dispute"
          actionLabel="Resolve"
          actionClass="btn-resolve"
          onClose={() => setActionModal(null)}
          onConfirm={(notes) => handleAction('resolve', notes)}
        />
      )}
      {actionModal === 'reject' && (
        <ActionModal
          title="Reject Dispute"
          actionLabel="Reject"
          actionClass="btn-reject"
          onClose={() => setActionModal(null)}
          onConfirm={(notes) => handleAction('reject', notes)}
        />
      )}
    </div>
  );
}

// ─── MAIN DISPUTES COMPONENT ───────────────────────────────────────
export default function Disputes() {
  const api = useApi();
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'ADMIN';

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);

  // Admin filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchDisputes = () => {
    setLoading(true);
    api
      .get('/disputes')
      .then((res) => {
        // Enrich disputes with order_code from the data
        // The backend returns d.* which includes order_id but not order_code directly
        // We'll fetch order codes in parallel
        const disputeData = res.data;
        // Try to get order codes for each dispute
        const enrichPromises = disputeData.map(async (d) => {
          if (!d.order_code && d.order_id) {
            try {
              // We don't have a direct endpoint to get order by ID, 
              // but order_code might come from a join — check if it's there
              return d;
            } catch {
              return d;
            }
          }
          return d;
        });
        Promise.all(enrichPromises).then((enriched) => {
          setDisputes(enriched);
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  // Fetch order codes for disputes that don't have them (need to get all orders to map)
  const [orderMap, setOrderMap] = useState({});
  useEffect(() => {
    api
      .get('/orders?limit=1000')
      .then((res) => {
        const map = {};
        res.data.forEach((o) => {
          map[o.id] = o.order_code;
        });
        setOrderMap(map);
      })
      .catch(console.error);
  }, []);

  // Enrich disputes with order_code
  const enrichedDisputes = useMemo(() => {
    return disputes.map((d) => ({
      ...d,
      order_code: d.order_code || orderMap[d.order_id] || d.order_id?.slice(0, 8),
    }));
  }, [disputes, orderMap]);

  // Filtered disputes (admin)
  const filteredDisputes = useMemo(() => {
    return enrichedDisputes.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (reasonFilter !== 'ALL' && d.reason !== reasonFilter) return false;
      if (searchFilter) {
        const s = searchFilter.toLowerCase();
        const matchCode = (d.order_code || '').toLowerCase().includes(s);
        const matchBy = (d.raised_by_sap_code || '').toLowerCase().includes(s);
        if (!matchCode && !matchBy) return false;
      }
      return true;
    });
  }, [enrichedDisputes, statusFilter, reasonFilter, searchFilter]);

  // Stats (admin)
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const open = enrichedDisputes.filter((d) => d.status === 'OPEN').length;
    const resolvedThisMonth = enrichedDisputes.filter(
      (d) => d.status === 'RESOLVED' && d.resolved_at && new Date(d.resolved_at) >= monthStart
    ).length;
    const rejected = enrichedDisputes.filter((d) => d.status === 'REJECTED').length;

    // Most common reason
    const reasonCounts = {};
    enrichedDisputes.forEach((d) => {
      reasonCounts[d.reason] = (reasonCounts[d.reason] || 0) + 1;
    });
    const mostCommon = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
    const mostCommonLabel = mostCommon ? REASONS.find((r) => r.value === mostCommon[0])?.label || mostCommon[0] : '—';

    return { open, resolvedThisMonth, rejected, mostCommonLabel };
  }, [enrichedDisputes]);

  if (loading) return <LoadingSpinner />;

  // If viewing a specific dispute detail (admin only)
  if (selectedDispute && isAdmin) {
    return (
      <DisputeDetail
        dispute={selectedDispute}
        onBack={() => setSelectedDispute(null)}
        onAction={() => {
          setSelectedDispute(null);
          fetchDisputes();
        }}
        api={api}
      />
    );
  }

  // ─── NON-ADMIN VIEW ──────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-navy">My Disputes</h1>
          <button className="btn-primary" onClick={() => setShowRaiseModal(true)}>
            <PlusIcon style={{ width: 18, height: 18 }} /> Raise Dispute
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          {enrichedDisputes.length === 0 ? (
            <EmptyState icon={ShieldExclamationIcon} message="No disputes raised yet" />
          ) : (
            <DataTable
              columns={[
                { header: 'Order Code', cell: (row) => <span className="font-mono text-sm">{row.order_code}</span> },
                { header: 'Reason', cell: (row) => <ReasonBadge reason={row.reason} /> },
                { header: 'Status', cell: (row) => <DisputeStatusBadge status={row.status} /> },
                { header: 'Date Raised', cell: (row) => new Date(row.created_at).toLocaleDateString() },
                {
                  header: 'Resolution',
                  cell: (row) =>
                    row.resolution_notes ? (
                      <span className="text-sm text-gray-600 truncate max-w-[200px] inline-block">
                        {row.resolution_notes}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    ),
                },
              ]}
              data={enrichedDisputes}
            />
          )}
        </div>

        {showRaiseModal && (
          <RaiseDisputeModal
            api={api}
            userSapCode={user?.sap_code}
            onClose={() => setShowRaiseModal(false)}
            onSubmitted={fetchDisputes}
          />
        )}
      </div>
    );
  }

  // ─── ADMIN VIEW ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Dispute Management</h1>

      {/* Stats */}
      <div className="disputes-stats">
        <StatsCard icon={ShieldExclamationIcon} label="Open Disputes" value={stats.open} />
        <StatsCard icon={CheckCircleIcon} label="Resolved This Month" value={stats.resolvedThisMonth} />
        <StatsCard icon={XCircleIcon} label="Rejected" value={stats.rejected} />
        <StatsCard icon={FireIcon} label="Most Common" value={stats.mostCommonLabel} />
      </div>

      {/* Filters */}
      <div className="disputes-filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
          <option value="ALL">All Reasons</option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search order code or SAP code…"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>

      {/* Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        {filteredDisputes.length === 0 ? (
          <EmptyState icon={ShieldExclamationIcon} message="No disputes found" />
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raised By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDisputes.map((d) => (
                  <tr key={d.id} className="clickable-row" onClick={() => setSelectedDispute(d)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-teal font-medium">{d.order_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.raised_by_sap_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><ReasonBadge reason={d.reason} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><DisputeStatusBadge status={d.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
