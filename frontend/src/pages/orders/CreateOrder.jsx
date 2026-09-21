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
      navigate(`/orders/${res.data.order_code}`);
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
                      <td className="px-4 py-2 text-sm">${it.amount}</td>
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