
import React, { useState } from 'react';
import type { GeofenceFormData } from '../types';
import { useTranslation } from '../i18n/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

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
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'valid' | 'errors'>('valid');
    const [isUploading, setIsUploading] = useState(false);
    const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
    
    const handleConfirm = async () => {
        setIsUploading(true);
        await onConfirm(validRows);
        setIsUploading(false);
    };

    if (!isOpen) return null;

    const summaryText = t('geofenceUpload.summary', {
        validCount: validRows.length,
        invalidCount: invalidRows.length
    }).replace('<valid>', '<span class="font-semibold text-green-600 dark:text-green-400">')
      .replace('</valid>', '</span>')
      .replace('<invalid>', '<span class="font-semibold text-alert-red dark:text-red-400">')
      .replace('</invalid>', '</span>');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4" onClick={onClose}>
            <div 
                ref={modalRef}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col focus:outline-none"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-preview-title"
            >
                <header className="flex justify-between items-center p-4 border-b border-soft-grey dark:border-gray-700 flex-shrink-0">
                    <div>
                        <h2 id="upload-preview-title" className="text-xl font-bold">{t('geofenceUpload.modalTitle')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: summaryText }} />
                    </div>
                    <button onClick={onClose} className="p-1 text-2xl" aria-label={t('common.close')}>&times;</button>
                </header>

                <main className="flex-grow min-h-0 p-4">
                    <div className="border-b border-soft-grey dark:border-gray-700">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('valid')}
                                className={`${activeTab === 'valid' ? 'border-raven-blue text-raven-blue' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                            >
                                {t('geofenceUpload.validTab', { count: validRows.length })}
                            </button>
                            <button
                                onClick={() => setActiveTab('errors')}
                                className={`${activeTab === 'errors' ? 'border-alert-red text-alert-red' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                            >
                                {t('geofenceUpload.errorsTab', { count: invalidRows.length })}
                            </button>
                        </nav>
                    </div>
                    <div className="mt-4 h-[calc(100%-3rem)] overflow-y-auto">
                        {activeTab === 'valid' && (
                             <table className="min-w-full divide-y divide-soft-grey dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">{t('geofenceUpload.headerRow')}</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">{t('geofenceUpload.headerName')}</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">{t('geofenceUpload.headerDescription')}</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">{t('geofenceUpload.headerNotification')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-soft-grey dark:divide-gray-700">
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
                             <table className="min-w-full divide-y divide-soft-grey dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">{t('geofenceUpload.headerRow')}</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">{t('geofenceUpload.headerError')}</th>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">{t('geofenceUpload.headerOriginalData')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-soft-grey dark:divide-gray-700">
                                    {invalidRows.map(row => (
                                        <tr key={row.rowIndex}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-500">{row.rowIndex}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-alert-red dark:text-red-400">{row.error}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono text-xs truncate max-w-md">{row.originalRow.join(', ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>

                <footer className="flex justify-end gap-3 p-4 border-t border-soft-grey dark:border-gray-700 flex-shrink-0">
                    <button onClick={onClose} disabled={isUploading} className="py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium">{t('common.cancel')}</button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isUploading || validRows.length === 0} 
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 disabled:bg-raven-blue/50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? t('geofenceUpload.uploading') : t('geofenceUpload.uploadButton', { count: validRows.length })}
                    </button>
                </footer>
            </div>
        </div>
    );
};