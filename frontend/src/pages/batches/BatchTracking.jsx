import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import ExpiryBadge from '../../components/ExpiryBadge';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';

export default function BatchTracking() {
  const api = useApi();
  const [batchNum, setBatchNum] = useState('');
  const [data, setData] = useState(null);

  const search = async () => {
    if (!batchNum) return;
    try {
      const res = await api.get(`/public/batch/${batchNum}`);
      setData(res.data);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-navy mb-4">Batch Tracking</h1>
        <div className="flex max-w-md">
          <input type="text" className="border rounded-l px-4 py-2 w-full" placeholder="Enter Batch Number" value={batchNum} onChange={e => setBatchNum(e.target.value)} />
          <button onClick={search} className="bg-teal text-white px-6 py-2 rounded-r font-medium">Track</button>
        </div>
      </div>

      {data && data.batch && (
        <>
          <div className="bg-white p-6 rounded-lg shadow grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Drug Name</p>
              <p className="text-lg font-bold">{data.batch.drug_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Expiry</p>
              <ExpiryBadge date={data.batch.expiry_date} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-semibold">{data.batch.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cold Chain Required</p>
              <p className={`font-bold ${data.batch.requires_cold_chain ? 'text-cold-blue' : 'text-gray-600'}`}>{data.batch.requires_cold_chain ? 'YES' : 'NO'}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-navy mb-4">Journey</h2>
            <DataTable 
              columns={[
                { header: 'Order Code', accessor: 'order_code' },
                { header: 'From SAP', accessor: 'from_sap_code' },
                { header: 'To SAP', accessor: 'to_sap_code' },
                { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
                { header: 'Qty', accessor: 'quantity_dispatched' },
                { header: 'Date', cell: (row) => new Date(row.created_at).toLocaleDateString() }
              ]} 
              data={data.journey || []} 
            />
          </div>
        </>
      )}
    </div>
  );
}