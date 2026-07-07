import { memo, type ReactNode } from 'react';

interface ZoomState {
  scale: number;
  numPages: number;
  currentPage: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

interface ToolbarProps {
  title: string;
  zoom: ZoomState;
  children?: ReactNode;
}

function Toolbar({ title, zoom, children }: ToolbarProps) {
  return (
    <nav className="bg-white shadow-sm border-b flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">{title}</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={zoom.onZoomOut}
              disabled={!zoom.canZoomOut}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              aria-label="Reducir zoom"
            >
              −
            </button>
            <span className="text-sm font-medium text-gray-700 w-14 text-center">
              {Math.round(zoom.scale * 100)}%
            </span>
            <button
              onClick={zoom.onZoomIn}
              disabled={!zoom.canZoomIn}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              aria-label="Aumentar zoom"
            >
              +
            </button>
            {zoom.numPages > 0 && (
              <span className="text-sm text-gray-500 ml-2 w-20 text-center">
                {zoom.currentPage} / {zoom.numPages}
              </span>
            )}
          </div>

          {children && <div className="flex items-center gap-4 flex-shrink-0">{children}</div>}
        </div>
      </div>
    </nav>
  );
}

export default memo(Toolbar);
