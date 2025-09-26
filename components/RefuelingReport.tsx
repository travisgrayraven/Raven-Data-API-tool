import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { RavenDetails, ApiContextType, RavenEvent } from '../types';
import { getRavenEvents, processWithConcurrency, getMediaUrlViaProxy } from '../services/ravenApi';
import { useTranslation } from '../i18n/i18n';

declare const jspdf: any;

interface RefuelingEventData {
    raven: RavenDetails;
    event: RavenEvent;
}

interface RefuelingReportProps {
  ravens: RavenDetails[];
  api: ApiContextType;
  isActive: boolean;
  onImageClick: (images: string[], index: number) => void;
}

const dateToInputFormat = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getFormattedFilename = (prefix: string, extension: 'csv' | 'pdf') => {
    const now = new Date();
    const pad = (num: number) => num.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    return `${timestamp}_${prefix}_report.${extension}`;
};

const EventMediaItem: React.FC<{
    mediaUrl?: string;
    error?: string;
    isLoading: boolean;
    label: string;
    onImageClick: () => void;
}> = ({ mediaUrl, error, isLoading, label, onImageClick }) => {
    return (
        <div className="flex flex-col items-center flex-1 min-w-[200px] sm:min-w-[300px]">
             <div className="w-full h-auto aspect-video bg-gray-200 dark:bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-700 overflow-hidden">
                {isLoading && (
                    <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                )}
                {error && <p className="text-xs text-red-500 text-center p-2">{error}</p>}
                {mediaUrl && <img src={mediaUrl} alt={label} className="w-full h-full object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={onImageClick} />}
            </div>
        </div>
    );
};


export const RefuelingReport: React.FC<RefuelingReportProps> = ({ ravens, api, isActive, onImageClick }) => {
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7); // Default to 7 days ago
        return d;
    });
    const [endDate, setEndDate] = useState(() => new Date());
    const [events, setEvents] = useState<RefuelingEventData[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // State for media fetching
    const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
    const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({});
    const [loadingMedia, setLoadingMedia] = useState<Set<string>>(new Set());
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

    const handleFetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setEvents(null);
        setMediaUrls({});
        setMediaErrors({});
        setLoadingMedia(new Set());

        try {
            const processRaven = async (raven: RavenDetails): Promise<RefuelingEventData[]> => {
                const ravenEvents = await getRavenEvents(api, raven.uuid, startDate, endDate);
                return ravenEvents
                    .filter(e => e.event_type === 'REFUELING')
                    .map(event => ({ raven, event }));
            };

            const results = await processWithConcurrency(ravens, processRaven, 5);
            const allRefuelingEvents = results.flat().sort((a, b) => 
                new Date(b.event.event_timestamp).getTime() - new Date(a.event.event_timestamp).getTime()
            );
            setEvents(allRefuelingEvents);

        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.fetchEvents'));
        } finally {
            setIsLoading(false);
        }
    }, [api, ravens, startDate, endDate, t]);
    
     useEffect(() => {
        if (!events) return;

        const mediaItemsToFetch = events.flatMap(({ raven, event }) => {
            const roadIds = (event.road_media_ids || []).map(mediaId => ({ ravenUuid: raven.uuid, mediaId }));
            const cabinIds = (event.cabin_media_ids || []).map(mediaId => ({ ravenUuid: raven.uuid, mediaId }));
            return [...roadIds, ...cabinIds];
        }).filter(item => item.mediaId && !mediaUrls[item.mediaId] && !mediaErrors[item.mediaId] && !loadingMedia.has(item.mediaId));

        if (mediaItemsToFetch.length === 0) return;

        setLoadingMedia(prev => new Set([...prev, ...mediaItemsToFetch.map(item => item.mediaId)]));

        const processMediaItem = async (item: { ravenUuid: string, mediaId: string }) => {
            try {
                const url = await getMediaUrlViaProxy(api, item.ravenUuid, item.mediaId);
                return { id: item.mediaId, url };
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : t('errors.loadMedia');
                return { id: item.mediaId, error: errorMessage };
            }
        };

        (async () => {
            const results = await processWithConcurrency(mediaItemsToFetch, processMediaItem, 5);

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
                mediaItemsToFetch.forEach(item => newSet.delete(item.mediaId));
                return newSet;
            });
        })();

    }, [events, api, mediaUrls, mediaErrors, loadingMedia, t]);

    const handleImageClick = (clickedEventData: RefuelingEventData, clickedMediaUrl: string) => {
        const eventMediaIds = [
            ...(clickedEventData.event.road_media_ids || []), 
            ...(clickedEventData.event.cabin_media_ids || [])
        ];
        
        const eventMediaUrls = eventMediaIds
            .map(id => mediaUrls[id])
            .filter((url): url is string => !!url);
    
        const clickedIndex = eventMediaUrls.findIndex(url => url === clickedMediaUrl);
    
        if (clickedIndex !== -1 && eventMediaUrls.length > 0) {
            onImageClick(eventMediaUrls, clickedIndex);
        }
    };

    const handleExportCSV = () => {
        if (!events) return;

        const headers = ["Vehicle Name", "VIN", "Timestamp (UTC)", "Latitude", "Longitude"];
        const csvRows = [headers.join(',')];

        events.forEach(({ raven, event }) => {
            const row = [
                `"${raven.name.replace(/"/g, '""')}"`,
                raven.vehicle_vin || '',
                event.event_timestamp,
                event.latitude ?? '',
                event.longitude ?? ''
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', getFormattedFilename('refueling', 'csv'));
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = async () => {
        if (!events) return;

        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    
        let y = 15;
        const pageHeight = doc.internal.pageSize.height;
        const leftMargin = 15;
        const imageBoxWidth = 85;
        const imageBoxHeight = (imageBoxWidth * 9) / 16; // 16:9 aspect ratio
        const colGap = 5;

        doc.setFontSize(18);
        doc.text(t('refuelingReport.title'), leftMargin, y);
        y += 10;

        for (const { raven, event } of events) {
            const eventBlockHeight = 25 + imageBoxHeight;

            if (y + eventBlockHeight > pageHeight - 15) {
                doc.addPage();
                y = 15;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(raven.name, leftMargin, y);
            y += 5;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text(`${t('refuelingReport.table.timestamp')}: ${new Date(event.event_timestamp).toLocaleString()}`, leftMargin, y);
            y += 4;

            if (event.latitude && event.longitude) {
                doc.text(`${t('refuelingReport.table.location')}: ${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`, leftMargin, y);
                y += 4;
            }
            y += 5; // Space before images

            const addImageToPdf = async (mediaId: string, x: number, yPos: number) => {
                const mediaUrl = mediaUrls[mediaId];
                if (!mediaUrl) return;
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

                    doc.addImage(dataUrl, 'JPEG', x, yPos, pdfImageWidth, pdfImageHeight);
                } catch (e) {
                    doc.text(`[${t('errors.imageLoadFailed')}]`, x + 5, yPos + 20);
                }
            };
            
            const roadMediaId = (event.road_media_ids || [])[0];
            const cabinMediaId = (event.cabin_media_ids || [])[0];

            if (roadMediaId) await addImageToPdf(roadMediaId, leftMargin, y);
            if (cabinMediaId) await addImageToPdf(cabinMediaId, leftMargin + imageBoxWidth + colGap, y);

            y += imageBoxHeight + 10;
            doc.setDrawColor(200);
            doc.line(leftMargin, y, doc.internal.pageSize.width - leftMargin, y);
            y += 5;
        }

        doc.save(getFormattedFilename('refueling', 'pdf'));
    };

    if (!isActive) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
            <h3 className="text-xl font-bold mb-2">{t('refuelingReport.title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('refuelingReport.description')}</p>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-soft-grey dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div>
                        <label htmlFor="start-date-refuel" className="block text-sm font-medium mb-1">{t('detailView.events.startDate')}</label>
                        <input 
                            type="date"
                            id="start-date-refuel"
                            value={dateToInputFormat(startDate)}
                            onChange={(e) => setStartDate(new Date(e.target.value + 'T00:00:00'))}
                            className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date-refuel" className="block text-sm font-medium mb-1">{t('detailView.events.endDate')}</label>
                        <input 
                            type="date"
                            id="end-date-refuel"
                            value={dateToInputFormat(endDate)}
                             onChange={(e) => setEndDate(new Date(e.target.value + 'T00:00:00'))}
                            className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                        />
                    </div>
                    <button 
                        onClick={handleFetchEvents}
                        disabled={isLoading || ravens.length === 0}
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? t('common.loading') : t('refuelingReport.fetchButton')}
                    </button>
                </div>
                {events && (
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={handleExportCSV} 
                            disabled={!events || events.length === 0}
                            className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-charcoal-grey hover:bg-charcoal-grey/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-charcoal-grey disabled:bg-charcoal-grey/50 disabled:cursor-not-allowed" 
                            aria-label={t('dashboard.exportCsvTitle')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            <span>{t('dashboard.exportCsv')}</span>
                        </button>
                         <button 
                            onClick={handleExportPDF} 
                            disabled={!events || events.length === 0}
                            className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-alert-red hover:bg-alert-red/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-alert-red disabled:bg-alert-red/50 disabled:cursor-not-allowed" 
                            aria-label={t('detailView.events.exportPdfTitle')}
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2-2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                            <span>{t('refuelingReport.exportPdf')}</span>
                        </button>
                    </div>
                )}
            </div>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {!events && !isLoading && !error && (
                <div className="text-center py-8">
                    <p>{t('refuelingReport.prompt')}</p>
                </div>
            )}
            
            {events && events.length === 0 && (
                 <div className="text-center py-8">
                    <p>{t('refuelingReport.noEvents')}</p>
                </div>
            )}
            
            {events && events.length > 0 && (
                <div className="space-y-6">
                    {events.map(({ raven, event }) => {
                        const roadMediaId = (event.road_media_ids || [])[0];
                        const cabinMediaId = (event.cabin_media_ids || [])[0];
                        return (
                            <div key={event.event_id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-soft-grey dark:border-gray-700">
                                <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{raven.name}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(event.event_timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        {event.latitude && event.longitude && (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-raven-blue hover:underline"
                                            >
                                                {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
                                            </a>
                                        )}
                                    </div>
                                </div>
                                 <div className="flex flex-wrap gap-4 pt-3 border-t border-soft-grey dark:border-gray-700">
                                    {roadMediaId && (
                                        <EventMediaItem
                                            key={roadMediaId}
                                            label={t('settings.camera.roadCamera')}
                                            mediaUrl={mediaUrls[roadMediaId]}
                                            error={mediaErrors[roadMediaId]}
                                            isLoading={loadingMedia.has(roadMediaId)}
                                            onImageClick={() => handleImageClick({ raven, event }, mediaUrls[roadMediaId])}
                                        />
                                    )}
                                    {cabinMediaId && (
                                         <EventMediaItem
                                            key={cabinMediaId}
                                            label={t('settings.camera.cabinCamera')}
                                            mediaUrl={mediaUrls[cabinMediaId]}
                                            error={mediaErrors[cabinMediaId]}
                                            isLoading={loadingMedia.has(cabinMediaId)}
                                            onImageClick={() => handleImageClick({ raven, event }, mediaUrls[cabinMediaId])}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};