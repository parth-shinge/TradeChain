import React from 'react';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function WalletButton({ address }) {
  if (!address) return <button className="bg-teal text-white px-4 py-2 rounded">Connect Wallet</button>;
  
  const truncate = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied');
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 border border-gray-300">
      <div className="h-2 w-2 bg-mint rounded-full mr-2"></div>
      <span className="text-sm text-gray-700 font-mono mr-2">{truncate(address)}</span>
      <button onClick={handleCopy} className="text-gray-500 hover:text-teal focus:outline-none">
        <DocumentDuplicateIcon className="h-4 w-4" />
      </button>
    </div>
  );
}