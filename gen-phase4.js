const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

const mkdir = (dir) => {
    const fullPath = path.join(srcDir, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
};

mkdir('pages/orders');
mkdir('pages/scan');
mkdir('pages/batches');
mkdir('pages/cfa');
mkdir('pages/distributor');
mkdir('pages/stockist');
mkdir('pages/pharmacy');

const writeFile = (file, content) => {
    fs.writeFileSync(path.join(srcDir, file), content.trim());
    console.log(`Created ${file}`);
};

writeFile('pages/orders/OrderTracking.jsx', `
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
    if (filter !== 'ALL') url += \`?status=\${filter}\`;
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
                onClick={() => navigate(\`/orders/\${row.order_code}\`)}
                className="text-teal font-medium hover:underline"
              >
                {row.order_code}
              </button>
            ) },
            { header: 'From', accessor: 'from_sap_code' },
            { header: 'To', accessor: 'to_sap_code' },
            { header: 'Amount', cell: (row) => \`$\${row.total_amount}\` },
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
`);

writeFile('pages/orders/OrderDetail.jsx', `
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
    api.get(\`/orders/\${orderCode}\`).then(res => setOrder(res.data)).catch(console.error);
    api.get(\`/orders/\${orderCode}/qr\`, { responseType: 'blob' })
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
            { header: 'Amount', cell: (row) => \`$\${row.amount}\` }
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
              <p className={\`text-3xl font-bold \${hasColdChainBreak ? 'text-danger' : 'text-cold-blue'}\`}>{order.temperature_at_receipt || '-'}°C</p>
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
        {order.blockchain_tx_hash ? (
          <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded border">
            <span className="font-mono text-sm text-gray-600 truncate max-w-md">{order.blockchain_tx_hash}</span>
            <button className="text-teal hover:text-navy"><DocumentDuplicateIcon className="h-5 w-5" /></button>
            <a href={\`https://sepolia.etherscan.io/tx/\${order.blockchain_tx_hash}\`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">View on Etherscan</a>
          </div>
        ) : (
          <p className="text-gray-500">Not yet synced to blockchain</p>
        )}
      </div>
    </div>
  );
}
`);

writeFile('pages/orders/CreateOrder.jsx', `
import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CreateOrder() {
  const api = useApi();
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    toSapCode: '',
    billNumber: '',
    saleDate: new Date().toISOString().split('T')[0],
    temperatureAtDispatch: '',
    items: []
  });

  const [currentItem, setCurrentItem] = useState({
    materialSapCode: '',
    drugName: '',
    batchNumber: 'DEMO-BATCH', // Fallback
    quantityDispatched: 0,
    amount: 0
  });

  useEffect(() => {
    // Only load users for destination
    api.get('/users').then(res => {
       const allowedRoles = {
         'ADMIN': ['CFA'],
         'CFA': ['DISTRIBUTOR'],
         'DISTRIBUTOR': ['STOCKIST'],
         'STOCKIST': ['PHARMACY']
       };
       const targets = allowedRoles[user?.role] || [];
       setUsers(res.data.filter(u => targets.includes(u.role)));
    }).catch(console.error);

    api.get('/products').then(res => setProducts(res.data)).catch(console.error);
  }, [user]);

  const addItem = () => {
    if (!currentItem.materialSapCode || currentItem.quantityDispatched <= 0) return;
    const prod = products.find(p => p.material_sap_code === currentItem.materialSapCode);
    setForm({
      ...form, 
      items: [...form.items, { ...currentItem, drugName: prod?.drug_name || 'Unknown' }]
    });
    setCurrentItem({ materialSapCode: '', drugName: '', batchNumber: 'DEMO-BATCH', quantityDispatched: 0, amount: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) return toast.error('Add at least one item');
    try {
      const payload = {
        orderCode: 'TC-' + Date.now().toString().slice(-6),
        fromSapCode: user?.sap_code,
        orderLevel: 'PRIMARY',
        totalAmount: form.items.reduce((sum, item) => sum + parseFloat(item.amount), 0),
        ...form
      };
      const res = await api.post('/orders', payload);
      toast.success('Order created successfully!');
      navigate(\`/orders/\${res.data.order_code}\`);
    } catch (e) {
      toast.error('Failed to create order');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-navy">Create Dispatch Order</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <h2 className="text-lg font-semibold border-b pb-2 mb-4">1. Destination Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination (To)</label>
              <select required className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" value={form.toSapCode} onChange={e => setForm({...form, toSapCode: e.target.value})}>
                <option value="">Select Destination</option>
                {users.map(u => <option key={u.sap_code} value={u.sap_code}>{u.sap_name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bill Number</label>
              <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" value={form.billNumber} onChange={e => setForm({...form, billNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sale Date</label>
              <input required type="date" className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" value={form.saleDate} onChange={e => setForm({...form, saleDate: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dispatch Temp (°C)</label>
              <input required type="number" step="0.1" className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" value={form.temperatureAtDispatch} onChange={e => setForm({...form, temperatureAtDispatch: parseFloat(e.target.value)})} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold border-b pb-2 mb-4">2. Add Drugs</h2>
          <div className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700">Product</label>
              <select className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" value={currentItem.materialSapCode} onChange={e => setCurrentItem({...currentItem, materialSapCode: e.target.value})}>
                <option value="">Select Product</option>
                {products.map(p => <option key={p.material_sap_code} value={p.material_sap_code}>{p.drug_name}</option>)}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700">Qty</label>
              <input type="number" className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" value={currentItem.quantityDispatched} onChange={e => setCurrentItem({...currentItem, quantityDispatched: parseInt(e.target.value)})} />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700">Amount</label>
              <input type="number" className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" value={currentItem.amount} onChange={e => setCurrentItem({...currentItem, amount: parseFloat(e.target.value)})} />
            </div>
            <button type="button" onClick={addItem} className="bg-teal text-white py-2 px-4 rounded-md font-medium hover:bg-opacity-90">Add</button>
          </div>
          
          {form.items.length > 0 && (
            <div className="mt-4 border rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Drug</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {form.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm">{it.drugName}</td>
                      <td className="px-4 py-2 text-sm">{it.quantityDispatched}</td>
                      <td className="px-4 py-2 text-sm">\${it.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <button type="submit" className="w-full bg-navy text-white py-3 rounded-md font-bold text-lg hover:bg-opacity-90 shadow-md">
            Create Order & Generate QR
          </button>
        </div>
      </form>
    </div>
  );
}
`);

writeFile('pages/scan/ScanConfirm.jsx', `
import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useApi } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ColdChainAlert from '../../components/ColdChainAlert';

export default function ScanConfirm() {
  const api = useApi();
  const navigate = useNavigate();
  const [orderCode, setOrderCode] = useState('');
  const [order, setOrder] = useState(null);
  const [tempReceipt, setTempReceipt] = useState('');
  const [receivedItems, setReceivedItems] = useState({});

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 });
    scanner.render((text) => {
      try {
        const payload = JSON.parse(text);
        if (payload.order_code) {
          setOrderCode(payload.order_code);
          scanner.clear();
        }
      } catch (e) {
        setOrderCode(text);
        scanner.clear();
      }
    }, (err) => {});
    return () => scanner.clear().catch(e => {});
  }, []);

  const fetchOrder = async () => {
    if (!orderCode) return;
    try {
      const res = await api.get(\`/orders/\${orderCode}\`);
      setOrder(res.data);
      const initialItems = {};
      res.data.items?.forEach(it => initialItems[it.material_sap_code] = it.quantity_dispatched);
      setReceivedItems(initialItems);
      toast.success('Order details loaded');
    } catch (e) { toast.error('Order not found'); }
  };

  const handleConfirm = async () => {
    try {
      const payload = {
        temperatureAtReceipt: parseFloat(tempReceipt),
        items: order.items.map(it => ({
          materialSapCode: it.material_sap_code,
          quantityReceived: receivedItems[it.material_sap_code] || 0
        }))
      };
      const res = await api.post(\`/orders/\${orderCode}/confirm\`, payload);
      toast.success(res.data.message || 'Delivery confirmed');
      navigate(\`/orders/\${orderCode}\`);
    } catch (e) { toast.error('Confirmation failed'); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-navy">Scan & Confirm Delivery</h1>
      
      {!order ? (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <div id="qr-reader" className="w-full max-w-sm mx-auto overflow-hidden rounded"></div>
          <div className="text-center">
            <p className="text-gray-500 mb-2">Or enter Order Code manually:</p>
            <div className="flex justify-center max-w-sm mx-auto">
              <input type="text" className="border rounded-l px-4 py-2 w-full" value={orderCode} onChange={e => setOrderCode(e.target.value)} placeholder="TC-123456" />
              <button onClick={fetchOrder} className="bg-teal text-white px-4 py-2 rounded-r font-medium">Fetch</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <h2 className="text-xl font-bold text-navy border-b pb-2">Order: {order.order_code}</h2>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">Expected Items</h3>
            <div className="border rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr><th className="px-4 py-2 text-left">Drug</th><th className="px-4 py-2 text-left">Expected</th><th className="px-4 py-2 text-left">Received</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items?.map(it => (
                    <tr key={it.material_sap_code}>
                      <td className="px-4 py-3">{it.drug_name}</td>
                      <td className="px-4 py-3">{it.quantity_dispatched}</td>
                      <td className="px-4 py-3">
                        <input type="number" className={\`border px-2 py-1 rounded w-24 \${receivedItems[it.material_sap_code] != it.quantity_dispatched ? 'border-danger bg-red-50 text-danger font-bold' : 'border-gray-300'}\`} value={receivedItems[it.material_sap_code]} onChange={e => setReceivedItems({...receivedItems, [it.material_sap_code]: parseInt(e.target.value)})} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Temperature at Receipt (°C)</label>
            <input required type="number" step="0.1" className="border border-gray-300 rounded-md py-2 px-3 w-48 text-lg font-bold" value={tempReceipt} onChange={e => setTempReceipt(e.target.value)} />
          </div>

          <button onClick={handleConfirm} className="w-full bg-mint text-white py-3 rounded-md font-bold text-lg shadow hover:bg-opacity-90">
            Confirm Delivery
          </button>
        </div>
      )}
    </div>
  );
}
`);

writeFile('pages/batches/BatchTracking.jsx', `
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
      const res = await api.get(\`/public/batch/\${batchNum}\`);
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
              <p className={\`font-bold \${data.batch.requires_cold_chain ? 'text-cold-blue' : 'text-gray-600'}\`}>{data.batch.requires_cold_chain ? 'YES' : 'NO'}</p>
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
`);

writeFile('pages/cfa/Dashboard.jsx', `
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
`);

writeFile('pages/distributor/Dashboard.jsx', `
import React from 'react';
import StatsCard from '../../components/StatsCard';
import { TruckIcon, ClipboardDocumentCheckIcon, ShieldExclamationIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function DistributorDashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Distributor Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={TruckIcon} label="Total Orders" value="340" />
        <StatsCard icon={ClipboardDocumentCheckIcon} label="Delivered" value="315" />
        <StatsCard icon={ShieldExclamationIcon} label="Disputes" value="2" trend="Down" trendUp={true} />
        <StatsCard icon={ChartBarIcon} label="Compliance Rate" value="99.4%" />
      </div>
      <div className="flex gap-4">
        <button onClick={() => navigate('/orders/create')} className="bg-teal text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-opacity-90">Create Dispatch</button>
        <button onClick={() => navigate('/batches')} className="bg-navy text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-opacity-90">Track Batch</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow h-64 flex items-center justify-center text-gray-500">Route Stats Placeholder</div>
    </div>
  );
}
`);

writeFile('pages/stockist/Dashboard.jsx', `
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
`);

writeFile('pages/pharmacy/Dashboard.jsx', `
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
import CFADashboard from './pages/cfa/Dashboard';
import DistributorDashboard from './pages/distributor/Dashboard';
import StockistDashboard from './pages/stockist/Dashboard';
import PharmacyDashboard from './pages/pharmacy/Dashboard';
import OrderTracking from './pages/orders/OrderTracking';
import OrderDetail from './pages/orders/OrderDetail';
import CreateOrder from './pages/orders/CreateOrder';
import ScanConfirm from './pages/scan/ScanConfirm';
import BatchTracking from './pages/batches/BatchTracking';
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
        
        {/* Role Dashboards */}
        <Route path="/cfa" element={<ProtectedRoute allowedRoles={['CFA']}><Layout><CFADashboard /></Layout></ProtectedRoute>} />
        <Route path="/distributor" element={<ProtectedRoute allowedRoles={['DISTRIBUTOR']}><Layout><DistributorDashboard /></Layout></ProtectedRoute>} />
        <Route path="/stockist" element={<ProtectedRoute allowedRoles={['STOCKIST']}><Layout><StockistDashboard /></Layout></ProtectedRoute>} />
        <Route path="/pharmacy" element={<ProtectedRoute allowedRoles={['PHARMACY']}><Layout><PharmacyDashboard /></Layout></ProtectedRoute>} />
        
        {/* Operations */}
        <Route path="/orders" element={<ProtectedRoute><Layout><OrderTracking /></Layout></ProtectedRoute>} />
        <Route path="/orders/create" element={<ProtectedRoute allowedRoles={['ADMIN', 'CFA', 'DISTRIBUTOR', 'STOCKIST']}><Layout><CreateOrder /></Layout></ProtectedRoute>} />
        <Route path="/orders/:orderCode" element={<ProtectedRoute><Layout><OrderDetail /></Layout></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><Layout><ScanConfirm /></Layout></ProtectedRoute>} />
        <Route path="/batches" element={<ProtectedRoute><Layout><BatchTracking /></Layout></ProtectedRoute>} />
        
        {/* Phase 5/6 Placeholders */}
        <Route path="/disputes" element={<ProtectedRoute><Layout><Placeholder name="Disputes" desc="Manage open disputes" phase="5" /></Layout></ProtectedRoute>} />
        <Route path="/schemes" element={<ProtectedRoute><Layout><Placeholder name="Schemes" desc="View promotional schemes" phase="5" /></Layout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Layout><Placeholder name="Analytics" desc="Platform analytics" phase="6" /></Layout></ProtectedRoute>} />
        
        {/* Public Routes */}
        <Route path="/verify" element={<Placeholder name="Public Verification" desc="Verify a drug via QR" phase="5" />} />
        <Route path="/track/:batchNumber" element={<Placeholder name="Public Batch Track" desc="Track a specific batch" phase="5" />} />
      </Routes>
    </>
  );
}

export default App;
`);
