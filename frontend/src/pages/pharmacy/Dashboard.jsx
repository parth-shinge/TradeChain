import React from 'react';
import StatsCard from '../../components/StatsCard';
import { TruckIcon, ExclamationTriangleIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Pharmacy Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={BuildingStorefrontIcon} label="Orders This Month" value="85" />
        <StatsCard icon={TruckIcon} label="Pending Confirmations" value="3" />
        <StatsCard icon={ExclamationTriangleIcon} label="Disputes Raised" value="1" />
      </div>
      <button onClick={() => navigate('/scan')} className="w-full bg-mint text-white py-8 rounded-xl font-bold text-2xl shadow-lg hover:bg-opacity-90 transform hover:scale-[1.01] transition">
        Scan QR to Confirm Delivery
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow h-48 flex items-center justify-center text-gray-500 border-l-4 border-teal">Active Schemes Panel</div>
        <div className="bg-white p-6 rounded-lg shadow h-48 flex items-center justify-center text-gray-500 border-l-4 border-danger">Cold Chain Alerts</div>
      </div>
    </div>
  );
}