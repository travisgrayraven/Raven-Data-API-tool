
import React, { useState } from 'react';
import type { RavenDetails, ApiContextType } from '../types';
import { getTripShareUrl } from '../services/ravenApi';
import { QRCodeModal } from './QRCodeModal';
import { useTranslation } from '../i18n/i18n';

interface TripShareManagerProps {
  raven: RavenDetails;
  api: ApiContextType;
}

export const TripShareManager: React.FC<TripShareManagerProps> = ({ raven, api }) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalTrigger, setQrModalTrigger] = useState<HTMLElement | null>(null);
  const { t } = useTranslation();

  const handleGenerateLink = async () => {
    setIsLoading(true);
    setError(null);
    setShareUrl(null);
    setCopySuccess(false);
    try {
      const url = await getTripShareUrl(api, raven.uuid);
      setShareUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
    });
  };

  const handleOpenQrModal = () => {
    setQrModalTrigger(document.activeElement as HTMLElement);
    setIsQrModalOpen(true);
  };

  const handleCloseQrModal = () => {
    setIsQrModalOpen(false);
    qrModalTrigger?.focus();
  };

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner">
      <h3 className="text-xl font-bold mb-4">{t('tripShare.title')}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('tripShare.description')}
      </p>

      {shareUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="block w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm"
            />
            <button
                onClick={handleCopyToClipboard}
                className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
                {copySuccess ? t('common.copied') : t('common.copy')}
            </button>
            <button
                onClick={handleOpenQrModal}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                aria-label={t('tripShare.showQr')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm2 2v-1h1v1H5zM8 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V4zm2 2V5h1v1h-1zM8 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1v-2zm2 2v-1h1v1h-1zM13 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zm2 2V5h1v1h-1zM13 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zm2 2v-1h1v1h-1z" clipRule="evenodd" /></svg>
            </button>
          </div>
          <div className="flex justify-end pt-2">
            <button
                onClick={handleGenerateLink}
                disabled={isLoading}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50"
            >
                {isLoading ? t('common.generating') : t('tripShare.generateNew')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end pt-2">
            <button
                onClick={handleGenerateLink}
                disabled={isLoading}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50"
            >
                {isLoading ? t('common.generating') : t('tripShare.generate')}
            </button>
        </div>
      )}
      
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
      
      {isQrModalOpen && shareUrl && (
          <QRCodeModal 
            isOpen={isQrModalOpen}
            url={shareUrl}
            onClose={handleCloseQrModal}
          />
      )}
    </div>
  );
};