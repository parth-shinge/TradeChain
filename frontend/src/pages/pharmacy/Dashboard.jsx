import React, { useState, useEffect } from 'react';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { TruckIcon, ExclamationTriangleIcon, BuildingStorefrontIcon, CurrencyDollarIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const api = useApi();
  const [schemes, setSchemes] = useState([]);
  const [loadingSchemes, setLoadingSchemes] = useState(true);

  useEffect(() => {
    api.get('/schemes')
      .then((res) => {
        setSchemes(res.data);
        setLoadingSchemes(false);
      })
      .catch(() => setLoadingSchemes(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Pharmacy Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={BuildingStorefrontIcon} label="Orders This Month" value="85" />
        <StatsCard icon={TruckIcon} label="Pending Confirmations" value="3" />
        <StatsCard icon={ExclamationTriangleIcon} label="Disputes Raised" value="1" />
        <StatsCard icon={CurrencyDollarIcon} label="Active Schemes" value={schemes.length} />
      </div>
      <button onClick={() => navigate('/scan')} className="w-full bg-mint text-white py-8 rounded-xl font-bold text-2xl shadow-lg hover:bg-opacity-90 transform hover:scale-[1.01] transition">
        Scan QR to Confirm Delivery
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Schemes Panel */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-teal">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-navy">Active Schemes</h2>
            <button onClick={() => navigate('/schemes')} className="text-teal text-sm font-medium hover:underline">View All →</button>
          </div>
          {loadingSchemes ? (
            <LoadingSpinner />
          ) : schemes.length === 0 ? (
            <p className="text-gray-400 text-center py-6">No active schemes</p>
          ) : (
            <div className="space-y-3">
              {schemes.slice(0, 3).map((s) => (
                <div key={s.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-teal transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm text-navy">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.product_material_sap_code} · Valid till {new Date(s.valid_to).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium border border-green-200">Active</span>
                  </div>
                  {s.terms && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{s.terms}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cold Chain Alerts */}
        <div className="bg-white p-6 rounded-lg shadow h-48 flex items-center justify-center text-gray-500 border-l-4 border-danger">Cold Chain Alerts</div>
      </div>
    </div>
  );
}