import React, { Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/tailwind.css';
import './styles/global.css';
import './styles/animations.css';
import './i18n';

// Import AOS
import AOS from 'aos';
import 'aos/dist/aos.css';

// Import Lenis for smooth scrolling
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

import { LoadingProvider } from './context/LoadingContext.jsx';

import { Analytics } from "@vercel/analytics/react";

// Detect if device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

// Initialize Lenis smooth scrolling - DISABLED on mobile to prevent scrolling issues
let lenis = null;
if (!isMobile) {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // Request animation frame for Lenis
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  // Integrate Lenis with AOS
  lenis.on('scroll', () => {
    AOS.refresh();
  });
}

// Initialize AOS with mobile-optimized settings
AOS.init({
  duration: isMobile ? 400 : 800, // Faster animations on mobile
  once: true, // Only animate once to improve performance
  mirror: false, // Don't repeat animations when scrolling back
  offset: isMobile ? 50 : 100, // Smaller offset on mobile
  delay: 0, // No delay on mobile
  easing: 'ease-out',
  anchorPlacement: 'top-bottom',
  disable: isMobile, // Disable AOS on mobile devices
  debounceDelay: 50,
  throttleDelay: 99,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LoadingProvider>
      <App />
      <Analytics />
    </LoadingProvider>
  </React.StrictMode>,
);