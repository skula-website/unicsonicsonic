'use client';

interface FileInfoHeaderProps {
  fileName: string;
  fileSize?: number;
  processes?: Array<{ processId: number; processName: string; processIcon: string }>;
  className?: string;
}

export default function FileInfoHeader({ fileName, fileSize, processes, className = '' }: FileInfoHeaderProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`bg-slate-800 border-b border-slate-700 px-3 py-1.5 rounded-t-lg ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">
          <span className="text-sm">📄</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate" title={fileName}>
            {fileName}
          </p>
          {fileSize && (
            <p className="text-xs text-gray-400">{formatFileSize(fileSize)}</p>
          )}
        </div>
        {processes && processes.length > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1">
            <span className="text-xs text-gray-400">Processer:</span>
            <div className="flex items-center gap-1">
              {processes.slice(-3).map((process, idx) => (
                <span key={idx} className="text-xs" title={process.processName}>
                  {process.processIcon}
                </span>
              ))}
              {processes.length > 3 && (
                <span className="text-xs text-gray-500">+{processes.length - 3}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

