import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { RavenDetails, ApiContextType, Tab } from '../types';
import { useTranslation } from '../i18n/i18n';
import { GridItem } from './GridItem';

interface GridPreviewProps {
  ravens: RavenDetails[];
  api: ApiContextType;
  onSelectRaven: (raven: RavenDetails, initialTab: Tab) => void;
  isCabinCameraEnabled: boolean;
}

export const GridPreview: React.FC<GridPreviewProps> = ({ ravens, api, onSelectRaven, isCabinCameraEnabled }) => {
    const [activeCamera, setActiveCamera] = useState<'road' | 'cabin'>('road');
    const [sessionToken, setSessionToken] = useState(api.token);
    const viewerRefs = useRef<Map<string, HTMLElement>>(new Map());
    const isRefreshingToken = useRef(false);
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(1);
    
    // State to track the number of mounted viewers to correctly re-run the event listener effect
    const [viewerCount, setViewerCount] = useState(0);

    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(ravens.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedRavens = useMemo(() => ravens.slice(startIndex, endIndex), [ravens, startIndex, endIndex]);

    // Effect to adjust page number if filters change and current page becomes invalid
    useEffect(() => {
        const newTotalPages = Math.ceil(ravens.length / ITEMS_PER_PAGE);
        if (currentPage > newTotalPages) {
            setCurrentPage(newTotalPages > 0 ? newTotalPages : 1);
        }
    }, [ravens, currentPage, ITEMS_PER_PAGE]);


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

    // Callbacks to manage the map of viewer refs from child components
    const onViewerMount = useCallback((uuid: string, node: HTMLElement) => {
        viewerRefs.current.set(uuid, node);
        setViewerCount(prev => prev + 1);
    }, []);

    const onViewerUnmount = useCallback((uuid: string) => {
        viewerRefs.current.delete(uuid);
        setViewerCount(prev => prev - 1);
    }, []);

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
    }, [viewerCount, handleSessionExpired]); // Re-attach listeners when the set of viewers changes
    
    const PaginationControls = () => {
        if (totalPages <= 1) return null;

        const goToPage = (page: number) => {
            setCurrentPage(Math.max(1, Math.min(page, totalPages)));
        };

        return (
            <div className="flex justify-center items-center gap-2 sm:gap-4 my-6">
                <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={t('gridPreview.firstPage')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 4.293a1 1 0 010 1.414L5.414 10l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd" /><path fillRule="evenodd" d="M15.707 4.293a1 1 0 010 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </button>
                <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={t('gridPreview.previousPage')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                    {t('gridPreview.pageIndicator', { currentPage, totalPages })}
                </span>
                <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={t('gridPreview.nextPage')}
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                </button>
                 <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={t('gridPreview.lastPage')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" /><path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                </button>
            </div>
        );
    };


    return (
        <div className="mt-4">
             <style>{`
                rc-live-preview-viewer {
                    --media-control-background-color: transparent;
                    --media-control-active-background-color: transparent;
                    ${!isCabinCameraEnabled ? '--media-control-camera-toggle-icon-url: none;' : ''}
                }
            `}</style>
            {isCabinCameraEnabled && (
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
            )}

            <PaginationControls />

            {ravens.length > 0 ? (
                <div 
                    className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                >
                    {paginatedRavens.map(raven => (
                        <GridItem
                            key={raven.uuid}
                            raven={raven}
                            apiDomain={apiDomain}
                            sessionToken={sessionToken}
                            activeCamera={isCabinCameraEnabled ? activeCamera : 'road'}
                            onSelectRaven={onSelectRaven}
                            onViewerMount={onViewerMount}
                            onViewerUnmount={onViewerUnmount}
                        />
                    ))}
                </div>
            ) : (
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <h2 className="text-xl font-semibold mb-2">{t('dashboard.noVehiclesFound')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('dashboard.noFilteredVehiclesDescription')}</p>
                </div>
            )}
            <PaginationControls />
        </div>
    );
};
