import React, { useEffect, useState, useMemo, useRef } from 'react';
// FIX: Import 'types.ts' for its side-effects to make global JSX definitions available for web components.
import '../types';
import type { RavenDetails, ApiContextType, RavenSettings } from '../types';
import { useTranslation } from '../i18n/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface HistoricalStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTimestamp?: string;
  eventType?: string;
  raven: RavenDetails;
  api: ApiContextType;
  settings: RavenSettings | null;
}

export const HistoricalStreamModal: React.FC<HistoricalStreamModalProps> = ({
  isOpen,
  onClose,
  startTimestamp,
  eventType,
  raven,
  api,
  settings,
}) => {
  const { t } = useTranslation();
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  const streamViewerRef = useRef<HTMLElement>(null);
  
  const [sessionToken, setSessionToken] = useState(api.token);

  // Keep the session token synchronized with the main app's token
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
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);
  
  // Effect to handle session token refreshes for the web component
  useEffect(() => {
    const viewer = streamViewerRef.current;
    if (!viewer) return;

    const handleSessionExpired = async () => {
        console.log("Historical stream session expired, refreshing token...");
        try {
            const newToken = await api.refreshToken();
            setSessionToken(newToken);
        } catch (error) {
            console.error("Failed to refresh token for historical stream:", error);
        }
    };

    const handleAuthError = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        console.error(`Historical Stream Auth Error: ${detail.subtype}`, detail.data);
        if (detail.subtype === 'forbidden') {
            handleSessionExpired();
        }
    };

    viewer.addEventListener('sessionExpired', handleSessionExpired);
    viewer.addEventListener('authError', handleAuthError);
    
    return () => {
        viewer.removeEventListener('sessionExpired', handleSessionExpired);
        viewer.removeEventListener('authError', handleAuthError);
    };
  }, [api.refreshToken, streamViewerRef.current]);

  if (!isOpen) {
    return null;
  }

  const isAudioSupported = settings?.audio?.streaming_audio_enabled === true;
  const modalTitle = t('detailView.events.historicalStreamTitle', { eventType: eventType || 'Event' });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="historical-stream-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 sm:p-6 text-left relative w-full max-w-3xl mx-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 id="historical-stream-title" className="text-xl font-bold">{modalTitle}</h2>
            <button
                className="p-1 -mr-2 text-gray-500 dark:text-gray-400 text-3xl hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none"
                onClick={onClose}
                aria-label={t('common.close')}
            >
                &times;
            </button>
        </div>
        
        {startTimestamp ? (
             <div className="relative w-full bg-black rounded-md overflow-hidden aspect-video">
                <rc-streaming-video-player
                    ref={streamViewerRef}
                    apidomain={apiDomain}
                    sessiontoken={sessionToken}
                    ravenid={raven.uuid}
                    activecamera="road"
                    starttimestamp={startTimestamp}
                    seekintervalseconds="15"
                    inactivitytimeoutseconds="90"
                    {...(isAudioSupported && { audiosupported: true })}
                />
            </div>
        ) : (
            <div className="w-full aspect-video flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-md">
                <p>{t('common.error')}: Invalid start time.</p>
            </div>
        )}
      </div>
    </div>
  );
};