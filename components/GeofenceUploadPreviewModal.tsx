


import React, { useState } from 'react';
import type { GeofenceFormData } from '../types';

interface ParsedRow {
    data: GeofenceFormData & { layer: any };
    rowIndex: number;
}

interface InvalidRow {
    error: string;
    originalRow: string[];
    rowIndex: number;
}

interface GeofenceUploadPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rowsToUpload: ParsedRow[]) => Promise<void>;
  validRows: ParsedRow[];
  invalidRows: InvalidRow[];
}

export const GeofenceUploadPreviewModal: React.FC<GeofenceUploadPreviewModalProps> = ({ isOpen, onClose, onConfirm, validRows, invalidRows }) => {
    const [activeTab, setActiveTab] = useState<'valid' | 'errors'>('valid');
    const [isUploading, setIsUploading] = useState(false);
    
    const handleConfirm = async () => {
        setIsUploading(true);
        await onConfirm(validRows);
        setIsUploading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-preview-title"
            >
                <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 id="upload-preview-title" className="text-xl font-bold">Confirm Geofence Upload</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Found <span className="font-semibold text-green-600 dark:text-green-400">{validRows.length} valid</span> geofences and <span className="font-semibold text-red-600 dark:text-red-400">{invalidRows.length} invalid</span> rows.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 text-2xl" aria-label="Close modal">&times;</button>
                </header>

                <main className="flex-grow min-h-0 p-4">
                    <div className="border-b border-gray-200 dark:border-slate-700">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('valid')}
                                className={`${activeTab === 'valid' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                            >
                                Valid Rows ({validRows.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('errors')}
                                className={`${activeTab === 'errors' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                            >
                                Errors ({invalidRows.length})
                            </button>
                        </nav>
                    </div>
                    <div className="mt-4 h-[calc(100%-3rem)] overflow-y-auto">
                        {activeTab === 'valid' && (
                             <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-gray-50 dark:bg-slate-700">
                                    <tr>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Row</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Notification</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {validRows.map(row => (
                                        <tr key={row.rowIndex}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-500">{row.rowIndex}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{row.data.name}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{row.data.description}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">{row.data.notification || 'NONE'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                         {activeTab === 'errors' && (
                             <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-gray-50 dark:bg-slate-700">
                                    <tr>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Row</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Error</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Original Data</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {invalidRows.map(row => (
                                        <tr key={row.rowIndex}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-500">{row.rowIndex}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">{row.error}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono text-xs truncate max-w-md">{row.originalRow.join(', ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>

                <footer className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
                    <button onClick={onClose} disabled={isUploading} className="py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium">Cancel</button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isUploading || validRows.length === 0} 
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                        {isUploading ? 'Uploading...' : `Upload ${validRows.length} Geofences`}
                    </button>
                </footer>
            </div>
        </div>
    );
};