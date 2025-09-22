




import React, { useState, useEffect } from 'react';
import type { Geofence } from '../types';

interface GeofenceDetailModalProps {
  geofence: Geofence;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedGeofence: Geofence) => Promise<void>;
}

// FIX: Add helper function to derive active status from the 'end' date, as 'is_active' does not exist on the Geofence type.
const isGeofenceActive = (g: Geofence): boolean => {
    if (g.end === null) return true;
    const endDate = new Date(g.end);
    // Check for invalid date string
    if (isNaN(endDate.getTime())) return false; 
    return endDate > new Date();
};


export const GeofenceDetailModal: React.FC<GeofenceDetailModalProps> = ({ geofence, isOpen, onClose, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Geofence>(geofence);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset form data when the geofence prop changes (e.g., opening a new one)
    setFormData(geofence);
    setIsEditing(false); // Reset to view mode
    setError(null);
  }, [geofence]);

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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // FIX: Replaced handleActiveToggle to modify the 'end' date instead of a non-existent 'is_active' property.
  const handleActiveToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    if (checked) {
      // Set to active: clear the end date (never expires)
      setFormData(prev => ({ ...prev, end: null }));
    } else {
      // Set to inactive: set end date to yesterday to mark as expired
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setFormData(prev => ({ ...prev, end: yesterday.toISOString() }));
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    setFormData(geofence); // Revert changes
    setIsEditing(false);
    setError(null);
  }

  if (!isOpen) return null;

  // FIX: Use the helper function to derive the active state for rendering.
  const isFormDataActive = isGeofenceActive(formData);
  const isCurrentGeofenceActive = isGeofenceActive(geofence);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="geofence-modal-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 sm:p-8 text-left relative w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
            <h2 id="geofence-modal-title" className="text-2xl font-bold mb-4">{isEditing ? 'Edit Geofence' : 'Geofence Details'}</h2>
            <button
              className="p-1 -mt-2 -mr-2 text-gray-500 dark:text-gray-400 text-3xl hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none"
              onClick={onClose}
              aria-label="Close modal"
            >
              &times;
            </button>
        </div>

        <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                {isEditing ? (
                     <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
                    />
                ) : (
                    <p className="mt-1 text-lg">{geofence.name}</p>
                )}
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                 {isEditing ? (
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-1 block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
                    />
                 ) : (
                    <p className="mt-1 text-md text-gray-700 dark:text-gray-200">{geofence.description || <span className="italic text-gray-400 dark:text-gray-500">No description</span>}</p>
                 )}
            </div>
            
            <div className="flex items-center justify-between py-2">
                 <label htmlFor="is_active" className="text-sm font-medium">Status</label>
                 {isEditing ? (
                    <div className="flex items-center">
                        {/* FIX: Use derived isFormDataActive for conditional rendering. */}
                        <span className={`mr-3 text-sm font-medium ${isFormDataActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                            {isFormDataActive ? 'Active' : 'Inactive'}
                        </span>
                        <label htmlFor="is_active" className="relative inline-flex items-center cursor-pointer">
                          {/* FIX: Use derived isFormDataActive for checked state. */}
                          <input type="checkbox" id="is_active" className="sr-only peer" checked={isFormDataActive} onChange={handleActiveToggle} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-raven-blue"></div>
                        </label>
                    </div>
                 ) : (
                    // FIX: Use derived isCurrentGeofenceActive for conditional rendering.
                    isCurrentGeofenceActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Active</span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Inactive</span>
                    )
                 )}
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="mt-8 pt-4 border-t border-soft-grey dark:border-gray-700 flex justify-end gap-3">
          {isEditing ? (
            <>
              <button onClick={handleCancel} disabled={isSaving} className="py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raven-blue disabled:bg-raven-blue/50">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90">Edit</button>
          )}
        </div>

      </div>
    </div>
  );
};