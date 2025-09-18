import React from 'react';

/**
 * Skeleton wrapper
 * Props:
 * - type: 'text' | 'card' | 'table' | 'image'
 * - variant: 'pulse' | 'shimmer'
 * - className: string
 * - children: ReactNode (optional)
 * - ariaLabel: string (default: 'Loading content')
 */
const Skeleton = ({ type = 'text', variant = 'shimmer', className = '', children, ariaLabel = 'Loading content' }) => {
  const base = 'skeleton-base';
  const animation = variant === 'pulse' ? 'skeleton-pulse' : 'skeleton-shimmer';

  return (
    <div role="status" aria-live="polite" aria-label={ariaLabel} className={className}>
      <div className={`${base} ${animation}`}>
        {children}
      </div>
    </div>
  );
};

export default Skeleton;


