import React from 'react';

export default function Placeholder({ name, desc, phase }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <h1 className="text-3xl font-bold text-navy mb-2">{name}</h1>
      <p className="text-gray-600 mb-6">{desc}</p>
      <span className="bg-warning text-white px-4 py-2 rounded-full font-semibold">Coming in Phase {phase}</span>
    </div>
  );
}