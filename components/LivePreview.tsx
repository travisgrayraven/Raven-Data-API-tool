import React, { useEffect, useRef, useState, useMemo } from 'react';
// FIX: Changed from 'import type' to ensure the module is evaluated, applying global JSX augmentations.
// FIX: Changed `import type` to a regular `import` to ensure the module containing global JSX augmentations is evaluated.
import { RavenDetails, ApiContextType, RavenSettings } from '../types';
import { useTranslation } from '../i18n/i18n';

// FIX: Removed the local `declare global` block. The types for custom web components
// are now correctly sourced from the central `types.ts` file, resolving conflicts and errors.

interface LivePreviewProps {
  raven: RavenDetails;
  api: ApiContextType;
  settings: RavenSettings | null;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ raven, api, settings }) => {
    const [mode, setMode] = useState<'preview' | 'stream'>('preview');
    const { t } = useTranslation();

    const roadViewerRef = useRef<HTMLElement>(null);
    const cabinViewerRef = useRef<HTMLElement>(null);
    const streamViewerRef = useRef<HTMLElement>(null);
    const [sessionToken, setSessionToken] = useState(api.token);
    
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

    useEffect(() => {
        const viewers = [roadViewerRef.current, cabinViewerRef.current, streamViewerRef.current].filter(Boolean);
        if (viewers.length === 0) return;

        const handleSessionExpired = async () => {
            console.log("Live view session expired, refreshing token...");
            try {
                const newToken = await api.refreshToken();
                setSessionToken(newToken);
            } catch (error) {
                console.error("Failed to refresh token for live view:", error);
                // The main app component will handle logout on refresh failure.
            }
        };

        const handleAuthError = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            console.error(`Live View Auth Error: ${detail.subtype}`, detail.data);
            if (detail.subtype === 'forbidden') {
                handleSessionExpired();
            }
        };

        viewers.forEach(element => {
            element?.addEventListener('sessionExpired', handleSessionExpired);
            element?.addEventListener('authError', handleAuthError);
        });
        
        return () => {
             viewers.forEach(element => {
                element?.removeEventListener('sessionExpired', handleSessionExpired);
                element?.removeEventListener('authError', handleAuthError);
            });
        };
    }, [api.refreshToken, roadViewerRef.current, cabinViewerRef.current, streamViewerRef.current, mode]);

    const isAudioSupported = settings?.audio?.streaming_audio_enabled === true;

    if (!raven.online) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
                <h3 className="text-xl font-bold mb-4">{t('detailView.livePreview.title')}</h3>
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-soft-grey dark:border-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M11.106 12.212a3 3 0 0 1 4.242 0M13.924 9.388a1.5 1.5 0 0 1 2.122 0M3 3l18 18" />
                    </svg>
                    <h4 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{t('detailView.livePreview.offlineTitle')}</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('detailView.livePreview.offlineDescription')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
            {/* 
                Inject a style tag to visually hide the camera toggle button within the web component.
            */}
            <style>{`
                rc-live-preview-viewer,
                rc-streaming-video-player {
                    --media-control-background-color: transparent;
                    --media-control-active-background-color: transparent;
                }
            `}</style>

            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h3 className="text-xl font-bold">{t('detailView.livePreview.title')}</h3>
                <div className="inline-flex rounded-md shadow-sm bg-gray-100 dark:bg-gray-700/50 p-1" role="group">
                    <button
                        type="button"
                        onClick={() => setMode('preview')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                            mode === 'preview' ? 'bg-white dark:bg-charcoal-grey/20 text-raven-blue dark:text-white shadow' : 'text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                        }`}
                    >
                        {t('detailView.tabs.preview')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('stream')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                            mode === 'stream' ? 'bg-white dark:bg-charcoal-grey/20 text-raven-blue dark:text-white shadow' : 'text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                        }`}
                    >
                        {t('detailView.livePreview.stream')}
                    </button>
                </div>
            </div>

            {mode === 'preview' ? (
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold mb-2 text-center">{t('detailView.livePreview.roadCamera')}</h4>
                        <div className="relative w-full mx-auto bg-black rounded-md overflow-hidden aspect-video">
                            <rc-live-preview-viewer
                                ref={roadViewerRef}
                                apidomain={apiDomain}
                                sessiontoken={sessionToken}
                                ravenid={raven.uuid}
                                activecamera="road"
                                inactivitytimeoutseconds="300"
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold mb-2 text-center">{t('detailView.livePreview.cabinCamera')}</h4>
                        <div className="relative w-full mx-auto bg-black rounded-md overflow-hidden aspect-video">
                            <rc-live-preview-viewer
                                ref={cabinViewerRef}
                                apidomain={apiDomain}
                                sessiontoken={sessionToken}
                                ravenid={raven.uuid}
                                activecamera="cabin"
                                inactivitytimeoutseconds="300"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <h4 className="text-lg font-semibold mb-2 text-center">{t('detailView.livePreview.stream')}</h4>
                    <div className="relative w-full max-w-2xl mx-auto bg-black rounded-md overflow-hidden aspect-video">
                        <rc-streaming-video-player
                            ref={streamViewerRef}
                            apidomain={apiDomain}
                            sessiontoken={sessionToken}
                            ravenid={raven.uuid}
                            activecamera="road"
                            inactivitytimeoutseconds="300"
                            {...(isAudioSupported && { audiosupported: true })}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
