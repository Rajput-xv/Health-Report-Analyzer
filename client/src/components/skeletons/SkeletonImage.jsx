import React from 'react';

const SkeletonImage = ({ width = '100%', height = 200, rounded = 'md', variant = 'shimmer', ariaLabel = 'Loading image' }) => {
  const roundedClass = typeof rounded === 'string' ? `rounded-${rounded}` : (rounded ? 'rounded-full' : 'rounded-none');
  const animation = variant === 'pulse' ? 'skeleton-pulse' : 'skeleton-shimmer';
  return (
    <div role="img" aria-label={ariaLabel} className={`skeleton-base ${roundedClass} ${animation}`} style={{ width, height }} />
  );
};

export default SkeletonImage;


