// AOS animation utility functions
import AOS from 'aos';

/**
 * Refreshes AOS animations with a slight delay to ensure DOM is ready
 * Use this when you need to refresh animations after component updates
 */
export const refreshAnimations = () => {
  setTimeout(() => {
    AOS.refresh();
  }, 100);
};

/**
 * Adds staggered animations to a group of elements
 * @param {string} selector - CSS selector for the elements to animate
 * @param {string} animation - Animation name (e.g., 'fade-up', 'zoom-in')
 * @param {number} baseDelay - Starting delay in ms
 * @param {number} increment - Delay increment per element in ms
 */
export const addStaggeredAnimations = (selector, animation = 'fade-up', baseDelay = 100, increment = 50) => {
  setTimeout(() => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
      el.setAttribute('data-aos', animation);
      el.setAttribute('data-aos-delay', (baseDelay + (index * increment)).toString());
    });
    AOS.refresh();
  }, 100);
};

/**
 * Updates AOS configuration at runtime by re-initializing with new settings
 * @param {Object} config - AOS configuration object
 */
export const updateAOSConfig = (config) => {
  AOS.init(config);
};

/**
 * Hook to detect low-performance devices and simplify animations
 */
export const checkPerformance = () => {
  // Check if device is mobile or low-end
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEndDevice = window.navigator.hardwareConcurrency < 4;
  
  // Simplify animations on mobile/low-end devices but don't disable completely
  if (isMobile || isLowEndDevice) {
    updateAOSConfig({ 
      duration: 300,
      once: true,
      mirror: false,
      offset: 50
    });
  }
};

/**
 * Apply animation to dynamically loaded content
 * @param {HTMLElement} container - Container element with new content
 */
export const animateDynamicContent = (container) => {
  if (!container) return;
  
  const elements = container.querySelectorAll('[data-aos]');
  elements.forEach(el => {
    el.classList.add('aos-animate');
  });
};