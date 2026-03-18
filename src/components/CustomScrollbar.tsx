"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './CustomScrollbar.module.css';

interface CustomScrollbarProps {
  targetRef?: React.RefObject<HTMLElement | null>;
  useWindow?: boolean;
}

export default function CustomScrollbar({ targetRef, useWindow = false }: CustomScrollbarProps) {
  const [scrollPercent, setScrollPercent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Track scroll position and content height changes
  useEffect(() => {
    const getScrollElement = () => {
      if (useWindow) {
        return document.documentElement;
      }
      return targetRef?.current || null;
    };

    const checkScrollability = () => {
      if (isDragging) return;

      const element = getScrollElement();
      if (!element) return;

      const scrollTop = useWindow ? window.scrollY : element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = useWindow ? window.innerHeight : element.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll > 0) {
        const newPercent = scrollTop / maxScroll;
        setScrollPercent(prev => prev !== newPercent ? newPercent : prev);
        setIsVisible(prev => prev !== true ? true : prev);
      } else {
        setScrollPercent(prev => prev !== 0 ? 0 : prev);
        setIsVisible(prev => prev !== false ? false : prev);
      }
    };

    const scrollTarget = useWindow ? window : targetRef?.current;
    if (scrollTarget) {
      scrollTarget.addEventListener('scroll', checkScrollability);
      checkScrollability(); // Initial calculation
    }

    // Watch for content height changes using ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });

    if (useWindow) {
      resizeObserver.observe(document.body);
    } else if (targetRef?.current) {
      resizeObserver.observe(targetRef.current);
    }

    // Watch for image loads which can change content height
    const handleImageLoad = () => {
      checkScrollability();
    };

    // Add load listeners to existing images
    const addImageListeners = () => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', handleImageLoad);
        }
      });
    };

    addImageListeners();

    // Watch for new images being added to the DOM (debounced)
    let mutationTimeout: NodeJS.Timeout | null = null;
    const mutationObserver = new MutationObserver((mutations) => {
      // Debounce to prevent infinite loops
      if (mutationTimeout) clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node instanceof HTMLImageElement) {
              if (!node.complete) {
                node.addEventListener('load', handleImageLoad);
              }
            } else if (node instanceof HTMLElement) {
              const imgs = node.querySelectorAll('img');
              imgs.forEach(img => {
                if (!img.complete) {
                  img.addEventListener('load', handleImageLoad);
                }
              });
            }
          });
        });
        checkScrollability();
      }, 100);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      if (scrollTarget) {
        scrollTarget.removeEventListener('scroll', checkScrollability);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (mutationTimeout) clearTimeout(mutationTimeout);
      // Clean up image listeners
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.removeEventListener('load', handleImageLoad);
      });
    };
  }, [targetRef, useWindow, isDragging]);

  // Handle scrollbar drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const track = trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const trackTop = 150; // Match header height
    const trackBottom = rect.height - 20;
    const trackHeight = trackBottom - trackTop - 16;

    // Calculate initial offset
    const indicatorTop = trackTop + scrollPercent * trackHeight;
    const initialOffset = e.clientY - rect.top - indicatorTop - 8;

    const updateScroll = (clientY: number) => {
      const currentRect = track.getBoundingClientRect();
      const relativeY = Math.max(0, Math.min(clientY - currentRect.top - trackTop - 8 - initialOffset, trackHeight));
      const percent = trackHeight > 0 ? relativeY / trackHeight : 0;

      if (useWindow) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, percent * maxScroll);
      } else if (targetRef?.current) {
        const element = targetRef.current;
        const maxScroll = element.scrollHeight - element.clientHeight;
        element.scrollTop = percent * maxScroll;
      }

      setScrollPercent(Math.max(0, Math.min(1, percent)));
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateScroll(moveEvent.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [scrollPercent, targetRef, useWindow]);

  if (!isVisible) return null;

  return (
    <div
      ref={trackRef}
      className={styles.scrollbarTrack}
    >
      <div className={styles.scrollbarLine} />
      <div
        className={styles.scrollbarIndicator}
        style={{
          top: `calc(150px + (100vh - 170px - 16px) * ${scrollPercent})`,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
