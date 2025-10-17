import { useEffect } from 'react';

/**
 * Custom hook to control Lenis smooth scrolling
 * @param {Object} options - Lenis options
 * @returns {Object} - Lenis control functions
 */
export const useLenis = (callback) => {
  useEffect(() => {
    if (callback) {
      // Access the global lenis instance if needed
      const handleScroll = (e) => {
        callback(e);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [callback]);
};

/**
 * Scroll to a specific element or position
 * @param {string|number} target - Element selector or scroll position
 * @param {Object} options - Scroll options
 */
export const scrollTo = (target, options = {}) => {
  if (typeof target === 'string') {
    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        ...options,
      });
    }
  } else if (typeof target === 'number') {
    window.scrollTo({
      top: target,
      behavior: 'smooth',
      ...options,
    });
  }
};

/**
 * Scroll to top of the page
 */
export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

/**
 * Stop smooth scrolling
 */
export const stopScroll = () => {
  document.documentElement.classList.add('lenis-stopped');
};

/**
 * Resume smooth scrolling
 */
export const startScroll = () => {
  document.documentElement.classList.remove('lenis-stopped');
};

export default {
  useLenis,
  scrollTo,
  scrollToTop,
  stopScroll,
  startScroll,
};
