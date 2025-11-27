'use client';

import { useEffect, useRef, useState } from 'react';

interface ProcessDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  stepNumber: number;
  originRect: DOMRect | null; // Position and size of the container that opened this modal
  children?: React.ReactNode;
}

export default function ProcessDetailModal({
  isOpen,
  onClose,
  title,
  icon,
  stepNumber,
  originRect,
  children
}: ProcessDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'opening' | 'open' | 'closing' | 'closed'>('closed');

  // Stop all audio playback when modal opens/closes
  useEffect(() => {
    // Stop all HTMLAudioElement instances
    const stopAllAudio = () => {
      // Find all audio elements in the document
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      
      // Also stop any Audio objects created via new Audio()
      // We'll dispatch a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('stop-all-audio'));
    };

    if (!isOpen) {
      // Stop audio when modal closes
      stopAllAudio();
    } else if (isOpen && originRect) {
      // Stop audio when modal opens (to prevent audio from previous modal playing)
      stopAllAudio();
    }
  }, [isOpen, originRect]);

  useEffect(() => {
    if (isOpen && originRect) {
      // Opening animation
      setIsAnimating(true);
      setAnimationPhase('opening');
      
      // After opening animation completes
      const timer = setTimeout(() => {
        setAnimationPhase('open');
        setIsAnimating(false);
      }, 400); // Match animation duration

      return () => clearTimeout(timer);
    } else if (!isOpen) {
      // Closing animation
      setIsAnimating(true);
      setAnimationPhase('closing');
      
      // After closing animation completes
      const timer = setTimeout(() => {
        setAnimationPhase('closed');
        setIsAnimating(false);
      }, 300); // Match animation duration

      return () => clearTimeout(timer);
    }
  }, [isOpen, originRect]);

  // Calculate modal style based on animation phase
  useEffect(() => {
    if (!modalRef.current || !originRect) return;

    const modal = modalRef.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Responsive sizing: smaller on mobile/tablet, full size on desktop
    // Desktop (≥1024px): 800x720 (20% taller than 600)
    // Tablet (768-1023px): 90% viewport with max 700x660 (20% taller than 550)
    // Mobile (<768px): 95% viewport with max 100% height
    const isMobile = viewportWidth < 768;
    const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
    
    let finalWidth: number;
    let finalHeight: number;
    
    if (isMobile) {
      finalWidth = Math.min(viewportWidth * 0.95, viewportWidth - 16);
      finalHeight = Math.min(viewportHeight * 0.95, viewportHeight - 16); // Increased from 0.9 to 0.95
    } else if (isTablet) {
      finalWidth = Math.min(viewportWidth * 0.9, 700);
      finalHeight = Math.min(viewportHeight * 0.85, 660); // Increased from 550 to 660 (20% taller)
    } else {
      finalWidth = 800;
      finalHeight = 720; // Increased from 600 to 720 (20% taller)
    }
    
    const finalX = (viewportWidth - finalWidth) / 2;
    const finalY = Math.max(8, (viewportHeight - finalHeight) / 2);

    const startX = originRect.left;
    const startY = originRect.top;
    const startWidth = originRect.width;
    const startHeight = originRect.height;

    if (animationPhase === 'opening') {
      // Set initial state (from container)
      modal.style.position = 'fixed';
      modal.style.left = `${startX}px`;
      modal.style.top = `${startY}px`;
      modal.style.width = `${startWidth}px`;
      modal.style.height = `${startHeight}px`;
      modal.style.transformOrigin = 'top left';
      modal.style.transition = 'none';
      modal.style.opacity = '0';
      
      // Force reflow
      modal.offsetHeight;
      
      // Animate to final state
      requestAnimationFrame(() => {
        modal.style.transition = 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)';
        modal.style.left = `${finalX}px`;
        modal.style.top = `${finalY}px`;
        modal.style.width = `${finalWidth}px`;
        modal.style.height = `${finalHeight}px`;
        modal.style.opacity = '1';
      });
    } else if (animationPhase === 'closing') {
      // Animate from current state back to origin
      requestAnimationFrame(() => {
        modal.style.transition = 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)';
        modal.style.left = `${startX}px`;
        modal.style.top = `${startY}px`;
        modal.style.width = `${startWidth}px`;
        modal.style.height = `${startHeight}px`;
        modal.style.opacity = '0';
      });
    } else if (animationPhase === 'open') {
      // Fully open state - recalculate in case window was resized
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Responsive sizing (same logic as above)
      const isMobile = viewportWidth < 768;
      const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
      
      let finalWidth: number;
      let finalHeight: number;
      
      if (isMobile) {
        finalWidth = Math.min(viewportWidth * 0.95, viewportWidth - 16);
        finalHeight = Math.min(viewportHeight * 0.95, viewportHeight - 16); // Increased from 0.9 to 0.95
      } else if (isTablet) {
        finalWidth = Math.min(viewportWidth * 0.9, 700);
        finalHeight = Math.min(viewportHeight * 0.85, 660); // Increased from 550 to 660 (20% taller)
      } else {
        finalWidth = 800;
        finalHeight = 720; // Increased from 600 to 720 (20% taller)
      }
      
      const finalX = (viewportWidth - finalWidth) / 2;
      const finalY = Math.max(8, (viewportHeight - finalHeight) / 2);
      
      modal.style.position = 'fixed';
      modal.style.left = `${finalX}px`;
      modal.style.top = `${finalY}px`;
      modal.style.width = `${finalWidth}px`;
      modal.style.height = `${finalHeight}px`;
      modal.style.transformOrigin = 'center center';
      modal.style.transition = 'none';
      modal.style.opacity = '1';
    }
  }, [animationPhase, originRect]);

  // Handle window resize to recalculate modal size
  useEffect(() => {
    if (animationPhase !== 'open') return;

    const handleResize = () => {
      if (!modalRef.current) return;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const isMobile = viewportWidth < 768;
      const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
      
      let finalWidth: number;
      let finalHeight: number;
      
      if (isMobile) {
        finalWidth = Math.min(viewportWidth * 0.95, viewportWidth - 16);
        finalHeight = Math.min(viewportHeight * 0.95, viewportHeight - 16); // Increased from 0.9 to 0.95
      } else if (isTablet) {
        finalWidth = Math.min(viewportWidth * 0.9, 700);
        finalHeight = Math.min(viewportHeight * 0.85, 660); // Increased from 550 to 660 (20% taller)
      } else {
        finalWidth = 800;
        finalHeight = 720; // Increased from 600 to 720 (20% taller)
      }
      
      const modal = modalRef.current;
      modal.style.width = `${finalWidth}px`;
      modal.style.height = `${finalHeight}px`;
      modal.style.left = `${(viewportWidth - finalWidth) / 2}px`;
      modal.style.top = `${Math.max(8, (viewportHeight - finalHeight) / 2)}px`;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [animationPhase]);

  if (animationPhase === 'closed' && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop - only visible when fully open, and doesn't close on click */}
      <div
        className={`fixed inset-0 bg-slate-900/70 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          animationPhase === 'open' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          pointerEvents: animationPhase === 'open' ? 'auto' : 'none',
          zIndex: 40
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-700 flex flex-col overflow-hidden"
        style={{ zIndex: 50 }}
      >
        {/* Header - Responsive padding and font sizes */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl px-3 py-2 md:px-6 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <img src="/unicsonic-logo.svg" alt="UnicSonic" className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />
            <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
              <span className="text-lg md:text-2xl flex-shrink-0">{icon}</span>
              <h2 className="text-sm md:text-xl font-bold text-white drop-shadow-md truncate">
                {title}
              </h2>
              <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-white/20 rounded text-xs font-bold text-white flex-shrink-0">
                {stepNumber}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 md:w-8 md:h-8 rounded hover:bg-white/20 flex items-center justify-center text-white transition-colors font-bold text-lg md:text-xl flex-shrink-0 ml-2"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Content - Responsive padding */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          {children || (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">🚧 Coming Soon</p>
              <p className="text-gray-500 text-sm">
                This feature is under development
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

