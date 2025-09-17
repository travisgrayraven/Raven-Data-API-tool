
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface BulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string, duration: number) => void;
  vehicleCount: number;
  isSending: boolean;
  sendResult: { success: number; error: number } | null;
}

export const BulkMessageModal: React.FC<BulkMessageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  vehicleCount,
  isSending,
  sendResult,
}) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(3); // Default to 3 minutes
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Reset message on open, but not other state
      setMessage('');
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;
    onSubmit(message, duration);
  };

  const hasResult = sendResult && (sendResult.success > 0 || sendResult.error > 0);
  
  const summaryText = t('bulkMessage.summary', { count: vehicleCount });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-message-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 sm:p-8 text-left relative w-full max-w-lg mx-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="bulk-message-title" className="text-2xl font-bold mb-2">{t('bulkMessage.modalTitle')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6" dangerouslySetInnerHTML={{ __html: summaryText }} />

        {isSending && !hasResult && (
          <div className="text-center py-8">
            <svg className="animate-spin mx-auto h-8 w-8 text-raven-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg">{t('bulkMessage.sendingTitle')}</p>
          </div>
        )}

        {hasResult && (
            <div className="text-center py-6">
                <h3 className="text-xl font-semibold mb-4">{t('bulkMessage.completeTitle')}</h3>
                {sendResult.success > 0 && (
                    <p className="text-green-600 dark:text-green-400">{t('bulkMessage.successMessage', { count: sendResult.success })}</p>
                )}
                {sendResult.error > 0 && (
                     <p className="text-red-600 dark:text-red-400 mt-2">{t('bulkMessage.errorMessage', { count: sendResult.error })}</p>
                )}
                <div className="mt-8">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        )}
        
        {!isSending && !hasResult && (
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <div className="flex justify-between items-baseline mb-1">
                      <label htmlFor="bulk-driver-message" className="block text-sm font-medium">{t('bulkMessage.messageLabel')}</label>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{message.length} / 15</span>
                  </div>
                  <input
                    type="text"
                    id="bulk-driver-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
                    placeholder={t('bulkMessage.placeholder')}
                    maxLength={15}
                    required
                    autoFocus
                  />
              </div>
              <div>
                  <label htmlFor="bulk-message-duration" className="block text-sm font-medium mb-1">{t('bulkMessage.durationLabel')}</label>
                  <select
                      id="bulk-message-duration"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
                  >
                      <option value={3}>{t('bulkMessage.minutes', { count: 3 })}</option>
                      <option value={5}>{t('bulkMessage.minutes', { count: 5 })}</option>
                      <option value={10}>{t('bulkMessage.minutes', { count: 10 })}</option>
                      <option value={15}>{t('bulkMessage.minutes', { count: 15 })}</option>
                      <option value={20}>{t('bulkMessage.minutes', { count: 20 })}</option>
                  </select>
              </div>

              <div className="mt-6 pt-4 border-t border-soft-grey dark:border-gray-700 flex justify-end gap-3">
                  <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium">{t('common.cancel')}</button>
                  <button
                      type="submit"
                      disabled={!message.trim() || vehicleCount === 0}
                      className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 disabled:bg-raven-blue/50 disabled:cursor-not-allowed"
                  >
                      {t('bulkMessage.submit')}
                  </button>
              </div>
          </form>
        )}
      </div>
    </div>
  );
};