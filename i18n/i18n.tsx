


import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Define the shape of the context
interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, options?: { [key: string]: string | number | undefined | null }) => string;
}

// Create the context
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Define supported languages
export const supportedLanguages: { [key: string]: string } = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
};

// The provider component
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
        const savedLang = localStorage.getItem('language');
        if (savedLang && supportedLanguages[savedLang]) {
          return savedLang;
        }
        const browserLang = navigator.language.split('-')[0];
        return supportedLanguages[browserLang] ? browserLang : 'en';
    }
    return 'en';
  });
  
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTranslations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/i18n/translations/${language}.json`);
        if (!response.ok) {
          throw new Error(`Could not load ${language}.json`);
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error("Failed to fetch translations:", error);
        // Fallback to English if the selected language file fails to load
        if (language !== 'en') {
          console.log("Falling back to English");
          const response = await fetch(`/i18n/translations/en.json`);
          const data = await response.json();
          setTranslations(data);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchTranslations();
  }, [language]);

  const handleSetLanguage = (lang: string) => {
    if (supportedLanguages[lang]) {
      localStorage.setItem('language', lang);
      setLanguage(lang);
    }
  };

  const t = useCallback((key: string, options?: { [key: string]: string | number | undefined | null }): string => {
    const keys = key.split('.');
    let result: any = translations;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key; // Return the key if translation is not found
      }
    }
    
    // FIX: The `replace` method must be called on a string. The original reduce implementation was causing a type error.
    // This has been rewritten using a standard for...of loop to ensure type safety.
    if (typeof result === 'string' && options) {
      let tempResult = result;
      for (const [optKey, optValue] of Object.entries(options)) {
          tempResult = tempResult.replace(`{{${optKey}}}`, String(optValue ?? ''));
      }
      return tempResult;
    }

    return typeof result === 'string' ? result : key;
  }, [translations]);

  const value = {
    language,
    setLanguage: handleSetLanguage,
    t,
  };

  // Prevent rendering children until translations are loaded
  if (isLoading) {
      return null; 
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

// The custom hook to use the context
export const useTranslation = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
