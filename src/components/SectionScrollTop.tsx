"use client";

import React, { useState, useEffect, RefObject } from 'react';
import styles from './SectionScrollTop.module.css';

interface SectionScrollTopProps {
  containerRef: RefObject<HTMLDivElement | null>;
  position?: 'left' | 'right';
  galleryWidthPercent?: number; // For positioning left button relative to resizer
}

export default function SectionScrollTop({ containerRef, position = 'right', galleryWidthPercent = 60 }: SectionScrollTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const toggleVisibility = () => {
      if (container.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Initial check
    toggleVisibility();

    container.addEventListener('scroll', toggleVisibility);

    return () => {
      container.removeEventListener('scroll', toggleVisibility);
    };
  }, [containerRef]);

  const scrollToTop = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Calculate position for left button (30px left of resizer)
  const leftButtonStyle = position === 'left' ? {
    right: `calc(${galleryWidthPercent}% + 30px)`,
    left: 'auto'
  } : {};

  return (
    <button
      type="button"
      className={`${styles.scrollTop} ${isVisible ? styles.visible : ''} ${position === 'left' ? styles.left : styles.right}`}
      style={leftButtonStyle}
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <svg
        className={styles.arrowIcon}
        width="36"
        height="20"
        viewBox="0 0 36 20"
        aria-hidden="true"
        focusable="false"
      >
        <polyline
          points="1,18 18,2 35,18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
          shapeRendering="geometricPrecision"
        />
      </svg>
    </button>
  );
}
