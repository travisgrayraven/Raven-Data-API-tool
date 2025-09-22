import React, { useState, useEffect, useRef } from 'react';
// FIX: Import 'types.ts' for its side-effects to make global JSX definitions available for web components.
import '../types';
import type { RavenDetails, Tab } from '../types';
import { useTranslation } from '../i18n/i18n';

interface GridItemProps {
    raven: RavenDetails;
    activeCamera: 'road' | 'cabin';
    sessionToken: string;
    apiDomain: string;
    onSelectRaven: (raven: RavenDetails, initialTab: Tab) => void;
    handleSessionExpired: () => void;
}

const getRavenStatus = (raven: RavenDetails, t: (key: string) => string) => {
    if (raven.unplugged) {
        return {
            text: t('ravenCard.status.unplugged'),
            color: 'text-safety-orange dark:text-safety-orange',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
            title: t('ravenCard.statusTitle.unplugged')
        };
    }
    if (!raven.online) {
        return {
            text: t('ravenCard.status.offline'),
            color: 'text-charcoal-grey dark:text-light-grey',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>,
            title: t('ravenCard.statusTitle.offline')
        };
    }
    if (raven.engineOn) {
        return {
            text: t('ravenCard.status.driving'),
            color: 'text-green-600 dark:text-green-400',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h2a1 1 0 001-1V7a1 1 0 00-1-1h-2" /></svg>,
            title: t('ravenCard.status.driving')
        };
    }
    return { // Parked
        text: t('ravenCard.status.parked'),
        color: 'text-raven-blue dark:text-sky-blue',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 10h1.5a2.5 2.5 0 110 5H10v-5z" /></svg>,
        title: t('ravenCard.status.parked')
    };
};

export const GridItem: React.FC<GridItemProps> = ({ raven, activeCamera, sessionToken, apiDomain, onSelectRaven, handleSessionExpired }) => {
    const { t } = useTranslation();
    const ref = useRef<HTMLDivElement | null>(null);
    const viewerRef = useRef<HTMLElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const status = getRavenStatus(raven, t);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // When the element is intersecting the viewport, set isVisible to true
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // We only need to do this once, so disconnect the observer
                    observer.disconnect();
                }
            },
            {
                // Optional: Start loading when the item is 200px away from the viewport
                rootMargin: '200px',
            }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    // Effect for handling authentication errors from the web component
    useEffect(() => {
        if (!isVisible || !viewerRef.current) return;

        const handleAuthError = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            console.error(`Grid Item Auth Error for ${raven.name}: ${detail.subtype}`, detail.data);
            if (detail.subtype === 'forbidden') {
                handleSessionExpired();
            }
        };
        
        const viewer = viewerRef.current;
        viewer.addEventListener('sessionExpired', handleSessionExpired);
        viewer.addEventListener('authError', handleAuthError);

        return () => {
            viewer.removeEventListener('sessionExpired', handleSessionExpired);
            viewer.removeEventListener('authError', handleAuthError);
        };
    }, [isVisible, handleSessionExpired, raven.name]);

    return (
        <div ref={ref} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-h-[215px]">
            <div className="flex justify-between items-center mb-2 gap-2">
                 <button 
                    onClick={() => onSelectRaven(raven, 'preview')}
                    className="text-md font-bold truncate text-gray-900 dark:text-white hover:text-raven-blue dark:hover:text-sky-blue focus:outline-none focus:underline"
                    title={t('gridPreview.viewDetails', { vehicleName: raven.name })}
                >
                    {raven.name}
                </button>
                <div title={status.title} className={`flex-shrink-0 flex items-center gap-1.5 ${status.color}`}>
                    {status.icon}
                    <span className="text-xs font-semibold">{status.text}</span>
                </div>
            </div>
            <div className="relative w-full bg-black rounded-md overflow-hidden aspect-video">
                {isVisible ? (
                    raven.online ? (
                        <rc-live-preview-viewer
                            ref={viewerRef}
                            apidomain={apiDomain}
                            sessiontoken={sessionToken}
                            ravenid={raven.uuid}
                            activecamera={activeCamera}
                            inactivitytimeoutseconds="300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M11.106 12.212a3 3 0 0 1 4.242 0M13.924 9.388a1.5 1.5 0 0 1 2.122 0M3 3l18 18" />
                            </svg>
                        </div>
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
};