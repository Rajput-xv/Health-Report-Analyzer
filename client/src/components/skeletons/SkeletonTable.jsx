import React from 'react';

const SkeletonCell = ({ className = '', variant = 'shimmer' }) => (
  <div className={`h-4 rounded-md bg-gray-200 dark:bg-gray-700 ${variant === 'pulse' ? 'skeleton-pulse' : 'skeleton-shimmer'} ${className}`} />
);

const SkeletonTable = ({ columns = 4, rows = 5, showHeaders = true, variant = 'shimmer' }) => {
  const cols = Array.from({ length: Math.max(columns, 1) });
  const rws = Array.from({ length: Math.max(rows, 1) });

  return (
    <div role="status" aria-label="Loading table" className="w-full overflow-x-auto">
      <div className="min-w-[600px] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {showHeaders && (
          <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {cols.map((_, i) => (
              <div key={`h-${i}`} className="bg-gray-50 dark:bg-gray-900 p-3 border-b border-gray-200 dark:border-gray-800">
                <SkeletonCell variant={variant} className="w-1/2 h-3" />
              </div>
            ))}
          </div>
        )}
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {rws.map((_, rIdx) => (
            <div
              key={`r-${rIdx}`}
              className={`grid p-3 ${rIdx % 2 === 1 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/60 dark:bg-gray-900/60'}`}
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {cols.map((_, cIdx) => (
                <div key={`c-${rIdx}-${cIdx}`} className="px-2 py-1">
                  <SkeletonCell variant={variant} className={`${cIdx === 0 ? 'w-2/3' : 'w-1/2'} h-3`} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkeletonTable;


