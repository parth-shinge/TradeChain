const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

const mkdir = (dir) => {
    const fullPath = path.join(srcDir, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
};

mkdir('hooks');
mkdir('context');
mkdir('components');
mkdir('pages/admin');
mkdir('pages/roles'); // for placeholders

const writeFile = (file, content) => {
    fs.writeFileSync(path.join(srcDir, file), content.trim());
    console.log(`Created ${file}`);
};

writeFile('hooks/useWallet.js', `
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useWallet() {
  const [address, setAddress] = useState('');
  
  useEffect(() => {
    const saved = localStorage.getItem('walletAddress');
    if (saved) setAddress(saved);
  }, []);

  const connect = async () => {
    if (!window.ethereum) throw new Error('MetaMask not installed');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    const message = "Sign this message to authenticate with TradeChain.";
    const signature = await signer.signMessage(message);
    
    return { address, signature, message };
  };

  const disconnect = () => {
    setAddress('');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('token');
  };

  return { address, connect, disconnect };
}
`);

writeFile('hooks/useAuth.js', `
import { useWallet } from './useWallet';
import { useState } from 'react';
import axios from 'axios';

export function useAuth() {
  const { connect, disconnect } = useWallet();
  const [user, setUser] = useState(null);

  const login = async () => {
    const { address, signature, message } = await connect();
    const res = await axios.post('http://localhost:3001/api/auth/verify', { walletAddress: address, signature, message });
    setUser(res.data);
    localStorage.setItem('walletAddress', address);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post('http://localhost:3001/api/auth/register', data);
    setUser(res.data);
    localStorage.setItem('walletAddress', data.walletAddress);
    return res.data;
  };

  const logout = () => {
    disconnect();
    setUser(null);
  };

  const checkAuth = async () => {
    const address = localStorage.getItem('walletAddress');
    if (!address) return null;
    try {
      const res = await axios.get('http://localhost:3001/api/auth/me', {
        headers: { 'x-wallet-address': address }
      });
      setUser(res.data);
      return res.data;
    } catch (e) {
      logout();
      return null;
    }
  };

  return { user, setUser, login, register, logout, checkAuth };
}
`);

writeFile('hooks/useApi.js', `
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const address = localStorage.getItem('walletAddress');
  if (address) {
    config.headers['x-wallet-address'] = address;
  }
  return config;
});

export function useApi() {
  const navigate = useNavigate();
  
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('walletAddress');
        navigate('/');
      }
      return Promise.reject(error);
    }
  );

  return api;
}
`);

writeFile('context/AuthContext.jsx', `
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.checkAuth().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
`);

writeFile('components/Layout.jsx', `
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { HomeIcon, ArrowRightOnRectangleIcon, TruckIcon, UsersIcon, ShieldExclamationIcon, CurrencyDollarIcon, ChartBarIcon, QrCodeIcon, DocumentArrowDownIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import WalletButton from './WalletButton';

export default function Layout({ children }) {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = {
    ADMIN: [
      { name: 'Dashboard', path: '/admin', icon: HomeIcon },
      { name: 'SAP Import', path: '/admin/sap-import', icon: DocumentArrowDownIcon },
      { name: 'Orders', path: '/orders', icon: TruckIcon },
      { name: 'Batch Tracking', path: '/batches', icon: QrCodeIcon },
      { name: 'Disputes', path: '/disputes', icon: ShieldExclamationIcon },
      { name: 'Schemes', path: '/schemes', icon: CurrencyDollarIcon },
      { name: 'Analytics', path: '/analytics', icon: ChartBarIcon },
      { name: 'Users', path: '/admin/users', icon: UsersIcon },
    ],
    CFA: [
      { name: 'Dashboard', path: '/cfa', icon: HomeIcon },
      { name: 'Orders', path: '/orders', icon: TruckIcon },
      { name: 'Dispatch', path: '/orders/create', icon: DocumentArrowUpIcon },
      { name: 'Batch Tracking', path: '/batches', icon: QrCodeIcon },
    ],
    DISTRIBUTOR: [
      { name: 'Dashboard', path: '/distributor', icon: HomeIcon },
      { name: 'Orders', path: '/orders', icon: TruckIcon },
      { name: 'Dispatch', path: '/orders/create', icon: DocumentArrowUpIcon },
      { name: 'Batch Tracking', path: '/batches', icon: QrCodeIcon },
      { name: 'Disputes', path: '/disputes', icon: ShieldExclamationIcon },
    ],
    STOCKIST: [
      { name: 'Dashboard', path: '/stockist', icon: HomeIcon },
      { name: 'Orders', path: '/orders', icon: TruckIcon },
      { name: 'Dispatch', path: '/orders/create', icon: DocumentArrowUpIcon },
      { name: 'Batch Tracking', path: '/batches', icon: QrCodeIcon },
    ],
    PHARMACY: [
      { name: 'Dashboard', path: '/pharmacy', icon: HomeIcon },
      { name: 'Incoming Orders', path: '/orders', icon: TruckIcon },
      { name: 'Scan QR', path: '/scan', icon: QrCodeIcon },
      { name: 'Disputes', path: '/disputes', icon: ShieldExclamationIcon },
      { name: 'Schemes', path: '/schemes', icon: CurrencyDollarIcon },
    ]
  };

  const navItems = user && user.role ? menuItems[user.role] || [] : [];

  return (
    <div className="flex h-screen bg-light-gray overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-deep-navy text-white flex flex-col">
        <div className="p-4 text-2xl font-bold text-mint border-b border-gray-700">TradeChain</div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link to={item.path} className="flex items-center px-4 py-3 hover:bg-teal hover:text-white transition">
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-deep-navy">{user?.sap_name}</span>
            <span className="bg-teal text-white text-xs px-2 py-1 rounded-full font-medium">{user?.role}</span>
          </div>
          <div className="flex items-center space-x-4">
            <WalletButton address={user?.wallet_address} />
            <button onClick={handleLogout} className="text-gray-500 hover:text-red flex items-center">
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" /> Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-light-gray">
          {children}
        </main>
      </div>
    </div>
  );
}
`);

writeFile('components/WalletButton.jsx', `
import React from 'react';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function WalletButton({ address }) {
  if (!address) return <button className="bg-teal text-white px-4 py-2 rounded">Connect Wallet</button>;
  
  const truncate = (addr) => \`\${addr.slice(0, 6)}...\${addr.slice(-4)}\`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied');
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 border border-gray-300">
      <div className="h-2 w-2 bg-mint rounded-full mr-2"></div>
      <span className="text-sm text-gray-700 font-mono mr-2">{truncate(address)}</span>
      <button onClick={handleCopy} className="text-gray-500 hover:text-teal focus:outline-none">
        <DocumentDuplicateIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
`);

writeFile('components/ProtectedRoute.jsx', `
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuthContext();

  if (loading) return <LoadingSpinner />;
  
  if (!user) return <Navigate to="/" replace />;
  
  if (!user.approved) {
    return (
      <div className="flex h-screen items-center justify-center bg-light-gray">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-amber mb-4">Pending Approval</h2>
          <p className="text-gray-600">Your account is pending admin approval. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
`);

writeFile('components/StatsCard.jsx', `
import React from 'react';

export default function StatsCard({ icon: Icon, label, value, trend, trendUp }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center">
      <div className="p-3 rounded-full bg-teal bg-opacity-10 text-teal mr-4">
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
        <div className="flex items-baseline mt-1">
          <p className="text-2xl font-bold text-deep-navy">{value}</p>
          {trend && (
            <span className={\`ml-2 text-sm font-medium \${trendUp ? 'text-mint' : 'text-red'}\`}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
`);

writeFile('components/StatusBadge.jsx', `
import React from 'react';

export default function StatusBadge({ status }) {
  const colors = {
    CREATED: 'bg-gray-100 text-gray-800 border-gray-200',
    DISPATCHED: 'bg-blue-100 text-blue-800 border-blue-200',
    DELIVERED: 'bg-green-100 text-green-800 border-green-200',
    DISPUTED: 'bg-red text-white border-red'
  };

  const classes = colors[status] || colors.CREATED;

  return (
    <span className={\`px-2.5 py-0.5 rounded-full text-xs font-medium border \${classes}\`}>
      {status}
    </span>
  );
}
`);

writeFile('components/DataTable.jsx', `
import React from 'react';

export default function DataTable({ columns, data }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {columns.map((col, j) => (
                <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">No data available</div>
      )}
    </div>
  );
}
`);

writeFile('components/LoadingSpinner.jsx', `
import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-full min-h-[200px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
    </div>
  );
}
`);

writeFile('components/EmptyState.jsx', `
import React from 'react';

export default function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-gray-400">
      <Icon className="h-16 w-16 mb-4 text-gray-300" />
      <p className="text-lg">{message}</p>
    </div>
  );
}
`);

writeFile('components/CSVUploader.jsx', `
import React, { useCallback, useState } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function CSVUploader({ onUpload }) {
  const [file, setFile] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'text/csv') setFile(dropped);
  };

  const handleChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const handleUpload = () => {
    if (file && onUpload) onUpload(file);
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900">Upload CSV File</h3>
      <p className="mt-1 text-sm text-gray-500">Drag and drop your file here, or click to select</p>
      <input type="file" accept=".csv" className="hidden" id="file-upload" onChange={handleChange} />
      <label htmlFor="file-upload" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal hover:bg-opacity-90 cursor-pointer">
        Select File
      </label>
      {file && (
        <div className="mt-4">
          <p className="text-sm font-medium text-deep-navy">Selected: {file.name}</p>
          <button onClick={handleUpload} className="mt-2 px-4 py-2 bg-deep-navy text-white rounded">Upload</button>
        </div>
      )}
    </div>
  );
}
`);

writeFile('components/ColdChainAlert.jsx', `
import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

export default function ColdChainAlert({ drugName, temp, threshold }) {
  return (
    <div className="bg-red text-white p-4 rounded-lg shadow flex items-start mb-4 border-l-4 border-dark-red">
      <ExclamationTriangleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
      <div>
        <h4 className="font-bold uppercase tracking-wider">Cold Chain Break</h4>
        <p className="mt-1 text-sm">
          <strong>{drugName}</strong> recorded at {temp}°C (Threshold: {threshold}°C)
        </p>
      </div>
    </div>
  );
}
`);

writeFile('components/ExpiryBadge.jsx', `
import React from 'react';

export default function ExpiryBadge({ date }) {
  const days = Math.floor((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  let color = 'bg-green-100 text-green-800 border-green-200';
  if (days < 0) color = 'bg-gray-800 text-white border-black';
  else if (days < 30) color = 'bg-red text-white border-red';
  else if (days < 90) color = 'bg-amber text-white border-amber';

  return (
    <span className={\`px-2 py-1 rounded text-xs font-semibold border \${color}\`}>
      {days < 0 ? 'Expired' : \`\${days} days\`}
    </span>
  );
}
`);

// ==================== PAGES ====================

writeFile('pages/Login.jsx', `
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Login() {
  const { user, login, register, checkAuth } = useAuthContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Connect, 2: Register, 3: Pending
  const [formData, setFormData] = useState({
    sapCode: '', sapName: '', role: 'PHARMACY', drugLicenseNo: '', city: '', region: ''
  });
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    if (user?.approved) navigate('/admin');
    else if (user?.approved === false) setStep(3);
  }, [user, navigate]);

  useEffect(() => {
    let interval;
    if (step === 3) {
      interval = setInterval(async () => {
        const u = await checkAuth();
        if (u?.approved) navigate(u.role === 'ADMIN' ? '/admin' : \`/\${u.role.toLowerCase()}\`);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [step, checkAuth, navigate]);

  const handleConnect = async () => {
    try {
      await login();
    } catch (err) {
      if (err.response?.status === 404) {
        // User not found, need to register
        const address = localStorage.getItem('walletAddress'); // from hook
        setWallet(address); // Actually login doesn't return address if it throws 404
        // To fix: we can use window.ethereum directly here if it fails
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWallet(accounts[0]);
        setStep(2);
      } else {
        toast.error('Failed to connect wallet');
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register({ ...formData, walletAddress: wallet });
      toast.success('Registration submitted');
      setStep(3);
    } catch (err) {
      toast.error('Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-deep-navy flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <ShieldCheckIcon className="mx-auto h-16 w-16 text-mint" />
        <h2 className="mt-6 text-3xl font-extrabold text-white">TradeChain</h2>
        <p className="mt-2 text-sm text-gray-300">Blockchain-verified drug supply chain tracking</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 1 && (
            <div className="text-center">
              <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
                <li>• End-to-end supply chain visibility</li>
                <li>• Automated cold-chain monitoring</li>
                <li>• Dispute resolution via smart contracts</li>
              </ul>
              <button onClick={handleConnect} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal hover:bg-opacity-90">
                Connect MetaMask Wallet
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <h3 className="text-lg font-medium text-deep-navy mb-4">Register New Account</h3>
              <input required placeholder="Name / Organization" className="w-full px-3 py-2 border rounded" value={formData.sapName} onChange={e => setFormData({...formData, sapName: e.target.value})} />
              <input required placeholder="SAP Code" className="w-full px-3 py-2 border rounded" value={formData.sapCode} onChange={e => setFormData({...formData, sapCode: e.target.value})} />
              <select className="w-full px-3 py-2 border rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="CFA">CFA</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="STOCKIST">Stockist</option>
                <option value="PHARMACY">Pharmacy</option>
              </select>
              <input placeholder="Drug License No (Optional)" className="w-full px-3 py-2 border rounded" value={formData.drugLicenseNo} onChange={e => setFormData({...formData, drugLicenseNo: e.target.value})} />
              <input required placeholder="City" className="w-full px-3 py-2 border rounded" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              <input required placeholder="Region" className="w-full px-3 py-2 border rounded" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} />
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-deep-navy hover:bg-opacity-90">
                Submit Registration
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="animate-pulse bg-amber text-white p-4 rounded-lg mb-4">
                <h3 className="font-bold">Pending Admin Approval</h3>
              </div>
              <p className="text-sm text-gray-500">Waiting for an administrator to approve your account. This page will auto-refresh.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`);

writeFile('pages/admin/Dashboard.jsx', `
import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';
import ColdChainAlert from '../../components/ColdChainAlert';
import { BuildingOfficeIcon, TruckIcon, MapPinIcon, ShieldExclamationIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const api = useApi();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [coldChainViolations, setColdChainViolations] = useState([]);

  useEffect(() => {
    api.get('/analytics/overview').then(res => setStats(res.data)).catch(console.error);
    api.get('/orders?limit=10').then(res => setOrders(res.data)).catch(console.error);
    // Ideally an endpoint for specific violations exists, using placeholder data or fetch
    api.get('/orders?status=DISPUTED').then(res => setColdChainViolations(res.data.filter(o => o.temperature_at_receipt > 8))).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-deep-navy">Admin Dashboard</h1>
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatsCard icon={BuildingOfficeIcon} label="Total Pharmacies" value="25" />
        <StatsCard icon={TruckIcon} label="Total Orders" value={stats?.total_orders || 0} />
        <StatsCard icon={MapPinIcon} label="In-Transit" value={orders.filter(o => o.status === 'DISPATCHED').length} />
        <StatsCard icon={ShieldExclamationIcon} label="Open Disputes" value={stats?.total_disputed || 0} />
        <StatsCard icon={ExclamationTriangleIcon} label="Cold Chain Alerts" value={stats?.cold_chain_violations_count || 0} trend="Up" trendUp={false} />
      </div>

      {/* Order Pipeline */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-deep-navy">Order Pipeline</h2>
        <div className="flex items-center justify-between text-center px-8">
          <div className="flex flex-col"><div className="w-12 h-12 bg-deep-navy text-white rounded-full flex items-center justify-center font-bold mx-auto mb-2">HQ</div><span className="text-sm">Factory</span></div>
          <div className="h-1 flex-1 bg-gray-200 mx-4"></div>
          <div className="flex flex-col"><div className="w-12 h-12 bg-teal text-white rounded-full flex items-center justify-center font-bold mx-auto mb-2">2</div><span className="text-sm">CFA</span></div>
          <div className="h-1 flex-1 bg-gray-200 mx-4"></div>
          <div className="flex flex-col"><div className="w-12 h-12 bg-teal text-white rounded-full flex items-center justify-center font-bold mx-auto mb-2">3</div><span className="text-sm">Distributor</span></div>
          <div className="h-1 flex-1 bg-gray-200 mx-4"></div>
          <div className="flex flex-col"><div className="w-12 h-12 bg-teal text-white rounded-full flex items-center justify-center font-bold mx-auto mb-2">5</div><span className="text-sm">Stockist</span></div>
          <div className="h-1 flex-1 bg-gray-200 mx-4"></div>
          <div className="flex flex-col"><div className="w-12 h-12 bg-teal text-white rounded-full flex items-center justify-center font-bold mx-auto mb-2">15</div><span className="text-sm">Pharmacy</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {coldChainViolations.map((v, i) => (
            <ColdChainAlert key={i} drugName="Vaccine" temp={v.temperature_at_receipt} threshold={8} />
          ))}
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 text-deep-navy">Recent Orders</h2>
            <DataTable 
              columns={[
                { header: 'Order Code', accessor: 'order_code' },
                { header: 'From', accessor: 'from_sap_code' },
                { header: 'To', accessor: 'to_sap_code' },
                { header: 'Amount', cell: (row) => \`$\${row.total_amount}\` },
                { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> }
              ]} 
              data={orders} 
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-deep-navy">Claude AI Alerts</h2>
          <div className="bg-light-gray rounded p-4 text-sm text-gray-500 italic text-center h-48 flex items-center justify-center border border-dashed border-gray-300">
            AI alerts will appear here (Phase 6)
          </div>
        </div>
      </div>
    </div>
  );
}
`);

writeFile('pages/admin/SAPImport.jsx', `
import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import CSVUploader from '../../components/CSVUploader';
import toast from 'react-hot-toast';

export default function SAPImport() {
  const api = useApi();
  const [tab, setTab] = useState(1);
  const [generateCount, setGenerateCount] = useState(10);
  const [batchData, setBatchData] = useState({ productId: '', batchNumber: '', manufactureDate: '', expiryDate: '', quantityManufactured: 0 });

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/mock-sap/import', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success('CSV Imported Successfully');
    } catch (e) { toast.error('Import failed'); }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/mock-sap/generate', { count: generateCount });
      toast.success(\`Generated \${generateCount} orders\`);
    } catch (e) { toast.error('Generation failed'); }
  };

  const handleBatch = async (e) => {
    e.preventDefault();
    try {
      await api.post('/batches', batchData);
      toast.success('Batch registered');
    } catch (e) { toast.error('Batch registration failed'); }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {['CSV Import', 'Generate Mock Data', 'Batch Registration'].map((name, i) => (
            <button key={name} onClick={() => setTab(i+1)} className={\`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm \${tab === i+1 ? 'border-teal text-teal' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}\`}>
              {name}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {tab === 1 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Import SAP Data</h2>
            <CSVUploader onUpload={handleUpload} />
          </div>
        )}
        
        {tab === 2 && (
          <form onSubmit={handleGenerate} className="max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Generate Random Orders</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Orders</label>
              <input type="number" min="1" max="100" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal focus:border-teal sm:text-sm" value={generateCount} onChange={(e) => setGenerateCount(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-teal border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-opacity-90">Generate</button>
          </form>
        )}

        {tab === 3 && (
          <form onSubmit={handleBatch} className="max-w-lg mx-auto space-y-4">
             <h2 className="text-lg font-medium text-gray-900">Register New Batch</h2>
             <input required placeholder="Product ID (UUID)" className="w-full px-3 py-2 border rounded" value={batchData.productId} onChange={e => setBatchData({...batchData, productId: e.target.value})} />
             <input required placeholder="Batch Number" className="w-full px-3 py-2 border rounded" value={batchData.batchNumber} onChange={e => setBatchData({...batchData, batchNumber: e.target.value})} />
             <input required type="date" placeholder="Manufacture Date" className="w-full px-3 py-2 border rounded" value={batchData.manufactureDate} onChange={e => setBatchData({...batchData, manufactureDate: e.target.value})} />
             <input required type="date" placeholder="Expiry Date" className="w-full px-3 py-2 border rounded" value={batchData.expiryDate} onChange={e => setBatchData({...batchData, expiryDate: e.target.value})} />
             <input required type="number" placeholder="Quantity" className="w-full px-3 py-2 border rounded" value={batchData.quantityManufactured} onChange={e => setBatchData({...batchData, quantityManufactured: parseInt(e.target.value)})} />
             <button type="submit" className="w-full bg-deep-navy text-white py-2 rounded">Register Batch</button>
          </form>
        )}
      </div>
    </div>
  );
}
`);

writeFile('pages/admin/Users.jsx', `
import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import DataTable from '../../components/DataTable';
import toast from 'react-hot-toast';

export default function Users() {
  const api = useApi();
  const [tab, setTab] = useState(1);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);

  const fetchData = async () => {
    try {
      const [u, p] = await Promise.all([
        api.get('/users'),
        api.get('/users/pending')
      ]);
      setUsers(u.data);
      setPending(p.data);
    } catch (e) {
      toast.error('Failed to load users');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    try {
      await api.patch(\`/users/\${id}/approve\`);
      toast.success('User approved');
      fetchData();
    } catch (e) { toast.error('Action failed'); }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(\`/users/\${id}/reject\`);
      toast.success('User rejected');
      fetchData();
    } catch (e) { toast.error('Action failed'); }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button onClick={() => setTab(1)} className={\`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm \${tab === 1 ? 'border-amber text-amber' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}\`}>
            Pending Approvals ({pending.length})
          </button>
          <button onClick={() => setTab(2)} className={\`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm \${tab === 2 ? 'border-teal text-teal' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}\`}>
            All Users
          </button>
        </nav>
      </div>

      <div className="p-6">
        {tab === 1 && (
          <DataTable 
            columns={[
              { header: 'Name', accessor: 'sap_name' },
              { header: 'SAP Code', accessor: 'sap_code' },
              { header: 'Role', accessor: 'role' },
              { header: 'City', accessor: 'city' },
              { header: 'Actions', cell: (row) => (
                <div className="space-x-2">
                  <button onClick={() => handleApprove(row.id)} className="bg-mint text-white px-3 py-1 rounded text-xs">Approve</button>
                  <button onClick={() => handleReject(row.id)} className="bg-red text-white px-3 py-1 rounded text-xs">Reject</button>
                </div>
              )}
            ]} 
            data={pending} 
          />
        )}
        
        {tab === 2 && (
          <DataTable 
            columns={[
              { header: 'Name', accessor: 'sap_name' },
              { header: 'SAP Code', accessor: 'sap_code' },
              { header: 'Role', cell: (row) => <span className="bg-gray-100 px-2 py-1 rounded text-xs">{row.role}</span> },
              { header: 'City', accessor: 'city' },
              { header: 'Status', cell: (row) => <span className={row.approved ? 'text-green-600' : 'text-amber'}>{row.approved ? 'Approved' : 'Pending'}</span> }
            ]} 
            data={users} 
          />
        )}
      </div>
    </div>
  );
}
`);

writeFile('pages/Placeholder.jsx', `
import React from 'react';

export default function Placeholder({ name, desc, phase }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <h1 className="text-3xl font-bold text-deep-navy mb-2">{name}</h1>
      <p className="text-gray-600 mb-6">{desc}</p>
      <span className="bg-amber text-white px-4 py-2 rounded-full font-semibold">Coming in Phase {phase}</span>
    </div>
  );
}
`);

writeFile('App.jsx', `
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import SAPImport from './pages/admin/SAPImport';
import Users from './pages/admin/Users';
import Placeholder from './pages/Placeholder';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
        <Route path="/admin/sap-import" element={<ProtectedRoute allowedRoles={['ADMIN']}><Layout><SAPImport /></Layout></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><Layout><Users /></Layout></ProtectedRoute>} />
        
        {/* Other Roles Placeholders */}
        <Route path="/cfa" element={<ProtectedRoute><Layout><Placeholder name="CFA Dashboard" desc="CFA Operations" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/distributor" element={<ProtectedRoute><Layout><Placeholder name="Distributor Dashboard" desc="Distributor Operations" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/stockist" element={<ProtectedRoute><Layout><Placeholder name="Stockist Dashboard" desc="Stockist Operations" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/pharmacy" element={<ProtectedRoute><Layout><Placeholder name="Pharmacy Dashboard" desc="Pharmacy Operations" phase="4" /></Layout></ProtectedRoute>} />
        
        {/* Shared Protected Features Placeholders */}
        <Route path="/orders" element={<ProtectedRoute><Layout><Placeholder name="Order Tracking" desc="Track all your orders" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/orders/:orderCode" element={<ProtectedRoute><Layout><Placeholder name="Order Details" desc="Detailed view of an order" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/orders/create" element={<ProtectedRoute><Layout><Placeholder name="Create Order" desc="Dispatch a new order" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><Layout><Placeholder name="Scan QR" desc="Receive items via QR" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/batches" element={<ProtectedRoute><Layout><Placeholder name="Batches" desc="Track batches across supply chain" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/disputes" element={<ProtectedRoute><Layout><Placeholder name="Disputes" desc="Manage open disputes" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/schemes" element={<ProtectedRoute><Layout><Placeholder name="Schemes" desc="View promotional schemes" phase="4" /></Layout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Layout><Placeholder name="Analytics" desc="Platform analytics" phase="4" /></Layout></ProtectedRoute>} />
        
        {/* Public Routes Placeholders */}
        <Route path="/verify" element={<Placeholder name="Public Verification" desc="Verify a drug via QR" phase="4" />} />
        <Route path="/track/:batchNumber" element={<Placeholder name="Public Batch Track" desc="Track a specific batch" phase="4" />} />
      </Routes>
    </>
  );
}

export default App;
`);

writeFile('main.jsx', `
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
`);
