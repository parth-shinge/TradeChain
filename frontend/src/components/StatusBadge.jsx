import React from 'react';

export default function StatusBadge({ status }) {
  const colors = {
    CREATED: 'bg-gray-100 text-gray-800 border-gray-200',
    DISPATCHED: 'bg-blue-100 text-blue-800 border-blue-200',
    DELIVERED: 'bg-green-100 text-green-800 border-green-200',
    DISPUTED: 'bg-danger text-white border-danger'
  };

  const classes = colors[status] || colors.CREATED;

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {status}
    </span>
  );
}