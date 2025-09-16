
import React, { useState } from 'react';
import type { ApiCredentials } from '../types';

interface CredentialsFormProps {
  onSubmit: (credentials: ApiCredentials) => void;
  isLoading: boolean;
}

export const CredentialsForm: React.FC<CredentialsFormProps> = ({ onSubmit, isLoading }) => {
  const [apiUrl, setApiUrl] = useState('https://api.beta3.klashwerks.com/user-v1');
  const [apiKey, setApiKey] = useState('5c4def4c-cc8f-4fe9-9a1d-39176ff40285');
  const [apiSecret, setApiSecret] = useState('RavenConnected2024!');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ apiUrl, apiKey, apiSecret });
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">API Credentials</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">API URL</label>
          <input
            type="text"
            id="apiUrl"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="mt-1 block w-full bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
            required
          />
        </div>
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Integration Key</label>
          <input
            type="text"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-1 block w-full bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
            required
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Integration Secret</label>
          <input
            type="password"
            id="apiSecret"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            className="mt-1 block w-full bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
};