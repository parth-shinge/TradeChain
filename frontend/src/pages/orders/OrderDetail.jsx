import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuthContext } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import ExpiryBadge from '../../components/ExpiryBadge';
import ColdChainAlert from '../../components/ColdChainAlert';
import DataTable from '../../components/DataTable';
import { QrCodeIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

export default function OrderDetail() {
  const { orderCode } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [order, setOrder] = useState(null);
  const [qrBlob, setQrBlob] = useState(null);

  useEffect(() => {
    api.get(`/orders/${orderCode}`).then(res => setOrder(res.data)).catch(console.error);
    api.get(`/orders/${orderCode}/qr`, { responseType: 'blob' })
       .then(res => setQrBlob(URL.createObjectURL(res.data)))
       .catch(console.error);
  }, [orderCode]);

  if (!order) return <div className="p-4 text-center">Loading...</div>;

  const isReceiver = user?.sap_code === order.to_sap_code;
  const showConfirm = order.status === 'DISPATCHED' && isReceiver;

  const hasColdChainBreak = order.items?.some(item => item.max_temp_celsius && order.temperature_at_receipt > item.max_temp_celsius);

  return (
    <div className="space-y-6">
      {hasColdChainBreak && (
        <div className="bg-danger text-white p-4 rounded shadow font-bold text-lg text-center">
          COLD CHAIN BREAK DETECTED
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy mb-2">Order {order.order_code}</h1>
            <p className="text-gray-500 mb-2">Bill Number: {order.bill_number}</p>
            <StatusBadge status={order.status} />
          </div>
          {showConfirm && (
            <button 
              onClick={() => navigate('/scan')}
              className="bg-teal text-white px-6 py-2 rounded shadow hover:bg-opacity-90 font-bold"
            >
              Confirm Delivery
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
          <div>
            <p className="text-sm text-gray-500">From</p>
            <p className="font-bold">{order.from_user_name || order.from_sap_code}</p>
            <p className="text-sm text-gray-500">{order.from_sap_code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">To</p>
            <p className="font-bold">{order.to_user_name || order.to_sap_code}</p>
            <p className="text-sm text-gray-500">{order.to_sap_code}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-navy mb-4">Items</h2>
        <DataTable 
          columns={[
            { header: 'Drug Name', accessor: 'drug_name' },
            { header: 'SAP Code', accessor: 'material_sap_code' },
            { header: 'Batch', accessor: 'batch_number' },
            { header: 'Qty Dispatched', accessor: 'quantity_dispatched' },
            { header: 'Qty Received', accessor: 'quantity_received' },
            { header: 'Mismatch', cell: (row) => row.quantity_mismatch > 0 ? <span className="text-danger font-bold">{row.quantity_mismatch}</span> : '-' },
            { header: 'Expiry', cell: (row) => row.expiry_date ? <ExpiryBadge date={row.expiry_date} /> : '-' },
            { header: 'Amount', cell: (row) => `$${row.amount}` }
          ]} 
          data={order.items || []} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-navy mb-4">Temperature Log</h2>
          <div className="flex justify-around items-center">
            <div className="text-center">
              <p className="text-sm text-gray-500">At Dispatch</p>
              <p className="text-3xl font-bold text-cold-blue">{order.temperature_at_dispatch || '-'}°C</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">At Receipt</p>
              <p className={`text-3xl font-bold ${hasColdChainBreak ? 'text-danger' : 'text-cold-blue'}`}>{order.temperature_at_receipt || '-'}°C</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-bold text-navy mb-4 w-full text-left">QR Code</h2>
          {qrBlob ? (
             <>
               <img src={qrBlob} alt="Order QR Code" className="w-48 h-48 mb-4 border p-2 rounded" />
               <button onClick={() => window.print()} className="flex items-center text-teal hover:underline font-medium">
                 <QrCodeIcon className="h-5 w-5 mr-1" /> Print QR
               </button>
             </>
          ) : (
             <p className="text-gray-500">QR not generated</p>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-navy mb-4">Blockchain Proof</h2>
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-sm font-medium">Status:</span>
          {order.blockchain_status === 'CONFIRMED' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">🟢 Confirmed</span>}
          {order.blockchain_status === 'PENDING' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">🟡 Pending</span>}
          {order.blockchain_status === 'FAILED' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800" title={order.blockchain_error || ''}>🔴 Failed</span>}
          {!order.blockchain_status && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Not synced</span>}
        </div>
        {order.blockchain_tx_hash ? (
          <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded border">
            <span className="font-mono text-sm text-gray-600 truncate max-w-md">{order.blockchain_tx_hash}</span>
            <button className="text-teal hover:text-navy"><DocumentDuplicateIcon className="h-5 w-5" /></button>
            <a href={`https://sepolia.etherscan.io/tx/${order.blockchain_tx_hash}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">View on Etherscan</a>
          </div>
        ) : (
          <p className="text-gray-500">Transaction hash not yet available</p>
        )}
      </div>
    </div>
  );
}