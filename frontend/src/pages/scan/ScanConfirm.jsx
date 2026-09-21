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
      const res = await api.get(`/orders/${orderCode}`);
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
      const res = await api.post(`/orders/${orderCode}/confirm`, payload);
      toast.success(res.data.message || 'Delivery confirmed');
      navigate(`/orders/${orderCode}`);
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
                        <input type="number" className={`border px-2 py-1 rounded w-24 ${receivedItems[it.material_sap_code] != it.quantity_dispatched ? 'border-danger bg-red-50 text-danger font-bold' : 'border-gray-300'}`} value={receivedItems[it.material_sap_code]} onChange={e => setReceivedItems({...receivedItems, [it.material_sap_code]: parseInt(e.target.value)})} />
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