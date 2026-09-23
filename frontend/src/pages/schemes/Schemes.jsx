import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuthContext } from '../../context/AuthContext';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import {
  CurrencyDollarIcon,
  PlusIcon,
  CheckBadgeIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import './Schemes.css';

function getSchemeStatus(scheme) {
  const now = new Date();
  const from = new Date(scheme.valid_from);
  const to = new Date(scheme.valid_to);
  if (now < from) return 'upcoming';
  if (now > to) return 'expired';
  return 'active';
}

function SchemeStatusBadge({ scheme }) {
  const status = getSchemeStatus(scheme);
  const labels = { active: '● Active', expired: '○ Expired', upcoming: '◐ Upcoming' };
  return <span className={`scheme-status ${status}`}>{labels[status]}</span>;
}

// ─── Verify on Blockchain Modal ────────────────────────────────────
function VerifyModal({ scheme, onClose, api }) {
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get(`/schemes/${scheme.id}/verify`)
      .then((res) => {
        setResult(res.data);
        setVerifying(false);
      })
      .catch((err) => {
        toast.error('Verification failed');
        setVerifying(false);
      });
  }, [scheme.id]);

  return (
    <div className="verify-modal-overlay" onClick={onClose}>
      <div className="verify-modal" onClick={(e) => e.stopPropagation()}>
        {verifying ? (
          <>
            <div
              className="animate-spin mx-auto mb-4"
              style={{
                width: 48,
                height: 48,
                border: '4px solid #e2e8f0',
                borderTopColor: '#028090',
                borderRadius: '50%',
              }}
            />
            <h3 className="text-lg font-bold text-navy mb-2">Verifying on Blockchain…</h3>
            <p className="text-sm text-gray-500">Checking terms hash against on-chain record</p>
          </>
        ) : result ? (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                background: result.isActiveCurrently ? '#d1fae5' : '#fef3c7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <ShieldCheckIcon
                style={{
                  width: 36,
                  height: 36,
                  color: result.isActiveCurrently ? '#059669' : '#d97706',
                }}
              />
            </div>
            <h3 className="text-lg font-bold text-navy mb-2">{scheme.title}</h3>
            <div className="verified-badge" style={{ display: 'inline-flex', margin: '0 auto' }}>
              <span className="checkmark">✓</span>
              Verified — Terms Locked on Chain
            </div>

            {result.terms_hash && (
              <div className="tx-hash-display" style={{ marginTop: '1rem' }}>
                <span className="hash">{result.terms_hash}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.terms_hash);
                    toast.success('Hash copied');
                  }}
                  className="text-teal hover:text-navy"
                >
                  <DocumentDuplicateIcon style={{ width: 18, height: 18 }} />
                </button>
              </div>
            )}

            {result.blockchain_tx_hash && (
              <div className="tx-hash-display">
                <span className="text-xs text-gray-500 font-semibold uppercase" style={{ flexShrink: 0 }}>
                  TX:
                </span>
                <span className="hash">{result.blockchain_tx_hash}</span>
              </div>
            )}

            <p className="text-sm text-gray-500 mt-3">
              Status: {result.isActiveCurrently ? 'Currently Active' : 'Not Active'}
            </p>
            <p className="text-sm mt-1" style={{ color: result.verificationSource === 'blockchain' ? '#16a34a' : '#ca8a04' }}>
              Source: {result.verificationSource === 'blockchain' ? '🟢 On-Chain Contract' : '🟡 Database Only'}
              {result.onChainVerified !== null && result.onChainVerified !== undefined && (
                <> — On-chain active: {result.onChainVerified ? 'Yes' : 'No'}</>
              )}
            </p>

            <button
              onClick={onClose}
              className="btn-primary"
              style={{ marginTop: '1.5rem' }}
            >
              Close
            </button>
          </>
        ) : (
          <>
            <p className="text-danger font-bold">Verification failed</p>
            <button onClick={onClose} className="btn-cancel" style={{ marginTop: '1rem' }}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Create Scheme Form ────────────────────────────────────────────
function CreateSchemeForm({ onCreated, api }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    title: '',
    productMaterialSapCode: '',
    validFrom: '',
    validTo: '',
    terms: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get('/products')
      .then((res) => setProducts(res.data))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.productMaterialSapCode || !form.validFrom || !form.validTo || !form.terms) {
      toast.error('Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      // Generate a simple hash of terms for blockchain
      const termsHash = '0x' + Array.from(form.terms).reduce((hash, char) => {
        return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
      }, 0).toString(16).replace('-', 'f');

      await api.post('/schemes', {
        title: form.title,
        productMaterialSapCode: form.productMaterialSapCode,
        validFrom: form.validFrom,
        validTo: form.validTo,
        terms: form.terms,
        termsHash: termsHash,
      });
      toast.success('Scheme created successfully');
      setForm({ title: '', productMaterialSapCode: '', validFrom: '', validTo: '', terms: '' });
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create scheme');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="scheme-form">
      <h3>
        <PlusIcon style={{ width: 20, height: 20, display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />
        Create New Scheme
      </h3>
      <form onSubmit={handleSubmit}>
        <label>Title *</label>
        <input
          type="text"
          placeholder='e.g. "Buy 10 Get 1 Free - Paracetamol"'
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <label>Product *</label>
        <select
          value={form.productMaterialSapCode}
          onChange={(e) => setForm({ ...form, productMaterialSapCode: e.target.value })}
        >
          <option value="">Select product…</option>
          {products.map((p) => (
            <option key={p.material_sap_code} value={p.material_sap_code}>
              {p.drug_name} — {p.material_sap_code}
            </option>
          ))}
        </select>

        <div className="scheme-form-row">
          <div>
            <label>Valid From *</label>
            <input
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            />
          </div>
          <div>
            <label>Valid To *</label>
            <input
              type="date"
              value={form.validTo}
              onChange={(e) => setForm({ ...form, validTo: e.target.value })}
            />
          </div>
        </div>

        <label>Terms *</label>
        <textarea
          placeholder="e.g. For every 10 strips purchased in a single order, distributor must pass 1 free strip to pharmacy"
          value={form.terms}
          onChange={(e) => setForm({ ...form, terms: e.target.value })}
        />

        <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
          {submitting ? 'Creating…' : 'Create Scheme & Lock on Blockchain'}
        </button>
      </form>
    </div>
  );
}

// ─── Scheme Detail View (Admin) ────────────────────────────────────
function SchemeDetailView({ scheme, onBack, api }) {
  const [verifyModal, setVerifyModal] = useState(false);
  const [productName, setProductName] = useState('');

  useEffect(() => {
    if (scheme.product_material_sap_code) {
      api
        .get(`/products/${scheme.product_material_sap_code}`)
        .then((res) => setProductName(res.data.drug_name))
        .catch(() => setProductName(scheme.product_material_sap_code));
    }
  }, [scheme]);

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to All Schemes
      </button>

      <div className="scheme-detail-card">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 style={{ borderBottom: 'none', marginBottom: '0.25rem', paddingBottom: 0 }}>{scheme.title}</h3>
            <span className="scheme-card-product">{productName || scheme.product_material_sap_code}</span>
          </div>
          <SchemeStatusBadge scheme={scheme} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 border-t pt-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Valid From</p>
            <p className="font-medium">{new Date(scheme.valid_from).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Valid To</p>
            <p className="font-medium">{new Date(scheme.valid_to).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Terms</p>
          <div className="scheme-card-terms">{scheme.terms || 'No terms text available (only hash stored).'}</div>
        </div>

        {scheme.terms_hash && (
          <div className="tx-hash-display">
            <span className="text-xs text-gray-500 font-semibold uppercase" style={{ flexShrink: 0 }}>
              Terms Hash:
            </span>
            <span className="hash">{scheme.terms_hash}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(scheme.terms_hash);
                toast.success('Hash copied');
              }}
              className="text-teal hover:text-navy"
            >
              <DocumentDuplicateIcon style={{ width: 18, height: 18 }} />
            </button>
          </div>
        )}

        {scheme.blockchain_tx_hash && (
          <div className="tx-hash-display">
            <span className="text-xs text-gray-500 font-semibold uppercase" style={{ flexShrink: 0 }}>
              Blockchain TX:
            </span>
            <span className="hash">{scheme.blockchain_tx_hash}</span>
          </div>
        )}

        <div style={{ marginTop: '0.5rem' }}>
          <span className="text-xs text-gray-500 font-semibold uppercase" style={{ marginRight: 8 }}>Chain Status:</span>
          {scheme.blockchain_status === 'CONFIRMED' && <span style={{ color: '#16a34a' }}>🟢 Confirmed</span>}
          {scheme.blockchain_status === 'PENDING' && <span style={{ color: '#ca8a04' }}>🟡 Pending</span>}
          {scheme.blockchain_status === 'FAILED' && <span style={{ color: '#dc2626' }} title={scheme.blockchain_error || ''}>🔴 Failed</span>}
          {!scheme.blockchain_status && <span style={{ color: '#9ca3af' }}>—</span>}
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <button className="btn-primary" onClick={() => setVerifyModal(true)}>
            <CheckBadgeIcon style={{ width: 18, height: 18 }} /> Verify on Blockchain
          </button>
        </div>
      </div>

      {verifyModal && <VerifyModal scheme={scheme} onClose={() => setVerifyModal(false)} api={api} />}
    </div>
  );
}

// ─── MAIN SCHEMES COMPONENT ───────────────────────────────────────
export default function Schemes() {
  const api = useApi();
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'ADMIN';

  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [verifyModal, setVerifyModal] = useState(null); // for non-admin
  const [productMap, setProductMap] = useState({});

  const fetchSchemes = () => {
    setLoading(true);
    const url = isAdmin ? '/schemes?all=true' : '/schemes';
    api
      .get(url)
      .then((res) => {
        setSchemes(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSchemes();
    // Fetch products for name mapping
    api
      .get('/products')
      .then((res) => {
        const map = {};
        res.data.forEach((p) => {
          map[p.material_sap_code] = p.drug_name;
        });
        setProductMap(map);
      })
      .catch(console.error);
  }, []);

  if (loading) return <LoadingSpinner />;

  // Admin detail view
  if (selectedScheme && isAdmin) {
    return (
      <SchemeDetailView
        scheme={selectedScheme}
        onBack={() => setSelectedScheme(null)}
        api={api}
      />
    );
  }

  // ─── NON-ADMIN VIEW ──────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy">Active Schemes</h1>

        {schemes.length === 0 ? (
          <EmptyState icon={CurrencyDollarIcon} message="No active schemes available" />
        ) : (
          <div className="scheme-cards-grid">
            {schemes.map((s) => (
              <div key={s.id} className="scheme-card">
                <div className="scheme-card-header">
                  <div>
                    <span className="scheme-card-product">
                      💊 {productMap[s.product_material_sap_code] || s.product_material_sap_code}
                    </span>
                    <h3 className="scheme-card-title">{s.title}</h3>
                  </div>
                  <SchemeStatusBadge scheme={s} />
                </div>
                <p className="scheme-card-dates">
                  📅 {new Date(s.valid_from).toLocaleDateString()} — {new Date(s.valid_to).toLocaleDateString()}
                </p>
                <div className="scheme-card-terms">
                  {s.terms || 'Terms available upon request.'}
                </div>
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setVerifyModal(s)}
                >
                  <CheckBadgeIcon style={{ width: 18, height: 18 }} /> Verify on Blockchain
                </button>
              </div>
            ))}
          </div>
        )}

        {verifyModal && <VerifyModal scheme={verifyModal} onClose={() => setVerifyModal(null)} api={api} />}
      </div>
    );
  }

  // ─── ADMIN VIEW ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-navy">Scheme Management</h1>
        <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          <PlusIcon style={{ width: 18, height: 18 }} />
          {showCreateForm ? 'Hide Form' : 'Create Scheme'}
        </button>
      </div>

      {showCreateForm && (
        <CreateSchemeForm
          api={api}
          onCreated={() => {
            fetchSchemes();
            setShowCreateForm(false);
          }}
        />
      )}

      {/* All Schemes Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-navy mb-4">All Schemes</h2>
        {schemes.length === 0 ? (
          <EmptyState icon={CurrencyDollarIcon} message="No schemes created yet" />
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TX Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schemes.map((s) => (
                  <tr key={s.id} className="clickable-row" onClick={() => setSelectedScheme(s)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal">{s.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {productMap[s.product_material_sap_code] || s.product_material_sap_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(s.valid_from).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(s.valid_to).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <SchemeStatusBadge scheme={s} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                      {s.blockchain_tx_hash ? `${s.blockchain_tx_hash.slice(0, 12)}…` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {s.blockchain_status === 'CONFIRMED' && '🟢'}
                      {s.blockchain_status === 'PENDING' && '🟡'}
                      {s.blockchain_status === 'FAILED' && '🔴'}
                      {!s.blockchain_status && '—'}
                    </td>
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
