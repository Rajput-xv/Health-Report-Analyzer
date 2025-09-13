import React, { useState, useEffect } from "react";
import { FaArrowUp } from "react-icons/fa";

const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(window.scrollY > 150);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    // show tooltip briefly on click
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1500);
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <div className={`back-to-top-wrapper ${isVisible ? "show" : "hide"}`}>
      <button
        onClick={scrollToTop}
        className="back-to-top"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <FaArrowUp size={28} />
        {showTooltip && <span className="tooltip">Back to Top</span>}
      </button>
    </div>
  );
};

export default BackToTopButton;
