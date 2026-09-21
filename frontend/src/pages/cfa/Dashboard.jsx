import React from 'react';
import StatsCard from '../../components/StatsCard';
import { TruckIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function CFADashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">CFA Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={ArrowDownTrayIcon} label="Orders Received" value="45" />
        <StatsCard icon={ArrowUpTrayIcon} label="Orders Dispatched" value="120" />
        <StatsCard icon={TruckIcon} label="Pending Confirmations" value="5" />
        <StatsCard icon={ShieldExclamationIcon} label="Cold Chain Alerts" value="0" />
      </div>
      <div className="flex gap-4">
        <button onClick={() => navigate('/scan')} className="bg-mint text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-opacity-90">Confirm Receipt</button>
        <button onClick={() => navigate('/orders/create')} className="bg-teal text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-opacity-90">Create Dispatch</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow h-64 flex items-center justify-center text-gray-500">Recent Orders Table Placeholder</div>
    </div>
  );
}