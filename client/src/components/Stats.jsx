import React, { useState, useEffect, useRef } from 'react';
import '../styles/Stats.css';

// Stats Section Component
function HealthStats() {
  const [isVisible, setIsVisible] = useState(false);
  const statsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, []);

  return (
    <section className="health-stats-section" ref={statsRef} data-aos="fade-up">
      <div className="health-stats-container">
        <div className="health-stats-header" data-aos="fade-down">
          <h2 className="health-stats-title">Our Impact in Numbers</h2>
          <p className="health-stats-subtitle">
            Trusted by thousands for accurate health insights
          </p>
        </div>

        <div className="health-stats-grid">
          <StatCard
            icon="📊"
            end={50000}
            suffix="+"
            label="Reports Analyzed"
            isVisible={isVisible}
            duration={2500}
            delay={0}
          />
          <StatCard
            icon="👥"
            end={15000}
            suffix="+"
            label="Happy Users"
            isVisible={isVisible}
            duration={2500}
            delay={200}
          />
          <StatCard
            icon="⚡"
            end={98}
            suffix="%"
            label="Accuracy Rate"
            isVisible={isVisible}
            duration={2000}
            delay={400}
          />
        </div>
      </div>
    </section>
  );
}

// Individual Stat Card with Animation
function StatCard({ icon, end, suffix, label, isVisible, duration, delay }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Add initial delay
    const delayTimeout = setTimeout(() => {
      let startTime;
      const startValue = 0;
      const endValue = end;

      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentCount = Math.floor(easeOutQuart * (endValue - startValue) + startValue);
        
        setCount(currentCount);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(delayTimeout);
  }, [isVisible, end, duration, delay]);

  return (
    <div className="health-stat-card" data-aos="zoom-in" data-aos-delay={delay}>
      <div className="health-stat-icon-wrapper">
        <span className="health-stat-icon">{icon}</span>
      </div>
      <div className="health-stat-number">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="health-stat-label">{label}</div>
    </div>
  );
}

// Export the component
export default HealthStats;