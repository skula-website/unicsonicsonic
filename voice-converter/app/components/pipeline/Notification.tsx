'use client';

import { useEffect, useState } from 'react';

interface NotificationProps {
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
}

export default function Notification({ message, type = 'success', duration = 3000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
  }[type];

  const icon = {
    success: '✓',
    info: 'ℹ',
    warning: '⚠',
    error: '✕',
  }[type];

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 min-w-[250px] max-w-[400px] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="text-xl font-bold">{icon}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
    </div>
  );
}

