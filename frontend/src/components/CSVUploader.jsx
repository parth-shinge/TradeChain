import React, { useCallback, useState } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function CSVUploader({ onUpload }) {
  const [file, setFile] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'text/csv') setFile(dropped);
  };

  const handleChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const handleUpload = () => {
    if (file && onUpload) onUpload(file);
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900">Upload CSV File</h3>
      <p className="mt-1 text-sm text-gray-500">Drag and drop your file here, or click to select</p>
      <input type="file" accept=".csv" className="hidden" id="file-upload" onChange={handleChange} />
      <label htmlFor="file-upload" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal hover:bg-opacity-90 cursor-pointer">
        Select File
      </label>
      {file && (
        <div className="mt-4">
          <p className="text-sm font-medium text-navy">Selected: {file.name}</p>
          <button onClick={handleUpload} className="mt-2 px-4 py-2 bg-navy text-white rounded">Upload</button>
        </div>
      )}
    </div>
  );
}