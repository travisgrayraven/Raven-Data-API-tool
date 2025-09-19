

import React, { useState, useMemo, useEffect } from 'react';
import type { RavenDetails, Geofence, ApiContextType, GeofenceFormData, Tab } from '../types';
import { RavenCard } from './RavenCard';
import { DashboardMap } from './DashboardMap';
import { GeofenceMap } from './GeofenceMap';
import { GeofenceEditor } from './GeofenceEditor';
import { createGeofence, updateGeofence, deleteGeofence, setDriverMessage, processWithConcurrency } from '../services/ravenApi';
import { BulkGeofenceActions } from './BulkGeofenceActions';
import { GridPreview } from './GridPreview';
import { BulkMessageModal } from './BulkMessageModal';
import { useTranslation } from '../i18n/i18n';

interface DashboardProps {
  ravens: RavenDetails[];
  geofences: Geofence[];
  onSetGeofences: (geofences: Geofence[]) => void;
  onSelectRaven: (raven: RavenDetails, initialTab?: Tab) => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  api: ApiContextType | null;
  isCabinCameraEnabled: boolean;
}

type FilterOption = '30d' | '7d' | '48h' | '24h' | '12h' | '1h' | 'all';
type VehicleStatus = 'driving' | 'parked' | 'offline';

