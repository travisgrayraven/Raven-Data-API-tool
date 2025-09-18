

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { RavenDetails, RavenEvent, RavenSettings, ApiContextType, ApiLogEntry, Tab } from '../types';
import { getRavenEvents, getRavenSettings, updateRavenSettings, getMediaUrlViaProxy, processWithConcurrency } from '../services/ravenApi';
import { SettingsForm } from './SettingsForm';
import { DriverMessageManager } from './DriverMessageManager';
import { TripShareManager } from './TripShareManager';
import { LivePreview } from './LivePreview';
import { useTranslation } from '../i18n/i18n';

const MEDIA_CONCURRENCY_LIMIT = 5;

declare const L: any; // Declare Leaflet to TypeScript
// Make jsPDF available to TypeScript
declare const jspdf: any;

const JsonViewer: React.FC<{ jsonString?: string, data?: object }> = ({ jsonString, data }) => {
    const { t } = useTranslation();
    if (!jsonString && !data) {
        return <pre className="text-xs bg-soft-grey/50 dark:bg-black p-2 rounded-md overflow-x-auto text-gray-500 dark:text-gray-400"><code>({t('common.empty')})</code></pre>;
    }
    try {
        const content = data ? data : JSON.parse(jsonString || '{}');
        return <pre className="text-xs bg-soft-grey/50 dark:bg-black text-gray-900 dark:text-gray-100 p-2 rounded-md overflow-x-auto"><code>{JSON.stringify(content, null, 2)}</code></pre>;
    } catch (e) {
        return <pre className="text-xs bg-soft-grey/50 dark:bg-black text-gray-900 dark:text-gray-100 p-2 rounded-md overflow-x-auto"><code>{jsonString}</code></pre>;
    }
};

const MapView: React.FC<{ raven: RavenDetails; api: ApiContextType }> = ({ raven, api }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const { latitude, longitude } = raven.last_known_location || {};

        if (!mapContainerRef.current || !latitude || !longitude) {
            return;
        }

        if (!mapRef.current) {
            // Initialize map and set view in one step to prevent errors.
            mapRef.current = L.map(mapContainerRef.current).setView([latitude, longitude], 14);
            
            const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });

            const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            });

            const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            });
            
            const baseMaps = {
                [t('detailView.map.street')]: street,
                [t('detailView.map.dark')]: dark,
                [t('detailView.map.satellite')]: satellite
            };
            
            street.addTo(mapRef.current);
            L.control.layers(baseMaps).addTo(mapRef.current);
        } else {
            // If map exists, just update its view
            mapRef.current.setView([latitude, longitude], 14);
        }
        

        // Clear previous marker if it exists
        if (markerRef.current) {
            markerRef.current.remove();
        }

        // Add new marker
        markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current);
        markerRef.current.bindPopup(`<b>${raven.name}</b>`).openPopup();
        
        const timer = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 100);

        return () => {
            clearTimeout(timer);
        };

    }, [raven, t]); // Re-run effect if raven data changes

    const { latitude, longitude } = raven.last_known_location || {};
    const mapLabel = t('detailView.map.label', { vehicleName: raven.name });

    return (
        <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
                <h3 className="text-xl font-bold mb-4">{t('detailView.map.title')}</h3>
                {latitude && longitude ? (
                    <div ref={mapContainerRef} className="h-96 w-full rounded-md border border-gray-300 dark:border-gray-700 z-0" role="application" aria-label={mapLabel} />
                ) : (
                    <p>{t('detailView.map.noLocation')}</p>
                )}
            </div>
            <DriverMessageManager raven={raven} api={api} />
            <TripShareManager raven={raven} api={api} />
        </div>
    );
};

