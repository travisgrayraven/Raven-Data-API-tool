import React, { useState, useEffect } from 'react';

const CABIN_CAMERA_ENABLED_KEY = 'cabinCameraEnabled';

/**
 * A custom hook to manage the cabin camera visibility setting.
 * It persists the user's choice in local storage.
 * @returns A stateful value for whether the cabin camera is enabled, and a function to update it. Defaults to true.
 */
export const useCabinCamera = (): [boolean, React.Dispatch<React.SetStateAction<boolean>>] => {
  const [isCabinCameraEnabled, setIsCabinCameraEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedValue = window.localStorage.getItem(CABIN_CAMERA_ENABLED_KEY);
      // Default to true if nothing is saved or the value is invalid
      return savedValue !== null ? JSON.parse(savedValue) : true;
    }
    // Default for non-browser environments
    return true;
  });

  useEffect(() => {
    window.localStorage.setItem(CABIN_CAMERA_ENABLED_KEY, JSON.stringify(isCabinCameraEnabled));
  }, [isCabinCameraEnabled]);

  return [isCabinCameraEnabled, setIsCabinCameraEnabled];
};
