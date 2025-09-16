import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { RavenDetails, ApiContextType } from '../types';

interface LivePreviewProps {
  raven: RavenDetails;
  api: ApiContextType;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ raven, api }) => {
    const roadViewerRef = useRef<HTMLElement>(null);
    const cabinViewerRef = useRef<HTMLElement>(null);
    const [sessionToken, setSessionToken] = useState(api.token);
    
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
        const viewers = [roadViewerRef.current, cabinViewerRef.current].filter(Boolean);
        if (viewers.length === 0) return;

        const handleSessionExpired = async () => {
            console.log("Live preview session expired, refreshing token...");
            try {
                const newToken = await api.refreshToken();
                setSessionToken(newToken);
            } catch (error) {
                console.error("Failed to refresh token for live preview:", error);
                // The main app component will handle logout on refresh failure.
            }
        };

        const handleAuthError = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            console.error(`Live Preview Auth Error: ${detail.subtype}`, detail.data);
            if (detail.subtype === 'forbidden') {
                handleSessionExpired();
            }
        };

        viewers.forEach(element => {
            element.addEventListener('sessionExpired', handleSessionExpired);
            element.addEventListener('authError', handleAuthError);
        });
        
        return () => {
             viewers.forEach(element => {
                element.removeEventListener('sessionExpired', handleSessionExpired);
                element.removeEventListener('authError', handleAuthError);
            });
        };
    }, [api.refreshToken, roadViewerRef.current, cabinViewerRef.current]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-inner">
            {/* 
                Inject a style tag to visually hide the camera toggle button within the web component.
                This is done via CSS custom properties as the component uses a shadow DOM,
                which prevents direct styling of its internal elements.
            */}
            <style>{`
                rc-live-preview-viewer {
                    --media-control-background-color: transparent;
                    --media-control-active-background-color: transparent;
                }
            `}</style>
            <h3 className="text-xl font-bold mb-4">Live Preview</h3>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold mb-2 text-center">Road Camera</h4>
                    <div className="w-full mx-auto bg-black rounded-md overflow-hidden aspect-video">
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
                    <h4 className="text-lg font-semibold mb-2 text-center">Cabin Camera</h4>
                    <div className="w-full mx-auto bg-black rounded-md overflow-hidden aspect-video">
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
        </div>
    );
};