

import React, { useState } from 'react';
import type { RavenDetails, ApiContextType } from '../types';
import { setDriverMessage, clearDriverMessage } from '../services/ravenApi';

interface DriverMessageManagerProps {
  raven: RavenDetails;
  api: ApiContextType;
}

export const DriverMessageManager: React.FC<DriverMessageManagerProps> = ({ raven, api }) => {
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(3); // Default to 3 minutes
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const isLoading = isSending || isClearing;

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    setError(null);
    try {
      const durationInSeconds = duration * 60;
      await setDriverMessage(api, raven.uuid, message, durationInSeconds);
      showSuccessMessage('Message sent successfully!');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearMessage = async () => {
    setIsClearing(true);
    setError(null);
    try {
      await clearDriverMessage(api, raven.uuid);
      showSuccessMessage('Message cleared successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-inner">
      <h3 className="text-xl font-bold mb-4">Driver Display Message</h3>
      <form onSubmit={handleSendMessage} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
            <div className="flex justify-between items-baseline mb-1">
                <label htmlFor="driver-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                <span className="text-xs text-gray-500 dark:text-gray-400">{message.length} / 15</span>
            </div>
            <input
              type="text"
              id="driver-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="block w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter a message to display..."
              maxLength={15}
            />
          </div>
          <div>
            <label htmlFor="message-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
            <select
                id="message-duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="block w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
                <option value={3}>3 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 border-t border-gray-200 dark:border-slate-700 pt-4">
          <div className="flex-grow min-h-[1.5rem]">
            {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
           <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClearMessage}
                disabled={isLoading}
                className="w-full sm:w-auto flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? 'Clearing...' : 'Clear Message'}
              </button>
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {isSending ? 'Sending...' : 'Send Message'}
              </button>
          </div>
        </div>
      </form>
    </div>
  );
};
