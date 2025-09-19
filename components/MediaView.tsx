import React, { useState, useMemo } from 'react';
// FIX: A direct import of '../types' is necessary to ensure its global JSX augmentations
// for custom web components are applied. Build tools might otherwise tree-shake modules
// that only appear to export types, preventing the global namespace from being extended.
import '../types';
import type { RavenDetails, ApiContextType } from '../types';
import { useTranslation } from '../i18n/i18n';

interface MediaViewProps {
  raven: RavenDetails;
  api: ApiContextType;
}

// Helper to format Date object to 'YYYY-MM-DD'
const dateToInputFormat = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to format Date object to 'HH:mm'
const timeToInputFormat = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

export const MediaView: React.FC<MediaViewProps> = ({ raven, api }) => {
    const { t } = useTranslation();

    const getInitialDates = () => {
        const lastReportTimestamp = raven.last_known_location?.timestamp;
        const now = lastReportTimestamp ? new Date(lastReportTimestamp) : new Date();
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        return {
            startDate: dateToInputFormat(start),
            startTime: timeToInputFormat(start),
            endDate: dateToInputFormat(now),
            endTime: timeToInputFormat(now),
        };
    };
    
    const [startDate, setStartDate] = useState(getInitialDates().startDate);
    const [startTime, setStartTime] = useState(getInitialDates().startTime);
    const [endDate, setEndDate] = useState(getInitialDates().endDate);
    const [endTime, setEndTime] = useState(getInitialDates().endTime);
    
    const [timelineParams, setTimelineParams] = useState<{ start: string; end: string } | null>(null);

    const apiDomain = useMemo(() => {
        try {
            const url = new URL(api.apiUrl);
            return url.hostname;
        } catch (e) {
            console.error("Invalid API URL provided:", api.apiUrl);
            return '';
        }
    }, [api.apiUrl]);

    const handleLoadMedia = (e: React.FormEvent) => {
        e.preventDefault();
        
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        const startTimestamp = Math.floor(startDateTime.getTime() / 1000).toString();
        const endTimestamp = Math.floor(endDateTime.getTime() / 1000).toString();
        
        setTimelineParams({ start: startTimestamp, end: endTimestamp });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
            <h3 className="text-xl font-bold mb-4">{t('detailView.media.title')}</h3>

            <form onSubmit={handleLoadMedia} className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-soft-grey dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
                    <div>
                        <label htmlFor="start-date-media" className="block text-sm font-medium mb-1">{t('detailView.media.startDate')}</label>
                        <input 
                            type="date"
                            id="start-date-media"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="start-time-media" className="block text-sm font-medium mb-1">{t('detailView.media.startTime')}</label>
                        <input 
                            type="time"
                            id="start-time-media"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="end-date-media" className="block text-sm font-medium mb-1">{t('detailView.media.endDate')}</label>
                        <input 
                            type="date"
                            id="end-date-media"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="end-time-media" className="block text-sm font-medium mb-1">{t('detailView.media.endTime')}</label>
                        <input 
                            type="time"
                            id="end-time-media"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="block w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 dark:[color-scheme:dark] focus:ring-raven-blue focus:border-raven-blue"
                            required
                        />
                    </div>
                    <button 
                        type="submit"
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50"
                    >
                        {t('detailView.media.loadMedia')}
                    </button>
                </div>
            </form>

            {timelineParams ? (
                <div className="h-48">
                    <rc-enhanced-video-access
                        apidomain={apiDomain}
                        sessiontoken={api.token}
                        ravenid={raven.uuid}
                        starttimestamp={timelineParams.start}
                        endtimestamp={timelineParams.end}
                    />
                </div>
            ) : (
                <div className="text-center py-8">
                    <p>{t('detailView.media.prompt')}</p>
                </div>
            )}
        </div>
    );
};