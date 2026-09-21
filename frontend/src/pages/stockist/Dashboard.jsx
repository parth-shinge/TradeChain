import React from 'react';
import StatsCard from '../../components/StatsCard';
import { TruckIcon, ArrowDownTrayIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function StockistDashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Stockist Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={TruckIcon} label="Total Orders" value="180" />
        <StatsCard icon={ArrowDownTrayIcon} label="Pending" value="12" />
        <StatsCard icon={ShieldExclamationIcon} label="Disputes" value="1" />
      </div>
      <div className="flex gap-4">
        <button onClick={() => navigate('/orders/create')} className="bg-teal text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-opacity-90">Create Dispatch</button>
        <button onClick={() => navigate('/scan')} className="bg-mint text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-opacity-90">Scan QR</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow h-64 flex items-center justify-center text-gray-500">Inventory Status Placeholder</div>
    </div>
  );
}