import React, { useState, useMemo, useRef, useEffect } from 'react';
// FIX: Import 'types.ts' for its side-effects to make global JSX definitions available for web components.
import '../types';
import type { RavenDetails, ApiContextType } from '../types';
import { useTranslation } from '../i18n/i18n';

interface MediaViewProps {
  raven: RavenDetails;
  api: ApiContextType;
}

// Helper to get a default date and time string from an ISO string or now
const getDateTimeDefaults = (isoString?: string) => {
    const dateObj = isoString ? new Date(isoString) : new Date();
    
    // Set start of day
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);

    // Set end of day
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const toDateInputFormat = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const toTimeInputFormat = (d: Date) => d.toTimeString().split(' ')[0].substring(0, 5);

    return {
        startDate: toDateInputFormat(startOfDay),
        startTime: toTimeInputFormat(startOfDay),
        endDate: toDateInputFormat(endOfDay),
        endTime: toTimeInputFormat(endOfDay),
    };
};

export const MediaView: React.FC<MediaViewProps> = ({ raven, api }) => {
    const { t } = useTranslation();
    const defaults = getDateTimeDefaults(raven.last_known_location?.timestamp);
    
    const [startDate, setStartDate] = useState(defaults.startDate);
    const [startTime, setStartTime] = useState(defaults.startTime);
    const [endDate, setEndDate] = useState(defaults.endDate);
    const [endTime, setEndTime] = useState(defaults.endTime);
    
    const [timestamps, setTimestamps] = useState<{ start: string; end: string } | null>(null);
    const [sessionToken, setSessionToken] = useState(api.token);
    
    const viewerRef = useRef<HTMLElement>(null);
    
    useEffect(() => {
        setSessionToken(api.token);
    }, [api.token]);

    const apiDomain = useMemo(() => {
        try {
            const url = new URL(api.apiUrl);
            return url.hostname;
        } catch (e) {
            console.error("Invalid API URL provided:", api.apiUrl);
            return '';
        }
    }, [api.apiUrl]);

    const handleLoadTimeline = () => {
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        const startUnix = Math.floor(startDateTime.getTime() / 1000).toString();
        const endUnix = Math.floor(endDateTime.getTime() / 1000).toString();
        
        setTimestamps({ start: startUnix, end: endUnix });
    };

    // Handle token refresh events from the web component
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) return;
        
        const handleAuthError = async (e: Event) => {
            const detail = (e as CustomEvent).detail;
            console.error(`Enhanced Video Access Auth Error: ${detail.subtype}`, detail.data);
            // Assuming 'networkError' can mean an auth failure, let's try refreshing.
            if (detail.subtype === 'networkError') {
                 try {
                    console.log("Enhanced Video Access session may have expired, refreshing token...");
                    const newToken = await api.refreshToken();
                    setSessionToken(newToken);
                } catch (error) {
                    console.error("Failed to refresh token for Enhanced Video Access:", error);
                }
            }
        };

        viewer.addEventListener('evaError', handleAuthError);
        
        return () => {
            viewer.removeEventListener('evaError', handleAuthError);
        };
    }, [timestamps, api.refreshToken]);


    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
            <h3 className="text-xl font-bold mb-4">{t('detailView.media.title')}</h3>
            
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-soft-grey dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
                    <div>
                        <label htmlFor="start-date-media" className="block text-sm font-medium mb-1">{t('detailView.media.startDate')}</label>
                        <div className="flex gap-2">
                            <input 
                                type="date"
                                id="start-date-media"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                            />
                             <input 
                                type="time"
                                id="start-time-media"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="end-date-media" className="block text-sm font-medium mb-1">{t('detailView.media.endDate')}</label>
                        <div className="flex gap-2">
                            <input 
                                type="date"
                                id="end-date-media"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                            />
                            <input 
                                type="time"
                                id="end-time-media"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleLoadTimeline}
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue"
                    >
                        {t('detailView.media.loadTimeline')}
                    </button>
                </div>
            </div>
            
            {timestamps ? (
                <div style={{ height: '150px' }}>
                    <rc-enhanced-video-access
                        ref={viewerRef}
                        apidomain={apiDomain}
                        sessiontoken={sessionToken}
                        ravenid={raven.uuid}
                        starttimestamp={timestamps.start}
                        endtimestamp={timestamps.end}
                    />
                </div>
            ) : (
                <div className="text-center py-8 h-[150px] flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-soft-grey dark:border-gray-700">
                    <p>{t('detailView.media.prompt')}</p>
                </div>
            )}
        </div>
    );
};