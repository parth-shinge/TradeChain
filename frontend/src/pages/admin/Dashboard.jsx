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
      <h1 className="text-2xl font-bold text-navy">Admin Dashboard</h1>
      
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
        <h2 className="text-lg font-semibold mb-4 text-navy">Order Pipeline</h2>
        <div className="flex items-center justify-between text-center px-8">
          <div className="flex flex-col"><div className="w-12 h-12 bg-navy text-white rounded-full flex items-center justify-center font-bold mx-auto mb-2">HQ</div><span className="text-sm">Factory</span></div>
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
            <h2 className="text-lg font-semibold mb-4 text-navy">Recent Orders</h2>
            <DataTable 
              columns={[
                { header: 'Order Code', accessor: 'order_code' },
                { header: 'From', accessor: 'from_sap_code' },
                { header: 'To', accessor: 'to_sap_code' },
                { header: 'Amount', cell: (row) => `$${row.total_amount}` },
                { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> }
              ]} 
              data={orders} 
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-navy">Claude AI Alerts</h2>
          <div className="bg-light rounded p-4 text-sm text-gray-500 italic text-center h-48 flex items-center justify-center border border-dashed border-gray-300">
            AI alerts will appear here (Phase 6)
          </div>
        </div>
      </div>
    </div>
  );
}