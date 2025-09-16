


import React, { useState, useRef } from 'react';
import type { Geofence, ApiContextType, GeofenceFormData } from '../types';
import { createGeofence, processWithConcurrency } from '../services/ravenApi';
import { GeofenceUploadPreviewModal } from './GeofenceUploadPreviewModal';

declare const L: any;

interface BulkGeofenceActionsProps {
    geofences: Geofence[];
    api: ApiContextType;
    onUploadComplete: () => void;
    onCreateGeofence: () => void;
}

interface ParsedRow {
    data: GeofenceFormData & { layer: any };
    originalRow: string[];
    rowIndex: number;
}

interface InvalidRow {
    error: string;
    originalRow: string[];
    rowIndex: number;
}

const GEOFENCE_API_CONCURRENCY = 5;

// Helper to safely wrap data in quotes for CSV export
const escapeCsvCell = (cellData: any): string => {
    const stringData = String(cellData ?? '');
    if (/[",\n]/.test(stringData)) {
        return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
};

const isoToDateInputFormat = (isoString: string | null): string => {
    if (!isoString) return '';
    try {
        return new Date(isoString).toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};

// A robust CSV line parser that handles quoted fields containing commas.
const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    const regex = /(?:"([^"]*(?:""[^"]*)*)"|([^,]*))(,|$)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    // Custom loop to ensure we parse the whole line, even with empty trailing fields
    while (lastIndex < line.length) {
        regex.lastIndex = lastIndex;
        match = regex.exec(line);

        if (match) {
            // The value is in capture group 1 (quoted) or 2 (unquoted)
            let value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
            values.push(value);
            lastIndex = regex.lastIndex;
            // If the delimiter was the end of the string, we're done with this line
            if (match[3] === '') {
                break;
            }
        } else {
            // No more matches, we're done
            break;
        }
    }
    return values;
};


export const BulkGeofenceActions: React.FC<BulkGeofenceActionsProps> = ({ geofences, api, onUploadComplete, onCreateGeofence }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        validRows: ParsedRow[];
        invalidRows: InvalidRow[];
    }>({ isOpen: false, validRows: [], invalidRows: [] });

    const handleDownload = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadTemplate = () => {
        const headers = ['name', 'description', 'end_date', 'notification', 'shape_type', 'shape_data'];
        const exampleRows = [
            ['Downtown Office', 'Main office geofence', '', 'ENTER,EXIT', 'CIRCLE', '45.4215,-75.6972,500'],
            ['East Warehouse', 'Warehouse polygon, Ottawa, ON', '2025-12-31', 'ENTER', 'POLYGON', '45.4,-75.7;45.5,-75.7;45.5,-75.6;45.4,-75.6']
        ];
        
        const csvContent = [
            headers.join(','),
            ...exampleRows.map(row => row.map(escapeCsvCell).join(','))
        ].join('\n');
        handleDownload(csvContent, 'geofence_template.csv');
    };

    const handleDownloadAll = () => {
        const headers = ['name', 'description', 'end_date', 'notification', 'shape_type', 'shape_data'];
        const rows = geofences.map(g => {
            let shapeDataStr = '';
            if (g.shape_type === 'CIRCLE' && g.shape_data.center && g.shape_data.radius) {
                shapeDataStr = `${g.shape_data.center[0]},${g.shape_data.center[1]},${g.shape_data.radius}`;
            } else if (g.shape_type === 'POLYGON' && g.shape_data.coordinates) {
                shapeDataStr = g.shape_data.coordinates[0].map(p => `${p[0]},${p[1]}`).join(';');
            }
            return [
                escapeCsvCell(g.name),
                escapeCsvCell(g.description),
                isoToDateInputFormat(g.end),
                escapeCsvCell(g.notification),
                g.shape_type,
                escapeCsvCell(shapeDataStr),
            ].join(',');
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        handleDownload(csvContent, 'geofences_export.csv');
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            const headerLine = lines.shift() || '';
            const headers = parseCsvLine(headerLine).map(h => h.trim().toLowerCase());
            
            const validRows: ParsedRow[] = [];
            const invalidRows: InvalidRow[] = [];
            const validNotifications = new Set(['', 'ENTER', 'EXIT', 'ENTER,EXIT']);

            lines.forEach((line, index) => {
                const values = parseCsvLine(line);
                const rowData: Record<string, string> = {};
                headers.forEach((header, i) => {
                   rowData[header] = values[i]?.trim() || '';
                });

                const { name, description, end_date, notification, shape_type, shape_data } = rowData;
                const rowIndex = index + 2;

                if (!name) {
                    invalidRows.push({ error: 'Name is required.', originalRow: values, rowIndex });
                    return;
                }
                const shapeTypeUpper = shape_type.toUpperCase();
                if (shapeTypeUpper !== 'CIRCLE' && shapeTypeUpper !== 'POLYGON') {
                    invalidRows.push({ error: 'shape_type must be CIRCLE or POLYGON.', originalRow: values, rowIndex });
                    return;
                }
                if (notification && !validNotifications.has(notification.toUpperCase())) {
                    invalidRows.push({ error: 'Invalid notification type.', originalRow: values, rowIndex });
                    return;
                }
                if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
                    invalidRows.push({ error: 'end_date must be in YYYY-MM-DD format.', originalRow: values, rowIndex });
                    return;
                }


                let layer = null;
                try {
                    if (shapeTypeUpper === 'CIRCLE') {
                        const [lat, lon, radius] = shape_data.split(',').map(Number);
                        if (isNaN(lat) || isNaN(lon) || isNaN(radius) || radius <= 0) throw new Error();
                        layer = L.circle([lat, lon], { radius });
                    } else { // POLYGON
                        const points = shape_data.split(';').map(p => {
                            const [lat, lon] = p.split(',').map(Number);
                            if (isNaN(lat) || isNaN(lon)) throw new Error();
                            return [lat, lon];
                        });
                        if (points.length < 3) throw new Error();
                        layer = L.polygon(points);
                    }
                } catch {
                     invalidRows.push({ error: 'Invalid shape_data format.', originalRow: values, rowIndex });
                     return;
                }
                
                validRows.push({
                    data: { 
                        name, 
                        description, 
                        end: end_date, 
                        notification: notification.toUpperCase(), 
                        layer 
                    },
                    originalRow: values,
                    rowIndex
                });
            });

            setModalState({ isOpen: true, validRows, invalidRows });
        };
        reader.readAsText(file);
        
        event.target.value = '';
    };

    const handleConfirmUpload = async (rowsToUpload: ParsedRow[]) => {
        const createGeofenceWithLayer = (row: ParsedRow) => {
            return createGeofence(api, row.data);
        };
        
        try {
            await processWithConcurrency(rowsToUpload, createGeofenceWithLayer, GEOFENCE_API_CONCURRENCY);
            setModalState({ isOpen: false, validRows: [], invalidRows: [] });
            onUploadComplete();
        } catch (error) {
            console.error("Bulk geofence creation failed:", error);
            alert("An error occurred during the bulk upload. Some geofences may not have been created. Please check the list and try again.");
        }
    };


    return (
        <div className="flex items-center gap-2 flex-wrap">
             <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 py-2 px-3 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                title="Download a CSV template file"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                Template
            </button>
             <button
                onClick={handleDownloadAll}
                disabled={geofences.length === 0}
                className="flex items-center gap-2 py-2 px-3 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download all geofences as a CSV file"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12.586l4.293-4.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 12.586zM3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>
                Download All
            </button>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                style={{ display: 'none' }}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 py-2 px-3 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                title="Upload geofences from a CSV file"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                Upload CSV
            </button>
            
            <div className="border-l border-gray-300 dark:border-slate-600 h-6 mx-2"></div>

             <button 
                onClick={onCreateGeofence}
                className="flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110 2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Create Geofence
            </button>
            <GeofenceUploadPreviewModal 
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false, validRows: [], invalidRows: [] })}
                onConfirm={handleConfirmUpload}
                validRows={modalState.validRows}
                invalidRows={modalState.invalidRows}
            />
        </div>
    );
};
