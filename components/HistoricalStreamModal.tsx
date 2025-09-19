import React, { useEffect, useRef, useState, useMemo } from 'react';
// FIX: A direct import of '../types' is necessary to ensure its global JSX augmentations
// for custom web components are applied. Build tools might otherwise tree-shake modules
// that only appear to export types, preventing the global namespace from being extended.
import '../types';
import type { RavenDetails, ApiContextType } from '../types';
import { useTranslation } from '../i18n/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface HistoricalStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  raven: RavenDetails;
  api: ApiContextType;
  startTimestamp: string | null;
  isAudioSupported: boolean;
  isCabinCameraEnabled: boolean;
}

export const HistoricalStreamModal: React.FC<HistoricalStreamModalProps> = ({
  isOpen,
  onClose,
  raven,
  api,
  startTimestamp,
  isAudioSupported,
  isCabinCameraEnabled,
}) => {
  const { t } = useTranslation();
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  const streamViewerRef = useRef<HTMLElement>(null);
  const [sessionToken, setSessionToken] = useState(api.token);

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);
  
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


  if (!isOpen || !startTimestamp) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stream-modal-title"
    >
        <style>{`
            rc-streaming-video-player {
                --media-control-background-color: transparent;
                --media-control-active-background-color: transparent;
                ${!isCabinCameraEnabled ? '--media-control-camera-toggle-icon-url: none;' : ''}
            }
        `}</style>
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 sm:p-6 w-full max-w-2xl mx-4 relative focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 id="stream-modal-title" className="text-xl font-bold">{t('historicalStream.title')}</h2>
            <button
                className="p-1 text-gray-500 dark:text-gray-400 text-3xl hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none"
                onClick={onClose}
                aria-label={t('common.close')}
            >
                &times;
            </button>
        </div>
        
        <div className="relative w-full bg-black rounded-md overflow-hidden aspect-video">
            <rc-streaming-video-player
                ref={streamViewerRef}
                apidomain={apiDomain}
                sessiontoken={sessionToken}
                ravenid={raven.uuid}
                starttimestamp={startTimestamp}
                activecamera="road"
                inactivitytimeoutseconds="300"
                {...(isAudioSupported && { audiosupported: true })}
            />
        </div>
      </div>
    </div>
  );
};