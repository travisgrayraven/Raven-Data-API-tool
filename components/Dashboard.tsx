


import React, { useState, useMemo, useEffect } from 'react';
import type { RavenDetails, Geofence, ApiContextType, GeofenceFormData } from '../types';
import { RavenCard } from './RavenCard';
import { DashboardMap } from './DashboardMap';
import { GeofenceMap } from './GeofenceMap';
import { GeofenceEditor } from './GeofenceEditor';
import { createGeofence, updateGeofence, deleteGeofence } from '../services/ravenApi';
import { BulkGeofenceActions } from './BulkGeofenceActions';
import { GridPreview } from './GridPreview';


interface DashboardProps {
  ravens: RavenDetails[];
  geofences: Geofence[];
  onSetGeofences: (geofences: Geofence[]) => void;
  onSelectRaven: (raven: RavenDetails) => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  api: ApiContextType | null;
}

type FilterOption = '30d' | '7d' | '48h' | '24h' | '12h' | '1h' | 'all';

export const Dashboard: React.FC<DashboardProps> = ({ ravens, geofences, onSetGeofences, onSelectRaven, onRefreshData, isRefreshing, api }) => {
  const [activeTab, setActiveTab] = useState<'map' | 'grid' | 'geofences'>('map');
  const [filter, setFilter] = useState<FilterOption>('7d');
  const [sortBy, setSortBy] = useState<'persona' | 'time'>('persona');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editorConfig, setEditorConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    geofence: Geofence | null;
  } | { isOpen: false }>({ isOpen: false });

  // Auto-refresh logic
  useEffect(() => {
    // Immediately refresh data when the tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden && !isRefreshing) {
        onRefreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up a 60-second interval to refresh data
    const intervalId = setInterval(() => {
      // Only refresh if the tab is visible and not already refreshing
      if (!document.hidden && !isRefreshing) {
        onRefreshData();
      }
    }, 60000); // 60 seconds

    // Cleanup on component unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onRefreshData, isRefreshing]);

  const filteredAndSortedRavens = useMemo(() => {
    let processedRavens = [...ravens];

    // Filter by search query (if 3+ characters)
    if (searchQuery.trim().length >= 3) {
        processedRavens = processedRavens.filter(raven => 
            raven.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );
    }

    // Filter by time
    if (filter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (filter) {
        case '1h':
          cutoffDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '12h':
          cutoffDate = new Date(now.getTime() - 12 * 60 * 60 * 1000);
          break;
        case '24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '48h':
          cutoffDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        default:
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      
      processedRavens = processedRavens.filter(raven => {
        const lastReportTime = raven.last_known_location?.timestamp;
        if (!lastReportTime) return false;
        return new Date(lastReportTime) > cutoffDate;
      });
    }

    // Sort
    processedRavens.sort((a, b) => {
      if (sortBy === 'persona') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'time') {
        const timeA = a.last_known_location?.timestamp ? new Date(a.last_known_location.timestamp).getTime() : 0;
        const timeB = b.last_known_location?.timestamp ? new Date(b.last_known_location.timestamp).getTime() : 0;
        return timeB - timeA; // Descending
      }
      return 0;
    });

    return processedRavens;
  }, [ravens, filter, sortBy, searchQuery]);

  const handleExportToCSV = () => {
    const now = new Date();
    const pad = (num: number) => num.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `${timestamp}_raven_fleet_export.csv`;

    const headers = [
        "Vehicle Name", "VIN", "Year", "Make", "Model", "Serial Number", "Device Status",
        "Last Report (UTC)", "Odometer (km)", "Fuel (%)", "Latitude", "Longitude"
    ];

    const csvRows = [headers.join(',')];

    filteredAndSortedRavens.forEach(raven => {
        let statusText: string;
        if (raven.unplugged) statusText = 'Unplugged';
        else if (!raven.online) statusText = 'Offline';
        else if (raven.engineOn) statusText = 'Driving';
        else statusText = 'Parked';

        const row = [
            `"${raven.name.replace(/"/g, '""')}"`, // Escape quotes
            raven.vehicle_vin || '',
            raven.vehicle_info?.year || '',
            raven.vehicle_info?.make || '',
            raven.vehicle_info?.model || '',
            raven.serial_number || '',
            statusText,
            raven.last_known_location?.timestamp || '',
            raven.last_known_obd_snapshot?.odometer_km?.toString() || '',
            raven.last_known_obd_snapshot?.fuel_level_percentage?.toString() || '',
            raven.last_known_location?.latitude?.toString() || '',
            raven.last_known_location?.longitude?.toString() || ''
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleOpenEditor = (mode: 'create' | 'edit', geofence: Geofence | null = null) => {
    setEditorConfig({ isOpen: true, mode, geofence });
  };
  
  const handleSaveGeofence = async (geofenceData: GeofenceFormData, layer: any) => {
      if (!api) throw new Error("API context not available.");

      const getEndDateISO = (dateString: string): string | null => {
        if (!dateString) return null;
        const date = new Date(`${dateString}T00:00:00.000Z`);
        date.setUTCHours(23, 59, 59, 999);
        return date.toISOString();
      };

      if (editorConfig.isOpen && editorConfig.mode === 'edit' && editorConfig.geofence) {
          // Update existing geofence
          const geofenceToUpdate: Geofence = {
              ...editorConfig.geofence,
              name: geofenceData.name,
              description: geofenceData.description,
              end: getEndDateISO(geofenceData.end),
              notification: geofenceData.notification,
          };
          const updated = await updateGeofence(api, geofenceToUpdate, layer);
          onSetGeofences(geofences.map(g => g.uuid === updated.uuid ? updated : g));
      } else {
          // Create new geofence
          const newGeofence = await createGeofence(api, { ...geofenceData, layer });
          onSetGeofences([newGeofence, ...geofences]);
      }
      setEditorConfig({ isOpen: false });
  };

  const handleDeleteGeofence = async (geofenceUuid: string) => {
    if (!api) throw new Error("API context not available.");
    
    await deleteGeofence(api, geofenceUuid);
    onSetGeofences(geofences.filter(g => g.uuid !== geofenceUuid));
    setEditorConfig({ isOpen: false });
  };


  return (
    <div>
        <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                 <button
                    onClick={() => setActiveTab('map')}
                    className={`${
                        activeTab === 'map'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-500'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Map
                </button>
                 <button
                    onClick={() => setActiveTab('grid')}
                    className={`${
                        activeTab === 'grid'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-500'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Grid
                </button>
                <button
                    onClick={() => setActiveTab('geofences')}
                    className={`${
                        activeTab === 'geofences'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-500'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Geofences
                </button>
            </nav>
        </div>
        
        {ravens.length === 0 && (activeTab === 'map' || activeTab === 'grid') ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">No Vehicles Found</h2>
                <p className="text-gray-600 dark:text-gray-400">The API returned an empty list of vehicles.</p>
            </div>
        ) : (
            <>
                {(activeTab === 'map' || activeTab === 'grid') && (
                    <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-3xl font-bold text-center lg:text-left text-gray-900 dark:text-white flex-shrink-0">
                            {activeTab === 'map' ? 'Map View' : 'Grid View'}
                        </h2>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                            <div className="w-full sm:w-auto sm:flex-1 lg:w-56">
                                <label htmlFor="search" className="sr-only">Search by vehicle name</label>
                                <input
                                    id="search"
                                    type="text"
                                    placeholder="Search by name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="w-full sm:w-auto">
                                <label htmlFor="filter" className="sr-only">Filter by last report time</label>
                                <select id="filter" value={filter} onChange={(e) => setFilter(e.target.value as FilterOption)} className="block w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 pl-3 pr-8 text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                    <option value="30d">Last 30 days</option>
                                    <option value="7d">Last 7 days</option>
                                    <option value="48h">Last 48 hours</option>
                                    <option value="24h">Last 24 hours</option>
                                    <option value="12h">Last 12 hours</option>
                                    <option value="1h">Last 1 hour</option>
                                    <option value="all">All Time</option>
                                </select>
                            </div>
                            <div className="w-full sm:w-auto">
                                <label htmlFor="sort" className="sr-only">Sort by</label>
                                <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'persona' | 'time')} className="block w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 pl-3 pr-8 text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                    <option value="persona">Sort by Name</option>
                                    <option value="time">Sort by Last Report</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeTab === 'map' && (
                                    <button
                                        onClick={handleExportToCSV}
                                        className="flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                                        title="Export to CSV"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        <span>CSV</span>
                                    </button>
                                )}
                                <button 
                                    onClick={onRefreshData} 
                                    disabled={isRefreshing}
                                    className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                                    title="Refresh Data"
                                >
                                    {isRefreshing ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'map' && (
                     <div>
                        <div className="mb-6">
                            <DashboardMap ravens={filteredAndSortedRavens} />
                        </div>
                        {filteredAndSortedRavens.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredAndSortedRavens.map(raven => (
                                    <RavenCard key={raven.uuid} raven={raven} onSelect={() => onSelectRaven(raven)} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
                                <h2 className="text-xl font-semibold mb-2">No Vehicles Found</h2>
                                <p className="text-gray-600 dark:text-gray-400">No vehicles match the current filter criteria.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'grid' && api && (
                    <GridPreview ravens={filteredAndSortedRavens} api={api} />
                )}
            </>
        )}

        {activeTab === 'geofences' && (
            <div>
                 <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Geofences</h2>
                    <BulkGeofenceActions 
                        geofences={geofences} 
                        api={api!} 
                        onUploadComplete={onRefreshData}
                        onCreateGeofence={() => handleOpenEditor('create')}
                    />
                </div>
                <GeofenceMap 
                    geofences={geofences} 
                    onSelectGeofence={(g) => handleOpenEditor('edit', g)}
                />
            </div>
        )}
        
        {editorConfig.isOpen && (
            <GeofenceEditor
                isOpen={editorConfig.isOpen}
                mode={editorConfig.mode}
                geofence={editorConfig.geofence}
                onClose={() => setEditorConfig({ isOpen: false })}
                onSave={handleSaveGeofence}
                onDelete={handleDeleteGeofence}
            />
        )}
    </div>
  );
};
