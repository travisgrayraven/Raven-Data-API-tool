import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * A reusable hook to trap focus within a specified element (e.g., a modal).
 * @param isOpen - A boolean indicating if the element (modal) is currently open.
 * @returns A React ref to be attached to the container element that should trap focus.
 */
export const useFocusTrap = <T extends HTMLElement>(isOpen: boolean) => {
  const ref = useRef<T>(null);

  const handleFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) {
      return;
    }

    const focusableElements = Array.from(
      ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) { // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else { // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen && ref.current) {
        // Add tabindex to make the container focusable, then focus it.
        ref.current.setAttribute('tabindex', '-1');
        ref.current.focus();
        document.addEventListener('keydown', handleFocus);
    }

    return () => {
      document.removeEventListener('keydown', handleFocus);
    };
  }, [isOpen, handleFocus]);

  return ref;
};
