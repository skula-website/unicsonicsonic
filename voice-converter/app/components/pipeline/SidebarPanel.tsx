'use client';

import { useState } from 'react';

interface SidebarPanelProps {
  onOpenLyricWriter: (rect: DOMRect) => void;
}

export default function SidebarPanel({ onOpenLyricWriter }: SidebarPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const handleToolClick = (toolName: string, icon: string, onClick: (rect: DOMRect) => void) => {
    // Get the clicked element's position for zoom animation
    const element = document.getElementById(`tool-${toolName}`);
    if (element) {
      const rect = element.getBoundingClientRect();
      onClick(rect);
    }
  };

  const tools = [
    {
      id: 'lyric-writer',
      title: 'Lyrics Formatter',
      icon: '📝',
      description: 'Format lyrics for Apple Music/Spotify',
      onClick: onOpenLyricWriter,
    },
    {
      id: 'tool-2',
      title: 'Coming Soon',
      icon: '🔧',
      description: 'Additional tool',
      onClick: () => {},
      disabled: true,
    },
    {
      id: 'tool-3',
      title: 'Coming Soon',
      icon: '🔧',
      description: 'Additional tool',
      onClick: () => {},
      disabled: true,
    },
    {
      id: 'tool-4',
      title: 'Coming Soon',
      icon: '🔧',
      description: 'Additional tool',
      onClick: () => {},
      disabled: true,
    },
  ];

  return (
    <div className="bg-slate-800 rounded-xl shadow-xl border-2 border-slate-700 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <h2 className="text-xl font-bold text-white">Auxiliary Tools</h2>
        </div>
        {/* Collapse button - visible on all screen sizes */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white hover:text-blue-400 transition-colors text-lg font-bold"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Tools - collapsible on all screen sizes, closed by default */}
      {!isExpanded ? (
        // Collapsed view: Show only titles with very small text
        <div className="space-y-1.5">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="flex items-center gap-2 text-gray-400"
            >
              <span className="text-xs">{tool.icon}</span>
              <span className={`text-[10px] ${tool.disabled ? 'opacity-40' : ''}`}>
                {tool.title}
              </span>
            </div>
          ))}
        </div>
      ) : (
        // Expanded view: Show full tool cards
        <div className="grid grid-cols-1 gap-3">
          {tools.map((tool) => (
            <div
              key={tool.id}
              id={`tool-${tool.id}`}
              onClick={() => !tool.disabled && handleToolClick(tool.id, tool.icon, tool.onClick)}
              className={`
                bg-slate-700 rounded-lg p-4 border-2 transition-all cursor-pointer
                ${tool.disabled 
                  ? 'border-slate-600 opacity-50 cursor-not-allowed' 
                  : 'border-slate-600 hover:border-blue-500 hover:bg-slate-600'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tool.icon}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm mb-1">{tool.title}</h3>
                  <p className="text-gray-400 text-xs">{tool.description}</p>
                </div>
                {!tool.disabled && (
                  <span className="text-blue-400 text-xs">→</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

