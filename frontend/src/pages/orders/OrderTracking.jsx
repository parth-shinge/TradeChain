import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ColdChainAlert from '../../components/ColdChainAlert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function OrderTracking() {
  const api = useApi();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let url = '/orders';
    if (filter !== 'ALL') url += `?status=${filter}`;
    api.get(url).then(res => setOrders(res.data)).catch(console.error);
  }, [filter]);

  const filteredOrders = orders.filter(o => 
    o.order_code.toLowerCase().includes(search.toLowerCase()) || 
    (o.from_user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.to_user_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-navy">Order Tracking</h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row gap-4">
        <select 
          className="border rounded px-3 py-2"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">ALL</option>
          <option value="CREATED">CREATED</option>
          <option value="DISPATCHED">DISPATCHED</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="DISPUTED">DISPUTED</option>
        </select>
        <input 
          type="text" 
          placeholder="Search Order Code, From, To..." 
          className="border rounded px-3 py-2 flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <DataTable 
          columns={[
            { header: 'Order Code', cell: (row) => (
              <button 
                onClick={() => navigate(`/orders/${row.order_code}`)}
                className="text-teal font-medium hover:underline"
              >
                {row.order_code}
              </button>
            ) },
            { header: 'From', accessor: 'from_sap_code' },
            { header: 'To', accessor: 'to_sap_code' },
            { header: 'Amount', cell: (row) => `$${row.total_amount}` },
            { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
            { header: 'Temp Alert', cell: (row) => row.temperature_at_receipt > 8 ? <ExclamationTriangleIcon className="h-5 w-5 text-danger" /> : '-' },
            { header: 'Date', cell: (row) => new Date(row.created_at).toLocaleDateString() }
          ]} 
          data={filteredOrders} 
        />
      </div>
    </div>
  );
}