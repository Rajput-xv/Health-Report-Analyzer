import React, { useEffect, useState } from 'react';

// Read the current theme from the source of truth: the body.dark-mode class,
// falling back to the persisted preference.
const readIsDark = () =>
  (typeof document !== 'undefined' && document.body.classList.contains('dark-mode')) ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('darkMode') === 'true');

const applyTheme = (on) => {
  document.body.classList.toggle('dark-mode', on);
  // Keep the <html> `dark` class in sync so Tailwind `dark:` utilities work too
  document.documentElement.classList.toggle('dark', on);
};

const DarkModeToggle = () => {
  const [darkMode, setDarkMode] = useState(readIsDark);

  useEffect(() => {
    // Apply the persisted preference on mount (so reloads keep the theme).
    applyTheme(localStorage.getItem('darkMode') === 'true');
    setDarkMode(document.body.classList.contains('dark-mode'));

    // Stay in sync with the body class so EVERY toggle instance (desktop nav +
    // mobile drawer) reflects the current theme — toggling one updates the others,
    // fixing the "knob stuck" mismatch when switching between mobile and desktop.
    const observer = new MutationObserver(() => {
      setDarkMode(document.body.classList.contains('dark-mode'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleToggle = () => {
    const next = !document.body.classList.contains('dark-mode');
    applyTheme(next);
    try {
      localStorage.setItem('darkMode', String(next));
    } catch (err) {
      console.warn(err);
    }
    setDarkMode(next); // the observer also catches this; setting it here avoids a frame of lag
  };

  return (
    <label
      style={{
        position: "relative",
        display: "inline-block",
        width: "50px",
        height: "26px",
        cursor: "pointer",
        margin: "0",
      }}
    >
      <input
        type="checkbox"
        checked={darkMode}
        onChange={handleToggle}
        style={{ display: "none" }}
      />

      {/* Track */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: darkMode ? "#2d3748" : "#8a9cebff",
          borderRadius: "26px",
          transition: "0.4s",
        }}
      ></span>

      {/* Icons */}
      <span
        style={{
          position: "absolute",
          left: "7px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "0.72rem",
        }}
      >
        ☀️
      </span>
      <span
        style={{
          position: "absolute",
          right: "7px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "0.72rem",
        }}
      >
        🌙
      </span>

      {/* Knob */}
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: darkMode ? "27px" : "3px",
          width: "20px",
          height: "20px",
          backgroundColor: "#4a52c0ff", // blue knob
          borderRadius: "50%",
          transition: "0.3s",
        }}
      ></span>
    </label>
  );
};

export default DarkModeToggle;
