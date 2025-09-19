

import React, { useState, useEffect, useRef } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useTranslation, supportedLanguages } from '../i18n/i18n';

interface HeaderActionsProps {
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  isCabinCameraEnabled: boolean;
  setIsCabinCameraEnabled: (enabled: boolean) => void;
  onReset: () => void;
  onShare: () => void;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({ theme, setTheme, isCabinCameraEnabled, setIsCabinCameraEnabled, onReset, onShare }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleActionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-raven-blue dark:hover:text-sky-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue dark:focus:ring-offset-black rounded-md transition-colors duration-300"
          aria-label={t('header.openSettings')}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20">
            <div className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
                <span className="font-medium">{t('header.theme')}</span>
                <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
            <div className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
                <label htmlFor="cabin-camera-toggle" className="font-medium">{t('header.cabinCamera')}</label>
                 <input
                    id="cabin-camera-toggle"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-raven-blue focus:ring-raven-blue"
                    checked={isCabinCameraEnabled}
                    onChange={(e) => setIsCabinCameraEnabled(e.target.checked)}
                />
            </div>
            <div className="border-t border-soft-grey dark:border-gray-700 my-1"></div>
            <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                <label htmlFor="language-select" className="font-medium">{t('header.language')}</label>
                <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1 block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
                >
                    {Object.entries(supportedLanguages).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                    ))}
                </select>
            </div>
            <div className="border-t border-soft-grey dark:border-gray-700 my-1"></div>
            <button
              onClick={() => handleActionClick(onShare)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm2 2v-1h1v1H5zM8 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V4zm2 2V5h1v1h-1zM8 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1v-2zm2 2v-1h1v1h-1zM13 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zm2 2V5h1v1h-1zM13 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zm2 2v-1h1v1h-1z" clipRule="evenodd" /></svg>
              {t('header.shareApp')}
            </button>
            <div className="border-t border-soft-grey dark:border-gray-700 my-1"></div>
            <button
              onClick={() => handleActionClick(onReset)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {t('header.resetCredentials')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
