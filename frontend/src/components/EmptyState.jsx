import React from 'react';

export default function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-gray-400">
      <Icon className="h-16 w-16 mb-4 text-gray-300" />
      <p className="text-lg">{message}</p>
    </div>
  );
}