import React from 'react';

export default function ExpiryBadge({ date }) {
  const days = Math.floor((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  let color = 'bg-green-100 text-green-800 border-green-200';
  if (days < 0) color = 'bg-gray-800 text-white border-black';
  else if (days < 30) color = 'bg-danger text-white border-danger';
  else if (days < 90) color = 'bg-warning text-white border-warning';

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold border ${color}`}>
      {days < 0 ? 'Expired' : `${days} days`}
    </span>
  );
}