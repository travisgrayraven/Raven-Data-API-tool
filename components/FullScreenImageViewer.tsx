
import React, { useEffect } from 'react';

interface FullScreenImageViewerProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'next' | 'prev') => void;
}

export const FullScreenImageViewer: React.FC<FullScreenImageViewerProps> = ({ isOpen, images, currentIndex, onClose, onNavigate }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft') {
        if (currentIndex > 0) onNavigate('prev');
      } else if (event.key === 'ArrowRight') {
        if (currentIndex < images.length - 1) onNavigate('next');
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
  }, [isOpen, onClose, onNavigate, currentIndex, images.length]);

  if (!isOpen) {
    return null;
  }

  const imageUrl = images[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 focus:outline-none z-20"
        onClick={onClose}
        aria-label="Close full screen image viewer"
      >
        &times;
      </button>

      {/* Left Navigation */}
      {canGoPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }}
          className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Previous image"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}

      <div className="relative max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
        <img src={imageUrl} alt={`Full screen media view ${currentIndex + 1} of ${images.length}`} className="block max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
      </div>

      {/* Right Navigation */}
      {canGoNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate('next'); }}
          className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Next image"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
};
