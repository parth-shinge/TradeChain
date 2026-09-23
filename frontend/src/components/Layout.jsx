import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { HomeIcon, ArrowRightOnRectangleIcon, TruckIcon, UsersIcon, ShieldExclamationIcon, CurrencyDollarIcon, ChartBarIcon, QrCodeIcon, DocumentArrowDownIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import WalletButton from './WalletButton';

export default function Layout({ children }) {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = {
    ADMIN: [
      { name: 'Dashboard', path: '/admin', icon: HomeIcon },
      { name: 'SAP Import', path: '/admin/sap-import', icon: DocumentArrowDownIcon },
      { name: 'Orders', path: '/orders', icon: TruckIcon },
      { name: 'Batch Tracking', path: '/batches', icon: QrCodeIcon },
      { name: 'Disputes', path: '/disputes', icon: ShieldExclamationIcon },
      { name: 'Schemes', path: '/schemes', icon: CurrencyDollarIcon },
      { name: 'Analytics', path: '/analytics', icon: ChartBarIcon },
      { name: 'Users', path: '/admin/users', icon: UsersIcon },
    ],
    CFA: [
      { name: 'Dashboard', path: '/cfa', icon: HomeIcon },
      { name: 'Orders', path: '/orders', icon: TruckIcon },
      { name: 'Dispatch', path: '/orders/create', icon: DocumentArrowUpIcon },
      { name: 'Batch Tracking', path: '/batches', icon: QrCodeIcon },
      { name: 'Disputes', path: '/disputes', icon: ShieldExclamationIcon },
      { name: 'Schemes', path: '/schemes', icon: CurrencyDollarIcon },
    ],
    DISTRIBUTOR: [
      { name: 'Dashboard', path: '/distributor', icon: HomeIcon },
      { name: 'Orders', path: '/orders', icon: TruckIcon },
      { name: 'Dispatch', path: '/orders/create', icon: DocumentArrowUpIcon },
      { name: 'Batch Tracking', path: '/batches', icon: QrCodeIcon },
      { name: 'Disputes', path: '/disputes', icon: ShieldExclamationIcon },
      { name: 'Schemes', path: '/schemes', icon: CurrencyDollarIcon },
    ],
    STOCKIST: [
      { name: 'Dashboard', path: '/stockist', icon: HomeIcon },
      { name: 'Orders', path: '/orders', icon: TruckIcon },
      { name: 'Dispatch', path: '/orders/create', icon: DocumentArrowUpIcon },
      { name: 'Batch Tracking', path: '/batches', icon: QrCodeIcon },
      { name: 'Disputes', path: '/disputes', icon: ShieldExclamationIcon },
      { name: 'Schemes', path: '/schemes', icon: CurrencyDollarIcon },
    ],
    PHARMACY: [
      { name: 'Dashboard', path: '/pharmacy', icon: HomeIcon },
      { name: 'Incoming Orders', path: '/orders', icon: TruckIcon },
      { name: 'Scan QR', path: '/scan', icon: QrCodeIcon },
      { name: 'Disputes', path: '/disputes', icon: ShieldExclamationIcon },
      { name: 'Schemes', path: '/schemes', icon: CurrencyDollarIcon },
    ]
  };

  const navItems = user && user.role ? menuItems[user.role] || [] : [];

  return (
    <div className="flex h-screen bg-light overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-navy text-white flex flex-col">
        <div className="p-4 text-2xl font-bold text-mint border-b border-gray-700">TradeChain</div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link to={item.path} className="flex items-center px-4 py-3 hover:bg-teal hover:text-white transition">
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-navy">{user?.sap_name}</span>
            <span className="bg-teal text-white text-xs px-2 py-1 rounded-full font-medium">{user?.role}</span>
          </div>
          <div className="flex items-center space-x-4">
            <WalletButton address={user?.wallet_address} />
            <button onClick={handleLogout} className="text-gray-500 hover:text-danger flex items-center">
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" /> Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-light">
          {children}
        </main>
      </div>
    </div>
  );
}