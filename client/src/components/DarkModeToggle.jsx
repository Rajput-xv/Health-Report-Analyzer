  import React, { useEffect, useState } from 'react';

  const DarkModeToggle = () => {
    const [darkMode, setDarkMode] = useState(() => {
      // Check localStorage for persisted mode
      return localStorage.getItem('darkMode') === 'true';
    });

    useEffect(() => {
      if (darkMode) {
        document.body.classList.add('dark-mode');
        // Keep the <html> `dark` class in sync so Tailwind `dark:` utilities work too
        document.documentElement.classList.add('dark');
      } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    return (
    <label
        style={{
          position: "relative",
          display: "inline-block",
          width: "70px",
          height: "34px",
          cursor: "pointer",
          margin: "14px 12px",
        }}
      >
        <input
          type="checkbox"
          checked={darkMode}
          onChange={() => setDarkMode((prev) => !prev)}
          style={{ display: "none" }}
        />

        {/* Track */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: darkMode ? "#2d3748" : "#8a9cebff",
            borderRadius: "34px",
            transition: "0.4s",
            
          }}
        ></span>

        {/* Icons */}
        <span
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "1rem",
          }}
        >
        ☀️
        </span>
        <span
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "1rem",
          }}
        >
          🌙
        </span>

        {/* Knob */}
        <span
          style={{
            position: "absolute",
            top: "4px",
            left: darkMode ? "38px" : "4px",
            width: "26px",
            height: "26px",
            backgroundColor: "#4a52c0ff", // blue knob
            borderRadius: "50%",
            transition: "0.3s",
          }}
        ></span>
      </label>
    );
  };

  export default DarkModeToggle;
