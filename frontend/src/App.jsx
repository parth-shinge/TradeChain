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