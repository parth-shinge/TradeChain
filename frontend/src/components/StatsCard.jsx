import React from 'react';

export default function StatsCard({ icon: Icon, label, value, trend, trendUp }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-center">
      <div className="p-3 rounded-full bg-teal bg-opacity-10 text-teal mr-4">
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
        <div className="flex items-baseline mt-1">
          <p className="text-2xl font-bold text-navy">{value}</p>
          {trend && (
            <span className={`ml-2 text-sm font-medium ${trendUp ? 'text-mint' : 'text-danger'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}