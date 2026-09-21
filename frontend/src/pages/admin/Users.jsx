import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import DataTable from '../../components/DataTable';
import toast from 'react-hot-toast';

export default function Users() {
  const api = useApi();
  const [tab, setTab] = useState(1);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);

  const fetchData = async () => {
    try {
      const [u, p] = await Promise.all([
        api.get('/users'),
        api.get('/users/pending')
      ]);
      setUsers(u.data);
      setPending(p.data);
    } catch (e) {
      toast.error('Failed to load users');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/users/${id}/approve`);
      toast.success('User approved');
      fetchData();
    } catch (e) { toast.error('Action failed'); }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/users/${id}/reject`);
      toast.success('User rejected');
      fetchData();
    } catch (e) { toast.error('Action failed'); }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button onClick={() => setTab(1)} className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${tab === 1 ? 'border-warning text-warning' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Pending Approvals ({pending.length})
          </button>
          <button onClick={() => setTab(2)} className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${tab === 2 ? 'border-teal text-teal' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            All Users
          </button>
        </nav>
      </div>

      <div className="p-6">
        {tab === 1 && (
          <DataTable 
            columns={[
              { header: 'Name', accessor: 'sap_name' },
              { header: 'SAP Code', accessor: 'sap_code' },
              { header: 'Role', accessor: 'role' },
              { header: 'City', accessor: 'city' },
              { header: 'Actions', cell: (row) => (
                <div className="space-x-2">
                  <button onClick={() => handleApprove(row.id)} className="bg-mint text-white px-3 py-1 rounded text-xs">Approve</button>
                  <button onClick={() => handleReject(row.id)} className="bg-danger text-white px-3 py-1 rounded text-xs">Reject</button>
                </div>
              )}
            ]} 
            data={pending} 
          />
        )}
        
        {tab === 2 && (
          <DataTable 
            columns={[
              { header: 'Name', accessor: 'sap_name' },
              { header: 'SAP Code', accessor: 'sap_code' },
              { header: 'Role', cell: (row) => <span className="bg-gray-100 px-2 py-1 rounded text-xs">{row.role}</span> },
              { header: 'City', accessor: 'city' },
              { header: 'Status', cell: (row) => <span className={row.approved ? 'text-green-600' : 'text-warning'}>{row.approved ? 'Approved' : 'Pending'}</span> }
            ]} 
            data={users} 
          />
        )}
      </div>
    </div>
  );
}