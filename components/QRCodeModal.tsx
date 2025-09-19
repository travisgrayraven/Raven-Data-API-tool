
import React, { useEffect } from 'react';
// FIX: The default import from 'qrcode.react' was causing a type error. Switched to the named export 'QRCodeSVG' which is a valid JSX component.
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../i18n/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface QRCodeModalProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ url, isOpen, onClose }) => {
  const { t } = useTranslation();
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
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 text-center relative max-w-sm w-full mx-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 text-3xl hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none"
          onClick={onClose}
          aria-label={t('qrModal.close')}
        >
          &times;
        </button>
        <h2 id="qr-modal-title" className="text-2xl font-bold mb-4">{t('qrModal.title')}</h2>
        <div className="p-4 bg-white inline-block rounded-md">
            {/* FIX: Updated component usage to match the new named import 'QRCodeSVG'. */}
            <QRCodeSVG value={url} size={256} />
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 break-all">{url}</p>
      </div>
    </div>
  );
};