export const Dashboard: React.FC<DashboardProps> = ({ ravens, geofences, onSetGeofences, onSelectRaven, onRefreshData, isRefreshing, api, isCabinCameraEnabled }) => {
  const [activeTab, setActiveTab] = useState<'map' | 'grid' | 'geofences'>('map');
  const [filter, setFilter] = useState<FilterOption>('7d');
  const [sortBy, setSortBy] = useState<'persona' | 'time'>('persona');
  const [searchQuery, setSearchQuery] = useState('');
  const [geofenceSearchQuery, setGeofenceSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<VehicleStatus>>(new Set(['driving', 'parked', 'offline']));
  
  const [editorConfig, setEditorConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    geofence: Geofence | null;
  } | { isOpen: false }>({ isOpen: false });
  const [geofenceEditorTrigger, setGeofenceEditorTrigger] = useState<HTMLElement | null>(null);
  
  const [isBulkMessageModalOpen, setIsBulkMessageModalOpen] = useState(false);
  const [bulkMessageTrigger, setBulkMessageTrigger] = useState<HTMLElement | null>(null);
  const [bulkSendResult, setBulkSendResult] = useState<{success: number, error: number} | null>(null);
  const [isSendingBulkMessage, setIsSendingBulkMessage] = useState(false);
  const { t } = useTranslation();

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

  const getRavenStatus = (raven: RavenDetails): VehicleStatus => {
    if (raven.unplugged || !raven.online) {
        return 'offline';
    }
    return raven.engineOn ? 'driving' : 'parked';
  };

  const filteredAndSortedRavens = useMemo(() => {
    let processedRavens = [...ravens];

    // Filter by search query (if 3+ characters)
    if (searchQuery.trim().length >= 3) {
        processedRavens = processedRavens.filter(raven => 
            raven.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );
    }
    
    // Filter by status
    processedRavens = processedRavens.filter(raven => {
        const status = getRavenStatus(raven);
        return statusFilter.has(status);
    });

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
  }, [ravens, filter, sortBy, searchQuery, statusFilter]);

  const filteredGeofences = useMemo(() => {
      const query = geofenceSearchQuery.trim().toLowerCase();
      if (!query) {
          return geofences;
      }
      return geofences.filter(g => 
          g.name.toLowerCase().includes(query) ||
          g.description.toLowerCase().includes(query)
      );
  }, [geofences, geofenceSearchQuery]);


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
    setGeofenceEditorTrigger(document.activeElement as HTMLElement);
    setEditorConfig({ isOpen: true, mode, geofence });
  };

  const handleCloseEditor = () => {
    setEditorConfig({ isOpen: false });
    geofenceEditorTrigger?.focus();
  }
  
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
      handleCloseEditor();
  };

  const handleDeleteGeofence = async (geofenceUuid: string) => {
    if (!api) throw new Error("API context not available.");
    
    await deleteGeofence(api, geofenceUuid);
    onSetGeofences(geofences.filter(g => g.uuid !== geofenceUuid));
    handleCloseEditor();
  };

  const handleOpenBulkMessageModal = () => {
    setBulkMessageTrigger(document.activeElement as HTMLElement);
    setBulkSendResult(null); // Reset on open
    setIsBulkMessageModalOpen(true);
  };
  
  const handleCloseBulkMessageModal = () => {
    setIsBulkMessageModalOpen(false);
    bulkMessageTrigger?.focus();
    // Delay resetting results so they don't vanish on close animation
    setTimeout(() => {
        setBulkSendResult(null);
        setIsSendingBulkMessage(false);
    }, 300);
  };
  
  const handleSendBulkMessage = async (message: string, duration: number) => {
    if (!api) {
        console.error("API context not available for bulk message.");
        return;
    }
    
    setIsSendingBulkMessage(true);
    setBulkSendResult(null);
    
    const durationInSeconds = duration * 60;

    const processor = async (raven: RavenDetails): Promise<{ success: boolean }> => {
        try {
            await setDriverMessage(api, raven.uuid, message, durationInSeconds);
            return { success: true };
        } catch (error) {
            console.error(`Failed to send message to ${raven.name} (${raven.uuid})`, error);
            return { success: false };
        }
    };

    const results = await processWithConcurrency(
        filteredAndSortedRavens,
        processor,
        5 // Concurrency limit
    );

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    setBulkSendResult({ success: successCount, error: errorCount });
    setIsSendingBulkMessage(false); // This will transition the modal to the result screen
  };

  const handleStatusFilterChange = (status: VehicleStatus) => {
    setStatusFilter(prev => {
        const newSet = new Set(prev);
        if (newSet.has(status)) {
            newSet.delete(status);
        } else {
            newSet.add(status);
        }
        return newSet;
    });
  };

  const statusInfo: { [key in VehicleStatus]: { label: string; color: string } } = {
    driving: { label: t('dashboard.status.driving'), color: 'bg-green-500' },
    parked: { label: t('dashboard.status.parked'), color: 'bg-raven-blue' },
    offline: { label: t('dashboard.status.offline'), color: 'bg-charcoal-grey' },
  };

  return (
    <div>
        <div className="border-b border-soft-grey dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8" role="tablist" aria-label={t('dashboard.tabs.label')}>
                 <button
                    id="map-tab"
                    role="tab"
                    aria-selected={activeTab === 'map'}
                    aria-controls="map-panel"
                    onClick={() => setActiveTab('map')}
                    className={`${
                        activeTab === 'map'
                        ? 'border-raven-blue text-raven-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    {t('dashboard.tabs.map')}
                </button>
                 <button
                    id="grid-tab"
                    role="tab"
                    aria-selected={activeTab === 'grid'}
                    aria-controls="grid-panel"
                    onClick={() => setActiveTab('grid')}
                    className={`${
                        activeTab === 'grid'
                        ? 'border-raven-blue text-raven-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    {t('dashboard.tabs.grid')}
                </button>
                <button
                    id="geofences-tab"
                    role="tab"
                    aria-selected={activeTab === 'geofences'}
                    aria-controls="geofences-panel"
                    onClick={() => setActiveTab('geofences')}
                    className={`${
                        activeTab === 'geofences'
                        ? 'border-raven-blue text-raven-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    {t('dashboard.tabs.geofences')}
                </button>
            </nav>
        </div>
        
        {ravens.length === 0 && (activeTab === 'map' || activeTab === 'grid') ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">{t('dashboard.noVehiclesFound')}</h2>
                <p className="text-charcoal-grey dark:text-soft-grey">{t('dashboard.noVehiclesDescription')}</p>
            </div>
        ) : (
            <>
                {(activeTab === 'map' || activeTab === 'grid') && (
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                        {/* Left-aligned filters */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="w-full sm:w-auto lg:w-64">
                                <label htmlFor="search" className="sr-only">{t('dashboard.searchPlaceholder')}</label>
                                <input
                                    id="search"
                                    type="text"
                                    placeholder={t('dashboard.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-base focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
                                />
                            </div>
                            <div className="flex items-center p-1 space-x-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg" role="group" aria-label={t('dashboard.status.filterLabel')}>
                                {(['driving', 'parked', 'offline'] as VehicleStatus[]).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusFilterChange(status)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 flex items-center gap-2 ${
                                            statusFilter.has(status)
                                                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow'
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-800/50'
                                        }`}
                                        aria-pressed={statusFilter.has(status)}
                                        title={t('dashboard.status.filterTitle', { status: statusInfo[status].label })}
                                    >
                                        <span className={`h-2 w-2 rounded-full ${statusInfo[status].color}`} aria-hidden="true"></span>
                                        <span>{statusInfo[status].label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="w-full sm:w-auto">
                                <label htmlFor="filter" className="sr-only">{t('dashboard.filter.label')}</label>
                                <select id="filter" value={filter} onChange={(e) => setFilter(e.target.value as FilterOption)} className="block w-full bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 pl-3 pr-8 text-base focus:outline-none focus:ring-raven-blue focus:border-raven-blue">
                                    <option value="30d">{t('dashboard.filter.30d')}</option>
                                    <option value="7d">{t('dashboard.filter.7d')}</option>
                                    <option value="48h">{t('dashboard.filter.48h')}</option>
                                    <option value="24h">{t('dashboard.filter.24h')}</option>
                                    <option value="12h">{t('dashboard.filter.12h')}</option>
                                    <option value="1h">{t('dashboard.filter.1h')}</option>
                                    <option value="all">{t('dashboard.filter.all')}</option>
                                </select>
                            </div>
                            <div className="w-full sm:w-auto">
                                <label htmlFor="sort" className="sr-only">{t('dashboard.sort.label')}</label>
                                <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'persona' | 'time')} className="block w-full bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 pl-3 pr-8 text-base focus:outline-none focus:ring-raven-blue focus:border-raven-blue">
                                    <option value="persona">{t('dashboard.sort.name')}</option>
                                    <option value="time">{t('dashboard.sort.time')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Right-aligned actions */}
                        <div className="flex items-center gap-2">
                            {activeTab === 'map' && (
                              <>
                                <button
                                    onClick={handleOpenBulkMessageModal}
                                    disabled={isRefreshing || filteredAndSortedRavens.length === 0}
                                    className="flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50 disabled:cursor-not-allowed"
                                    aria-label={t('dashboard.bulkMessageTitle')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                                    <span>{t('dashboard.bulkMessage')}</span>
                                </button>
                                <button
                                    onClick={handleExportToCSV}
                                    className="flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-charcoal-grey hover:bg-charcoal-grey/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-charcoal-grey disabled:bg-charcoal-grey/50 disabled:cursor-not-allowed"
                                    aria-label={t('dashboard.exportCsvTitle')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    <span>{t('dashboard.exportCsv')}</span>
                                </button>
                              </>
                            )}
                            <button 
                                onClick={onRefreshData} 
                                disabled={isRefreshing}
                                className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50 disabled:cursor-not-allowed"
                                aria-label={isRefreshing ? t('common.refreshing') : t('common.refresh')}
                            >
                                {isRefreshing ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                )}
                
                <div id="map-panel" role="tabpanel" aria-labelledby="map-tab" hidden={activeTab !== 'map'}>
                    <div className="mb-6">
                        <DashboardMap ravens={filteredAndSortedRavens} activeTab={activeTab} />
                    </div>
                    {filteredAndSortedRavens.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredAndSortedRavens.map(raven => (
                                <RavenCard key={raven.uuid} raven={raven} onSelect={() => onSelectRaven(raven)} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                            <h2 className="text-xl font-semibold mb-2">{t('dashboard.noVehiclesFound')}</h2>
                            <p className="text-charcoal-grey dark:text-soft-grey">{t('dashboard.noFilteredVehiclesDescription')}</p>
                        </div>
                    )}
                </div>
                
                <div id="grid-panel" role="tabpanel" aria-labelledby="grid-tab" hidden={activeTab !== 'grid'}>
                    {api && <GridPreview ravens={filteredAndSortedRavens} api={api} onSelectRaven={onSelectRaven} isCabinCameraEnabled={isCabinCameraEnabled} />}
                </div>

                <div id="geofences-panel" role="tabpanel" aria-labelledby="geofences-tab" hidden={activeTab !== 'geofences'}>
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                        <div className="w-full sm:w-auto lg:w-64">
                            <label htmlFor="geofence-search" className="sr-only">{t('dashboard.searchGeofencePlaceholder')}</label>
                            <input
                                id="geofence-search"
                                type="text"
                                placeholder={t('dashboard.searchGeofencePlaceholder')}
                                value={geofenceSearchQuery}
                                onChange={(e) => setGeofenceSearchQuery(e.target.value)}
                                className="block w-full bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-base focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
                            />
                        </div>
                        <BulkGeofenceActions 
                            geofences={geofences} 
                            api={api!} 
                            onUploadComplete={onRefreshData}
                            onCreateGeofence={() => handleOpenEditor('create')}
                        />
                    </div>
                    <GeofenceMap 
                        geofences={filteredGeofences} 
                        onSelectGeofence={(g) => handleOpenEditor('edit', g)}
                    />
                </div>
            </>
        )}
        
        {editorConfig.isOpen && (
            <GeofenceEditor
                isOpen={editorConfig.isOpen}
                mode={editorConfig.mode}
                geofence={editorConfig.geofence}
                onClose={handleCloseEditor}
                onSave={handleSaveGeofence}
                onDelete={handleDeleteGeofence}
            />
        )}
        {isBulkMessageModalOpen && (
            <BulkMessageModal
                isOpen={isBulkMessageModalOpen}
                onClose={handleCloseBulkMessageModal}
                onSubmit={handleSendBulkMessage}
                vehicleCount={filteredAndSortedRavens.length}
                isSending={isSendingBulkMessage}
                sendResult={bulkSendResult}
            />
        )}
    </div>
  );
};
