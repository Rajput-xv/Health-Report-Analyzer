import React from 'react';

const SkeletonBlock = ({ className = '' }) => (
  <div className={`skeleton-base ${className}`} />
);

const SkeletonCard = ({
  showAvatar = true,
  showHeader = true,
  showButton = true,
  width = '100%',
  height = 'auto',
  variant = 'shimmer',
}) => {
  const animation = variant === 'pulse' ? 'skeleton-pulse' : 'skeleton-shimmer';

  return (
    <div
      role="status"
      aria-label="Loading card"
      className={`w-full max-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 md:p-6 transition-colors duration-200`}
      style={{ width, height }}
    >
      {showHeader && (
        <div className="flex items-center gap-4 mb-4">
          {showAvatar && (
            <div className={`h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 ${animation}`} />
          )}
          <div className="flex-1">
            <div className={`h-4 w-2/3 rounded-md bg-gray-200 dark:bg-gray-700 mb-2 ${animation}`} />
            <div className={`h-3 w-1/2 rounded-md bg-gray-200 dark:bg-gray-700 ${animation}`} />
          </div>
          {showButton && (
            <div className={`h-9 w-24 rounded-lg bg-gray-200 dark:bg-gray-700 ${animation}`} />
          )}
        </div>
      )}

      <div className="space-y-3">
        <SkeletonBlock className={`h-40 w-full rounded-lg bg-gray-200 dark:bg-gray-700 ${animation}`} />
        <div className={`h-3 w-11/12 rounded-md bg-gray-200 dark:bg-gray-700 ${animation}`} />
        <div className={`h-3 w-9/12 rounded-md bg-gray-200 dark:bg-gray-700 ${animation}`} />
        <div className={`h-3 w-5/12 rounded-md bg-gray-200 dark:bg-gray-700 ${animation}`} />
      </div>
    </div>
  );
};

export default SkeletonCard;


