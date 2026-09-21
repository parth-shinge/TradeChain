import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

export default function ColdChainAlert({ drugName, temp, threshold }) {
  return (
    <div className="bg-danger text-white p-4 rounded-lg shadow flex items-start mb-4 border-l-4 border-danger">
      <ExclamationTriangleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
      <div>
        <h4 className="font-bold uppercase tracking-wider">Cold Chain Break</h4>
        <p className="mt-1 text-sm">
          <strong>{drugName}</strong> recorded at {temp}°C (Threshold: {threshold}°C)
        </p>
      </div>
    </div>
  );
}