const EventMediaItem: React.FC<{ 
    mediaUrl?: string; 
    error?: string; 
    isLoading: boolean; 
    label: string; 
    onImageClick: (url: string) => void; 
}> = ({ mediaUrl, error, isLoading, label, onImageClick }) => {
    return (
        <div className="flex flex-col items-center">
            <div className="w-48 h-32 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-700">
                {isLoading && (
                    <svg className="animate-spin h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                )}
                {error && <p className="text-xs text-red-500 text-center p-2">{error}</p>}
                {mediaUrl && <img src={mediaUrl} alt={`Media for ${label}`} className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onImageClick(mediaUrl)} />}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</span>
        </div>
    );
};

const EventsView: React.FC<{ raven: RavenDetails; api: ApiContextType; onImageClick: (images: string[], index: number) => void; }> = ({ raven, api, onImageClick }) => {
    const getInitialDates = (raven: RavenDetails) => {
        // The default date range should be today.
        // We will use the raven's last report time as "today" if available, otherwise the user's current date.
        const lastReportTimestamp = raven.last_known_location?.timestamp;
        const today = lastReportTimestamp ? new Date(lastReportTimestamp) : new Date();
        
        // Set the time to the beginning of the day to ensure the whole day is queried by default.
        today.setHours(0, 0, 0, 0);

        // Create new Date objects for state to avoid mutation issues.
        const initialStartDate = new Date(today);
        const initialEndDate = new Date(today);

        return { initialStartDate, initialEndDate };
    };
    const { t } = useTranslation();
    const [events, setEvents] = useState<RavenEvent[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [startDate, setStartDate] = useState(() => getInitialDates(raven).initialStartDate);
    const [endDate, setEndDate] = useState(() => getInitialDates(raven).initialEndDate);
    
    // State for filtering
    const [allEventTypes, setAllEventTypes] = useState<string[]>([]);
    const [selectedEventTypes, setSelectedEventTypes] = useState<Set<string>>(new Set());
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // State for media fetching
    const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
    const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({});
    const [loadingMedia, setLoadingMedia] = useState<Set<string>>(new Set());

    // State for PDF generation
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const mediaUrlsRef = useRef(mediaUrls);
    mediaUrlsRef.current = mediaUrls;

    useEffect(() => {
        return () => {
            Object.values(mediaUrlsRef.current).forEach(url => {
                if (typeof url === 'string' && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, []);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleFetchEvents = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setEvents(null);
            setAllEventTypes([]);
            setSelectedEventTypes(new Set());
            setMediaUrls({});
            setMediaErrors({});
            setLoadingMedia(new Set());
            
            const fetchedEvents = await getRavenEvents(api, raven.uuid, startDate, endDate);
            const sortedEvents = fetchedEvents.sort((a, b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime());
            setEvents(sortedEvents);

            if (sortedEvents.length > 0) {
                const uniqueTypes = [...new Set(sortedEvents.map(e => e.event_type))].sort();
                setAllEventTypes(uniqueTypes);
                setSelectedEventTypes(new Set(uniqueTypes));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.fetchEvents'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const filteredEvents = useMemo(() => {
        if (!events) return null;
        return events.filter(event => selectedEventTypes.has(event.event_type));
    }, [events, selectedEventTypes]);


    useEffect(() => {
        if (!filteredEvents) return;

        const allMediaIds = filteredEvents.flatMap(event => [
            ...(event.road_media_ids || []),
            ...(event.cabin_media_ids || [])
        ]);

        const idsToFetch = allMediaIds.filter(id => 
            !mediaUrls[id] && !mediaErrors[id] && !loadingMedia.has(id)
        );

        if (idsToFetch.length === 0) return;

        setLoadingMedia(prev => {
            const newSet = new Set(prev);
            idsToFetch.forEach(id => newSet.add(id));
            return newSet;
        });

        const processMediaItem = async (mediaId: string): Promise<{id: string, url?: string, error?: string}> => {
             try {
                const url = await getMediaUrlViaProxy(api, raven.uuid, mediaId);
                return { id: mediaId, url };
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : t('errors.loadMedia');
                return { id: mediaId, error: errorMessage };
            }
        };

        (async () => {
             const results = await processWithConcurrency(
                idsToFetch,
                processMediaItem,
                MEDIA_CONCURRENCY_LIMIT
            );

            const newUrls: Record<string, string> = {};
            const newErrors: Record<string, string> = {};
            
            results.forEach(result => {
                if (result.url) newUrls[result.id] = result.url;
                if (result.error) newErrors[result.id] = result.error;
            });

            setMediaUrls(prev => ({ ...prev, ...newUrls }));
            setMediaErrors(prev => ({ ...prev, ...newErrors }));

            setLoadingMedia(prev => {
                const newSet = new Set(prev);
                idsToFetch.forEach(id => newSet.delete(id));
                return newSet;
            });
        })();

    }, [filteredEvents, api, raven.uuid, mediaUrls, mediaErrors, loadingMedia, t]);

    const handleFilterChange = (eventType: string) => {
        setSelectedEventTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventType)) {
                newSet.delete(eventType);
            } else {
                newSet.add(eventType);
            }
            return newSet;
        });
    };

    const handleLocalImageClick = (clickedEvent: RavenEvent, clickedMediaUrl: string) => {
        const eventMediaIds = [
            ...(clickedEvent.road_media_ids || []),
            ...(clickedEvent.cabin_media_ids || [])
        ];
        
        const eventMediaUrls = eventMediaIds
            .map(id => mediaUrls[id])
            .filter((url): url is string => !!url);
    
        const clickedIndex = eventMediaUrls.findIndex(url => url === clickedMediaUrl);
    
        if (clickedIndex !== -1 && eventMediaUrls.length > 0) {
            onImageClick(eventMediaUrls, clickedIndex);
        }
    };

    const formatEventTypeLabel = (type: string) => {
      return type
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    const dateToInputFormat = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setStartDate(new Date(e.target.value + 'T00:00:00'));
    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setEndDate(new Date(e.target.value + 'T00:00:00'));

    const getFormattedFilename = (extension: 'csv' | 'pdf') => {
        const now = new Date();
        const pad = (num: number) => num.toString().padStart(2, '0');
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const safeVehicleName = raven.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `${timestamp}_${safeVehicleName}_events.${extension}`;
    };

    const handleExportEventsCSV = () => {
        if (!filteredEvents || filteredEvents.length === 0) return;

        const headers = ["Event Type", "Timestamp (UTC)", "Latitude", "Longitude", "Speed (km/h)"];
        const csvRows = [headers.join(',')];

        filteredEvents.forEach(event => {
            const row = [
                `"${formatEventTypeLabel(event.event_type)}"`,
                `"${event.event_timestamp}"`,
                event.latitude ?? '',
                event.longitude ?? '',
                event.speed_kph ? Math.round(event.speed_kph) : ''
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', getFormattedFilename('csv'));
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleExportEventsPDF = async () => {
        if (!filteredEvents || filteredEvents.length === 0) return;
        setIsGeneratingPdf(true);
    
        try {
            const { jsPDF } = jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    
            let y = 15;
            const pageHeight = doc.internal.pageSize.height;
            const leftMargin = 15;
            const imageBoxWidth = 80;
            const imageBoxHeight = 60;
    
            doc.setFontSize(18);
            doc.text(`${raven.name} - ${t('detailView.events.reportTitle')}`, leftMargin, y);
            y += 8;
    
            for (const event of filteredEvents) {
                const mediaIds = [...(event.road_media_ids || []), ...(event.cabin_media_ids || [])];
                
                const imagesPerRow = 2;
                const rowGap = 5;
                const colGap = 5;
                const numRows = Math.ceil(mediaIds.length / imagesPerRow);
                const totalImageBlockHeight = (numRows > 0) ? (numRows * imageBoxHeight + (numRows > 0 ? (numRows - 1) * rowGap : 0)) : 0;
                const eventBlockHeight = 25 + totalImageBlockHeight;
    
                if (y + eventBlockHeight > pageHeight - 15) { // Add bottom margin
                    doc.addPage();
                    y = 15;
                }
    
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(formatEventTypeLabel(event.event_type), leftMargin, y);
                y += 5;
    
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                doc.text(`${t('detailView.events.timestamp')}: ${new Date(event.event_timestamp).toLocaleString()}`, leftMargin, y);
                y += 4;
    
                if (event.latitude && event.longitude) {
                    const prefixText = `${t('detailView.events.location')}: `;
                    const linkText = `${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`;
                    const url = `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`;
                    
                    const prefixWidth = doc.getTextWidth(prefixText);

                    const originalTextColor = doc.getTextColor();
                    
                    doc.setTextColor(0, 0, 0);
                    doc.text(prefixText, leftMargin, y);

                    // textWithLink will render the text as a blue, underlined hyperlink
                    doc.textWithLink(linkText, leftMargin + prefixWidth, y, { url });
                    
                    // Restore original text color for subsequent text elements
                    doc.setTextColor(originalTextColor);

                    y += 4;
                }
                if (typeof event.speed_kph === 'number') {
                    doc.text(`${t('detailView.events.speed')}: ${Math.round(event.speed_kph)} km/h`, leftMargin, y);
                    y += 4;
                }
    
                y += 3;
    
                if (mediaIds.length > 0) {
                    for (let i = 0; i < mediaIds.length; i++) {
                        const mediaId = mediaIds[i];
                        const mediaUrl = mediaUrls[mediaId];
                        
                        const rowIndex = Math.floor(i / imagesPerRow);
                        const colIndex = i % imagesPerRow;

                        const imageX = leftMargin + colIndex * (imageBoxWidth + colGap);
                        const imageY = y + rowIndex * (imageBoxHeight + rowGap);
                        
                        if (mediaUrl) {
                            try {
                                const response = await fetch(mediaUrl);
                                const blob = await response.blob();
                                const dataUrl = await new Promise<string>((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result as string);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(blob);
                                });

                                const getImageDimensions = (url: string): Promise<{ width: number; height: number; }> => {
                                    return new Promise((resolve, reject) => {
                                        const img = new Image();
                                        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                                        img.onerror = reject;
                                        img.src = url;
                                    });
                                };

                                const { width: originalWidth, height: originalHeight } = await getImageDimensions(dataUrl);
                                const aspectRatio = originalWidth / originalHeight;
                                
                                let pdfImageWidth = imageBoxWidth;
                                let pdfImageHeight = pdfImageWidth / aspectRatio;

                                if (pdfImageHeight > imageBoxHeight) {
                                    pdfImageHeight = imageBoxHeight;
                                    pdfImageWidth = pdfImageHeight * aspectRatio;
                                }

                                doc.addImage(dataUrl, 'JPEG', imageX, imageY, pdfImageWidth, pdfImageHeight);
                            } catch (e) {
                                console.error("Error adding image to PDF", e);
                                doc.text(`[${t('errors.imageLoadFailed')}]`, imageX + 5, imageY + 20);
                            }
                        }
                    }
                    y += totalImageBlockHeight;
                }
    
                doc.setDrawColor(200);
                doc.line(leftMargin, y, doc.internal.pageSize.width - leftMargin, y);
                y += 5;
            }
    
            doc.save(getFormattedFilename('pdf'));
        } catch (err) {
            console.error("Failed to generate PDF:", err);
            setError(t('errors.generatePdf'));
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    const filterButtonText = events ? t('detailView.events.filterEventsCount', { selected: selectedEventTypes.size, total: allEventTypes.length }) : t('detailView.events.filterEvents');

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
             <h3 className="text-xl font-bold mb-4">{t('detailView.events.title')}</h3>
             
             <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-soft-grey dark:border-gray-700">
                 <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium mb-1">{t('detailView.events.startDate')}</label>
                        <input 
                            type="date"
                            id="start-date"
                            value={dateToInputFormat(startDate)}
                            onChange={handleStartDateChange}
                            className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium mb-1">{t('detailView.events.endDate')}</label>
                        <input 
                            type="date"
                            id="end-date"
                            value={dateToInputFormat(endDate)}
                            onChange={handleEndDateChange}
                            className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                        />
                    </div>
                    <button 
                        onClick={handleFetchEvents}
                        disabled={isLoading}
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50"
                    >
                        {isLoading ? t('common.loading') : t('detailView.events.getEvents')}
                    </button>
                 </div>

                 {events && (
                     <div className="flex items-center gap-2">
                        <div className="relative" ref={filterDropdownRef}>
                            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-800" aria-haspopup="true" aria-expanded={isFilterOpen}>{filterButtonText}</button>
                            {isFilterOpen && (
                                <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-10 max-h-80 overflow-y-auto">
                                    <div className="flex justify-between items-center p-2 border-b border-soft-grey dark:border-gray-700">
                                        <button onClick={() => setSelectedEventTypes(new Set(allEventTypes))} className="text-sm text-raven-blue hover:underline">{t('common.selectAll')}</button>
                                        <button onClick={() => setSelectedEventTypes(new Set())} className="text-sm text-raven-blue hover:underline">{t('common.selectNone')}</button>
                                    </div>
                                    {allEventTypes.map(type => (
                                        <label key={type} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                            <input type="checkbox" checked={selectedEventTypes.has(type)} onChange={() => handleFilterChange(type)} className="h-4 w-4 rounded border-gray-300 text-raven-blue focus:ring-raven-blue mr-3" />
                                            {formatEventTypeLabel(type)}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={handleExportEventsCSV} 
                            disabled={!filteredEvents || filteredEvents.length === 0}
                            className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed" 
                            aria-label={t('dashboard.exportCsvTitle')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            <span>{t('dashboard.exportCsv')}</span>
                        </button>
                        <button 
                            onClick={handleExportEventsPDF} 
                            disabled={isGeneratingPdf || !filteredEvents || filteredEvents.length === 0} 
                            className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-alert-red hover:bg-alert-red/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-alert-red disabled:bg-alert-red/50 disabled:cursor-not-allowed" 
                            aria-label={t('detailView.events.exportPdfTitle')}
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2-2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                            <span>{isGeneratingPdf ? '...' : 'PDF'}</span>
                        </button>
                    </div>
                 )}
            </div>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {!filteredEvents && !isLoading && !error && (
                <div className="text-center py-8">
                    <p>{t('detailView.events.prompt')}</p>
                </div>
            )}
            
            {filteredEvents && filteredEvents.length === 0 && (
                 <div className="text-center py-8">
                    <p>{t('detailView.events.noEvents')}</p>
                </div>
            )}
            
            <div className="space-y-6">
                {filteredEvents?.map((event, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-soft-grey dark:border-gray-700">
                        <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                            <div>
                                <h4 className="font-bold">{formatEventTypeLabel(event.event_type)}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(event.event_timestamp).toLocaleString()}</p>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                {event.latitude && event.longitude && (
                                    <p>
                                        {t('detailView.events.location')}:
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-raven-blue hover:underline ml-1"
                                        >
                                            {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
                                        </a>
                                    </p>
                                )}
                                 {typeof event.speed_kph === 'number' && (
                                    <p>{t('detailView.events.speed')}: {Math.round(event.speed_kph)} km/h</p>
                                )}
                            </div>
                        </div>

                        {(event.road_media_ids || event.cabin_media_ids) && (
                            <div className="flex flex-wrap gap-4 pt-3 border-t border-soft-grey dark:border-gray-700">
                                {event.road_media_ids?.map(id => (
                                    <EventMediaItem
                                        key={id}
                                        mediaUrl={mediaUrls[id]}
                                        error={mediaErrors[id]}
                                        isLoading={loadingMedia.has(id)}
                                        label={t('detailView.events.roadCam')}
                                        onImageClick={(url) => handleLocalImageClick(event, url)}
                                    />
                                ))}
                                {event.cabin_media_ids?.map(id => (
                                    <EventMediaItem
                                        key={id}
                                        mediaUrl={mediaUrls[id]}
                                        error={mediaErrors[id]}
                                        isLoading={loadingMedia.has(id)}
                                        label={t('detailView.events.cabinCam')}
                                        onImageClick={(url) => handleLocalImageClick(event, url)}
                                    />
                                ))}
                            </div>
                        )}
                         <details className="mt-3">
                            <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400">{t('detailView.events.rawData')}</summary>
                            <JsonViewer data={event} />
                        </details>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface RavenDetailViewProps {
  raven: RavenDetails;
  api: ApiContextType;
  onBack: () => void;
  logs: ApiLogEntry[];
  onImageClick: (images: string[], index: number) => void;
  initialTab?: Tab;
}

export const RavenDetailView: React.FC<RavenDetailViewProps> = ({ raven, api, onBack, logs, onImageClick, initialTab }) => {
    const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'map');
    const [settings, setSettings] = useState<RavenSettings | null>(null);
    const [initialSettings, setInitialSettings] = useState<RavenSettings | null>(null);
    const [isFetchingSettings, setIsFetchingSettings] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [isConfigError, setIsConfigError] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    const fetchSettings = useCallback(async () => {
        setIsFetchingSettings(true);
        setSettingsError(null);
        setIsConfigError(false);
        try {
            const fetchedSettings = await getRavenSettings(api, raven.uuid);
            setSettings(fetchedSettings);
            setInitialSettings(JSON.parse(JSON.stringify(fetchedSettings)));
        } catch (err) {
            let finalErrorString = t('errors.loadSettings'); // Default error
            if (err instanceof Error) {
                const errorMessage = err.message;
                const jsonStartIndex = errorMessage.indexOf('{');
                
                if (jsonStartIndex !== -1) {
                    const jsonString = errorMessage.substring(jsonStartIndex);
                    try {
                        const errorPayload = JSON.parse(jsonString);
                        if (errorPayload.message) {
                            const friendlyIntro = `${t('errors.settingsConfigError')}\n\n`;
                            finalErrorString = friendlyIntro + errorPayload.message.replace(/\\n/g, '\n');
                        } else {
                            finalErrorString = errorMessage;
                        }
                    } catch (parseError) {
                        finalErrorString = errorMessage;
                    }
                } else {
                    finalErrorString = errorMessage;
                }
            }
            if (finalErrorString.includes('validation errors for DisplaySettings')) {
                setIsConfigError(true);
            }
            setSettingsError(finalErrorString);
        } finally {
            setIsFetchingSettings(false);
        }
    }, [api, raven.uuid, t]);

    useEffect(() => {
        // Fetch settings if the tab is opened, and we don't have them, and there's no standing error.
        if ((activeTab === 'settings' || activeTab === 'preview') && !settings && !settingsError) {
            fetchSettings();
        }
    }, [activeTab, settings, settingsError, fetchSettings]);


    const handleFixDisplaySettings = async () => {
        setIsFixing(true);
        setSettingsError(null);
        const defaultScreenGroups = [
          { "name": "1", "left": "vehicle_speed", "right": "clock", "leftside": "statusbar", "rightside": "fuel_level" },
          { "name": "2", "left": "fuel_level", "right": "vehicle_speed", "leftside": "statusbar", "rightside": "fuel_level" },
          { "name": "3", "left": "rpm", "right": "coolant_temperature", "leftside": "statusbar", "rightside": "fuel_level" },
          { "name": "4", "left": "gps_altitude", "right": "gps_heading", "leftside": "statusbar", "rightside": "fuel_level" }
        ];

        try {
            await updateRavenSettings(api, raven.uuid, { display: { screen_groups: defaultScreenGroups } });
            // It worked, refetch everything to populate the form.
            await fetchSettings();
        } catch (err) {
            setSettingsError(err instanceof Error ? err.message : t('errors.settingsFixFailed'));
            setIsConfigError(true); // Keep showing the fix UI if the fix itself fails
        } finally {
            setIsFixing(false);
        }
    };


    const handleSettingChange = (path: string, value: any) => {
        setSettings(prev => {
            if (!prev) return null;
            const newSettings = JSON.parse(JSON.stringify(prev)); // Deep copy
            let current: any = newSettings;
            const keys = path.split('.');
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = current[keys[i]] || {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newSettings;
        });
    };

    const handleSaveChanges = async () => {
        if (!settings) return;
        setIsSaving(true);
        setSettingsError(null);
        try {
            const updatedSettings = await updateRavenSettings(api, raven.uuid, settings);
            setSettings(updatedSettings);
            setInitialSettings(JSON.parse(JSON.stringify(updatedSettings)));
        // FIX: Corrected invalid `catch (err) => {` syntax to `catch (err) {`.
        } catch (err) {
            setSettingsError(err instanceof Error ? err.message : t('errors.saveSettings'));
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleResetChanges = () => {
        setSettings(initialSettings);
    };

    const getFormattedFilename = (extension: 'csv' | 'json') => {
        const now = new Date();
        const pad = (num: number) => num.toString().padStart(2, '0');
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const safeVehicleName = raven.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `${timestamp}_${safeVehicleName}_settings.${extension}`;
    };

    const handleExportSettingsJSON = () => {
        if (!settings) return;

        const filename = getFormattedFilename('json');
        const jsonContent = JSON.stringify(settings, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUploadButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    const parsedSettings = JSON.parse(text);
                    setSettings(parsedSettings);
                    alert(t('detailView.settings.uploadSuccess'));
                }
            } catch (err) {
                console.error("Failed to parse settings file:", err);
                setSettingsError(t('errors.parseSettings'));
            }
        };
        reader.onerror = () => {
             setSettingsError(t('errors.readSettings'));
        }
        reader.readAsText(file);

        // Reset file input value to allow re-uploading the same file
        event.target.value = '';
    };

    const hasChanges = useMemo(() => {
        return JSON.stringify(settings) !== JSON.stringify(initialSettings);
    }, [settings, initialSettings]);

    const { make, model, year } = raven.vehicle_info || {};
    const subTitle = (make && model && year) ? `${year} ${make} ${model}` : raven.serial_number;
    const tabs: Tab[] = ['map', 'preview', 'events', 'settings', 'logs'];
    
    const renderSettingsContent = () => {
        if (isFetchingSettings) {
            return <p>{t('common.loadingSettings')}...</p>;
        }
        if (isConfigError) {
            return (
                <div className="bg-alert-red/10 border border-alert-red text-alert-red px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm">{settingsError}</pre>
                    <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{t('errors.settingsFixPrompt')}</p>
                    <div className="mt-4">
                        <button
                            onClick={handleFixDisplaySettings}
                            disabled={isFixing}
                            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-alert-red/80 hover:bg-alert-red disabled:bg-alert-red/50"
                        >
                            {isFixing ? t('errors.settingsFixingButton') : t('errors.settingsFixButton')}
                        </button>
                    </div>
                </div>
            );
        }
        if (settingsError) {
            return (
                <div className="bg-alert-red/10 border border-alert-red text-alert-red px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm">{settingsError}</pre>
                </div>
            );
        }
        if (settings) {
            return <SettingsForm settings={settings} onSettingChange={handleSettingChange} />;
        }
        return <p>{t('detailView.settings.noSettings')}</p>;
    };

    return (
        <div>
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-4" aria-label={t('common.backToDashboard')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{raven.name}</h2>
                    <p className="text-md text-gray-500 dark:text-gray-400">{subTitle}</p>
                </div>
            </div>
            
            <div className="mt-6 border-b border-soft-grey dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" role="tablist" aria-label={t('detailView.tabs.label')}>
                    {tabs.map((tab) => (
                         <button
                            key={tab}
                            id={`tab-${tab}`}
                            role="tab"
                            aria-selected={activeTab === tab}
                            aria-controls={`panel-${tab}`}
                            onClick={() => setActiveTab(tab)}
                            className={`${
                                activeTab === tab
                                ? 'border-raven-blue text-raven-blue'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                        >
                            {t(`detailView.tabs.${tab}`)}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="mt-6">
                <div id="panel-map" role="tabpanel" aria-labelledby="tab-map" hidden={activeTab !== 'map'}>
                    <MapView raven={raven} api={api} />
                </div>
                <div id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" hidden={activeTab !== 'preview'}>
                    <LivePreview raven={raven} api={api} settings={settings} />
                </div>
                <div id="panel-events" role="tabpanel" aria-labelledby="tab-events" hidden={activeTab !== 'events'}>
                    <EventsView raven={raven} api={api} onImageClick={onImageClick} />
                </div>
                <div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" hidden={activeTab !== 'settings'}>
                     <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                             <h3 className="text-xl font-bold">{t('detailView.settings.title')}</h3>
                             <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".json"
                                    style={{ display: 'none' }}
                                    aria-hidden="true"
                                />
                                <button
                                    onClick={handleUploadButtonClick}
                                    disabled={isFetchingSettings || isConfigError}
                                    className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-blue hover:bg-sky-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-blue disabled:bg-sky-blue/50 disabled:cursor-not-allowed"
                                    aria-label={t('detailView.settings.uploadTitle')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                    <span>{t('common.upload')}</span>
                                </button>
                                <button
                                    onClick={handleExportSettingsJSON}
                                    disabled={!settings}
                                    className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-charcoal-grey hover:bg-charcoal-grey/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-charcoal-grey disabled:bg-charcoal-grey/50 disabled:cursor-not-allowed"
                                    aria-label={t('detailView.settings.downloadTitle')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    <span>JSON</span>
                                </button>
                                {hasChanges && (
                                    <>
                                        <button onClick={handleResetChanges} disabled={isSaving} className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white disabled:opacity-50">{t('common.reset')}</button>
                                        <button onClick={handleSaveChanges} disabled={isSaving} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50">
                                            {isSaving ? t('common.saving') : t('common.saveChanges')}
                                        </button>
                                    </>
                                )}
                             </div>
                        </div>
                        {renderSettingsContent()}
                     </div>
                </div>
                <div id="panel-logs" role="tabpanel" aria-labelledby="tab-logs" hidden={activeTab !== 'logs'}>
                     <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
                        <h3 className="text-xl font-bold mb-4">{t('detailView.logs.title')}</h3>
                         <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {logs.length > 0 ? logs.map(log => (
                                 <div key={log.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-soft-grey dark:border-gray-700">
                                     <div className="flex justify-between items-center text-sm mb-2 gap-4">
                                         <div className="flex items-center gap-3 flex-grow min-w-0">
                                            <span className={`font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${log.request.method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>{log.request.method}</span>
                                            <span className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate" title={log.endpoint}>{log.endpoint}</span>
                                         </div>
                                         <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className={`font-bold px-2 py-0.5 rounded-md w-28 text-center ${log.response.ok ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                {log.response.status} {log.response.statusText}
                                            </span>
                                            <span className="text-xs text-gray-500 w-20 text-right">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                         </div>
                                     </div>
                                     <details>
                                        <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">{t('common.details')}</summary>
                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="font-semibold mb-1 text-sm">{t('detailView.logs.requestBody')}</h4>
                                                <JsonViewer jsonString={log.request.body} />
                                            </div>
                                             <div>
                                                <h4 className="font-semibold mb-1 text-sm">{t('detailView.logs.responseBody')}</h4>
                                                <JsonViewer jsonString={log.response.body} />
                                            </div>
                                        </div>
                                     </details>
                                 </div>
                            )) : <p>{t('detailView.logs.noLogs')}</p>}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};