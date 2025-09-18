import React from 'react';

const SkeletonText = ({ lines = 3, variant = 'shimmer' }) => {
  const animation = variant === 'pulse' ? 'skeleton-pulse' : 'skeleton-shimmer';
  const lineWidths = Array.from({ length: lines }).map((_, idx) => {
    if (idx === lines - 1) return 'w-2/3';
    const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12'];
    return widths[idx % widths.length];
  });

  return (
    <div role="status" aria-label="Loading text" className="space-y-2">
      {lineWidths.map((w, i) => (
        <div key={i} className={`h-3 ${w} rounded-md bg-gray-200 dark:bg-gray-700 ${animation}`} />
      ))}
    </div>
  );
};

export default SkeletonText;


