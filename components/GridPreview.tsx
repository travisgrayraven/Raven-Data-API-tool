

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { RavenDetails, ApiContextType } from '../types';
import { useTranslation } from '../i18n/i18n';

interface GridPreviewProps {
  ravens: RavenDetails[];
  api: ApiContextType;
}

export const GridPreview: React.FC<GridPreviewProps> = ({ ravens, api }) => {
    const [activeCamera, setActiveCamera] = useState<'road' | 'cabin'>('road');
    const [sessionToken, setSessionToken] = useState(api.token);
    const viewerRefs = useRef<Map<string, HTMLElement>>(new Map());
    const isRefreshingToken = useRef(false);
    const { t } = useTranslation();

    // FIX: Synchronize the internal session token state with the token from props.
    // This ensures that if the token is refreshed elsewhere in the app, the viewers
    // receive the updated token.
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

    const handleSessionExpired = useCallback(async () => {
        if (isRefreshingToken.current) return;
        isRefreshingToken.current = true;
        console.log("Grid preview session expired, refreshing token...");
        try {
            const newToken = await api.refreshToken();
            setSessionToken(newToken);
        } catch (error) {
            console.error("Failed to refresh token for grid preview:", error);
        } finally {
            isRefreshingToken.current = false;
        }
    }, [api]);

    useEffect(() => {
        const handleAuthError = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            console.error(`Grid Preview Auth Error: ${detail.subtype}`, detail.data);
            if (detail.subtype === 'forbidden') {
                handleSessionExpired();
            }
        };

        const refsMap = viewerRefs.current;
        refsMap.forEach(viewer => {
            viewer.addEventListener('sessionExpired', handleSessionExpired);
            viewer.addEventListener('authError', handleAuthError);
        });

        return () => {
            refsMap.forEach(viewer => {
                viewer.removeEventListener('sessionExpired', handleSessionExpired);
                viewer.removeEventListener('authError', handleAuthError);
            });
        };
    }, [ravens, handleSessionExpired]);

    return (
        <div className="mt-4">
             <style>{`
                rc-live-preview-viewer {
                    --media-control-background-color: transparent;
                    --media-control-active-background-color: transparent;
                    border-radius: 0.375rem; /* Corresponds to Tailwind's rounded-md */
                }
            `}</style>
            <div className="flex justify-center mb-6">
                <div className="inline-flex rounded-md shadow-sm bg-gray-100 dark:bg-gray-700/50 p-1" role="group">
                    <button
                        type="button"
                        onClick={() => setActiveCamera('road')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                            activeCamera === 'road' ? 'bg-white dark:bg-charcoal-grey/20 text-raven-blue dark:text-white shadow' : 'text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                        }`}
                    >
                        {t('detailView.livePreview.roadCamera')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveCamera('cabin')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                            activeCamera === 'cabin' ? 'bg-white dark:bg-charcoal-grey/20 text-raven-blue dark:text-white shadow' : 'text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                        }`}
                    >
                        {t('detailView.livePreview.cabinCamera')}
                    </button>
                </div>
            </div>

            {ravens.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ravens.map(raven => (
                        <div key={raven.uuid} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                             <h3 className="text-md font-bold text-center truncate mb-2 text-gray-900 dark:text-white" title={raven.name}>
                                {raven.name}
                            </h3>
                            <div className="w-full bg-black rounded-md overflow-hidden aspect-video">
                                {raven.online ? (
                                    <rc-live-preview-viewer
                                        ref={el => {
                                            if (el) viewerRefs.current.set(raven.uuid, el);
                                            else viewerRefs.current.delete(raven.uuid);
                                        }}
                                        apidomain={apiDomain}
                                        sessiontoken={sessionToken}
                                        ravenid={raven.uuid}
                                        activecamera={activeCamera}
                                        inactivitytimeoutseconds="300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-center p-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M11.106 12.212a3 3 0 0 1 4.242 0M13.924 9.388a1.5 1.5 0 0 1 2.122 0M3 3l18 18" />
                                        </svg>
                                        <p className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">{t('ravenCard.status.offline')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <h2 className="text-xl font-semibold mb-2">{t('dashboard.noVehiclesFound')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('dashboard.noFilteredVehiclesDescription')}</p>
                </div>
            )}
        </div>
    );
};