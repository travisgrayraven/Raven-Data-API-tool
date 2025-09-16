
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { RavenDetails, ApiContextType } from '../types';

interface GridPreviewProps {
  ravens: RavenDetails[];
  api: ApiContextType;
}

export const GridPreview: React.FC<GridPreviewProps> = ({ ravens, api }) => {
    const [activeCamera, setActiveCamera] = useState<'road' | 'cabin'>('road');
    const [sessionToken, setSessionToken] = useState(api.token);
    const viewerRefs = useRef<Map<string, HTMLElement>>(new Map());
    const isRefreshingToken = useRef(false);

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
                }
            `}</style>
            <div className="flex justify-center mb-6">
                <div className="inline-flex rounded-md shadow-sm bg-gray-100 dark:bg-slate-800 p-1" role="group">
                    <button
                        type="button"
                        onClick={() => setActiveCamera('road')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                            activeCamera === 'road' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow' : 'text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        Road
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveCamera('cabin')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                            activeCamera === 'cabin' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow' : 'text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        Cabin
                    </button>
                </div>
            </div>

            {ravens.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ravens.map(raven => (
                        <div key={raven.uuid} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
                             <h3 className="text-md font-bold text-center truncate mb-2 text-gray-900 dark:text-white" title={raven.name}>
                                {raven.name}
                            </h3>
                            <div className="w-full bg-black rounded-md overflow-hidden aspect-video">
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
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
                    <h2 className="text-xl font-semibold mb-2">No Vehicles Found</h2>
                    <p className="text-gray-600 dark:text-gray-400">No vehicles match the current filter criteria.</p>
                </div>
            )}
        </div>
    );
};
