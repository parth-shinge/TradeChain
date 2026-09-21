import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import CSVUploader from '../../components/CSVUploader';
import toast from 'react-hot-toast';

export default function SAPImport() {
  const api = useApi();
  const [tab, setTab] = useState(1);
  const [generateCount, setGenerateCount] = useState(10);
  const [batchData, setBatchData] = useState({ productId: '', batchNumber: '', manufactureDate: '', expiryDate: '', quantityManufactured: 0 });

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/mock-sap/import', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success('CSV Imported Successfully');
    } catch (e) { toast.error('Import failed'); }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/mock-sap/generate', { count: generateCount });
      toast.success(`Generated ${generateCount} orders`);
    } catch (e) { toast.error('Generation failed'); }
  };

  const handleBatch = async (e) => {
    e.preventDefault();
    try {
      await api.post('/batches', batchData);
      toast.success('Batch registered');
    } catch (e) { toast.error('Batch registration failed'); }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {['CSV Import', 'Generate Mock Data', 'Batch Registration'].map((name, i) => (
            <button key={name} onClick={() => setTab(i+1)} className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${tab === i+1 ? 'border-teal text-teal' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {name}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {tab === 1 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Import SAP Data</h2>
            <CSVUploader onUpload={handleUpload} />
          </div>
        )}
        
        {tab === 2 && (
          <form onSubmit={handleGenerate} className="max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Generate Random Orders</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Orders</label>
              <input type="number" min="1" max="100" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal focus:border-teal sm:text-sm" value={generateCount} onChange={(e) => setGenerateCount(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-teal border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-opacity-90">Generate</button>
          </form>
        )}

        {tab === 3 && (
          <form onSubmit={handleBatch} className="max-w-lg mx-auto space-y-4">
             <h2 className="text-lg font-medium text-gray-900">Register New Batch</h2>
             <input required placeholder="Product ID (UUID)" className="w-full px-3 py-2 border rounded" value={batchData.productId} onChange={e => setBatchData({...batchData, productId: e.target.value})} />
             <input required placeholder="Batch Number" className="w-full px-3 py-2 border rounded" value={batchData.batchNumber} onChange={e => setBatchData({...batchData, batchNumber: e.target.value})} />
             <input required type="date" placeholder="Manufacture Date" className="w-full px-3 py-2 border rounded" value={batchData.manufactureDate} onChange={e => setBatchData({...batchData, manufactureDate: e.target.value})} />
             <input required type="date" placeholder="Expiry Date" className="w-full px-3 py-2 border rounded" value={batchData.expiryDate} onChange={e => setBatchData({...batchData, expiryDate: e.target.value})} />
             <input required type="number" placeholder="Quantity" className="w-full px-3 py-2 border rounded" value={batchData.quantityManufactured} onChange={e => setBatchData({...batchData, quantityManufactured: parseInt(e.target.value)})} />
             <button type="submit" className="w-full bg-navy text-white py-2 rounded">Register Batch</button>
          </form>
        )}
      </div>
    </div>
  );
}