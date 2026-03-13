"use client";

import { useEffect, useRef, useCallback } from 'react';
import styles from '@/styles/contentPage.module.css';

interface FitTitleProps {
  date: string;
  title: string;
  onClick: () => void;
  minFontSize?: number;
  maxFontSize?: number;
}

export default function FitTitle({
  date,
  title,
  onClick,
  minFontSize = 11,
  maxFontSize = 18
}: FitTitleProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);

  const fitText = useCallback(() => {
    const container = containerRef.current;
    const titleEl = titleRef.current;

    if (!container || !titleEl) return;

    // Get the date element
    const dateEl = container.querySelector('[data-date]') as HTMLElement;
    if (!dateEl) return;

    // Available width for title
    const containerWidth = container.offsetWidth;
    const dateWidth = dateEl.offsetWidth;
    const availableWidth = containerWidth - dateWidth;

    if (availableWidth <= 0) return;

    // Reset to max font size to measure
    titleEl.style.fontSize = `${maxFontSize}px`;

    // Measure and shrink if needed
    let currentFontSize = maxFontSize;

    while (titleEl.scrollWidth > availableWidth && currentFontSize > minFontSize) {
      currentFontSize -= 0.5;
      titleEl.style.fontSize = `${currentFontSize}px`;
    }
  }, [minFontSize, maxFontSize]);

  useEffect(() => {
    // Initial fit
    const timer = setTimeout(fitText, 50);

    // Re-fit on resize
    const handleResize = () => fitText();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [fitText, title]);

  return (
    <h2
      ref={containerRef}
      className={styles.contentTitle}
      onClick={onClick}
    >
      <span className={styles.contentDate} data-date>
        {date}
      </span>
      <span
        ref={titleRef}
        className={styles.contentTitleText}
        style={{ fontSize: `${maxFontSize}px` }}
      >
        {title}
      </span>
    </h2>
  );
}
