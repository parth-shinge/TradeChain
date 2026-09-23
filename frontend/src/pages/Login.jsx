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
    if (user?.approved) navigate(user.role === 'ADMIN' ? '/admin' : `/${user.role.toLowerCase()}`);
    else if (user?.approved === false) setStep(3);
  }, [user, navigate]);

  useEffect(() => {
    let interval;
    if (step === 3) {
      interval = setInterval(async () => {
        const u = await checkAuth();
        if (u?.approved) navigate(u.role === 'ADMIN' ? '/admin' : `/${u.role.toLowerCase()}`);
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
    <div className="min-h-screen bg-navy flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
              <h3 className="text-lg font-medium text-navy mb-4">Register New Account</h3>
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
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy hover:bg-opacity-90">
                Submit Registration
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="animate-pulse bg-warning text-white p-4 rounded-lg mb-4">
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