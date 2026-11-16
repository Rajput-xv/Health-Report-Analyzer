// AOS animation utility functions
import AOS from "aos";

/**
 * Refreshes AOS animations with a slight delay to ensure DOM is ready
 * Use this when you need to refresh animations after component updates
 */
export const refreshAnimations = () => {
    setTimeout(() => {
        AOS.refreshHard();
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
    const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
        );
    const isLowEndDevice = window.navigator.hardwareConcurrency < 4;

    // Simplify animations on mobile/low-end devices but don't disable completely
    if (isMobile || isLowEndDevice) {
        updateAOSConfig({
            duration: 300,
            once: true,
            mirror: false,
            offset: 50,
        });
    }
};
