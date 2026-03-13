"use client";

import { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import styles from "./ProjectDetail.module.css";
import { useAdmin } from "@/context/AdminContext";
import { GalleryItem } from "@/data/projects";

interface SortableGalleryItemProps {
  item: GalleryItem;
  index: number;
  onDelete: (index: number) => void;
  onClick: (index: number) => void;
  onUpdate?: (index: number, updatedItem: GalleryItem) => void;
  onEdit?: (index: number, item: GalleryItem) => void;
}

export function SortableGalleryItem({ item, index, onDelete, onClick, onUpdate, onEdit }: SortableGalleryItemProps) {
  const { isAdmin, adminMode } = useAdmin();
  
  // Resize State
  const [isResizing, setIsResizing] = useState(false);
  const [lockedRatio, setLockedRatio] = useState(true); // Default to locked
  const [dimensions, setDimensions] = useState({
      width: item.cardWidth,
      height: item.cardHeight
  });
  const [paddingBottom, setPaddingBottom] = useState(item.cardPaddingBottom ?? 50);

  // Text Edit State
  const [isEditingText, setIsEditingText] = useState(false);
  const [textContent, setTextContent] = useState(item.type === 'text' ? item.content : '');

  // Video Play State
  const [isPlaying, setIsPlaying] = useState(false);

  const itemRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{x: number, y: number, w: number, h: number, padding: number} | null>(null);
  const originalImageRef = useRef<{width: number, height: number} | null>(null);
  const aspectRatioRef = useRef<number>(1);

  // Refs to always have latest values for save
  const dimensionsRef = useRef(dimensions);
  const paddingBottomRef = useRef(paddingBottom);
  const lockedRatioRef = useRef(lockedRatio);

  useEffect(() => { dimensionsRef.current = dimensions; }, [dimensions]);
  useEffect(() => { paddingBottomRef.current = paddingBottom; }, [paddingBottom]);
  useEffect(() => { lockedRatioRef.current = lockedRatio; }, [lockedRatio]);

  // Load original image dimensions
  useEffect(() => {
    if (item.type === 'image' && item.src) {
      const img = new window.Image();
      img.onload = () => {
        originalImageRef.current = { width: img.naturalWidth, height: img.naturalHeight };
        if (!aspectRatioRef.current || aspectRatioRef.current === 1) {
          aspectRatioRef.current = img.naturalWidth / img.naturalHeight;
        }
      };
      img.src = item.src;
    } else if (item.type === 'video' && item.width && item.height) {
      originalImageRef.current = { width: item.width, height: item.height };
      aspectRatioRef.current = item.width / item.height;
    } else if (item.type === 'text') {
      // Text items: use default size or existing cardWidth/cardHeight
      const defaultWidth = item.cardWidth || 300;
      const defaultHeight = item.cardHeight || 200;
      originalImageRef.current = { width: defaultWidth, height: defaultHeight };
      aspectRatioRef.current = defaultWidth / defaultHeight;
    }
  }, [item]);

  // Handle width input change
  const handleWidthChange = (newWidth: number) => {
    if (lockedRatio && newWidth > 0 && aspectRatioRef.current) {
      const newHeight = Math.round(newWidth / aspectRatioRef.current);
      setDimensions({ width: newWidth, height: newHeight });
    } else {
      setDimensions(p => ({ ...p, width: newWidth }));
    }
  };

  // Handle height input change
  const handleHeightChange = (newHeight: number) => {
    if (lockedRatio && newHeight > 0 && aspectRatioRef.current) {
      const newWidth = Math.round(newHeight * aspectRatioRef.current);
      setDimensions({ width: newWidth, height: newHeight });
    } else {
      setDimensions(p => ({ ...p, height: newHeight }));
    }
  };

  // Reset to original image size
  const handleReset = () => {
    if (originalImageRef.current) {
      setDimensions({
        width: originalImageRef.current.width,
        height: originalImageRef.current.height
      });
      aspectRatioRef.current = originalImageRef.current.width / originalImageRef.current.height;
      setPaddingBottom(50);
    }
  };

  // Sync dimensions and content
  useEffect(() => {
      if (!isResizing) {
          setDimensions(prev => {
              if (prev.width !== item.cardWidth || prev.height !== item.cardHeight) {
                  return { width: item.cardWidth, height: item.cardHeight };
              }
              return prev;
          });
          setPaddingBottom(item.cardPaddingBottom ?? 50);
          // Keep lockedRatio as true by default, only change if explicitly set to false
          if (item.lockedAspectRatio === false) {
              setLockedRatio(false);
          }
      }
      if (item.type === 'text' && !isEditingText) {
          setTextContent(prev => prev !== item.content ? item.content : prev);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.cardWidth, item.cardHeight, item.cardPaddingBottom, item.lockedAspectRatio, 'content' in item ? item.content : undefined, item.type, isResizing, isEditingText]);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, disabled: !isAdmin || !adminMode || isResizing || isEditingText });

  const hasCustomSize = !!dimensions.width;
  const hasTitle = item.showTitle && item.title;
  const isTextType = item.type === 'text';

  // For text items, get horizontal alignment from style.textAlign
  const textAlign = isTextType && item.style?.textAlign;
  const getMarginStyle = () => {
    if (!isTextType || !hasCustomSize) return {};
    switch (textAlign) {
      case 'center':
        return { marginLeft: 'auto', marginRight: 'auto' };
      case 'right':
        return { marginLeft: 'auto', marginRight: '0' };
      default: // 'left' or undefined
        return { marginLeft: '0', marginRight: 'auto' };
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? 'none' : (transition ? `${transition}, width 0.3s ease, height 0.3s ease` : undefined),
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    // Card width follows content width
    width: hasCustomSize ? `${dimensions.width}px` : undefined,
    // Card height: text type needs explicit height, image/video uses auto
    height: isTextType && hasCustomSize ? `${dimensions.height}px` : 'auto',
    maxWidth: isResizing ? 'none' : (hasCustomSize ? '100%' : undefined),
    flex: hasCustomSize ? '0 0 auto' : undefined,
    minWidth: hasCustomSize ? '0' : undefined,
    zIndex: isResizing || isEditingText ? 100 : 'auto',
    // Apply horizontal alignment for text items
    ...getMarginStyle(),
  };

  // Image style for controlling displayed image size
  const imageStyle = hasCustomSize ? {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    objectFit: 'cover' as const,
  } : undefined;

  const handleVisibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      if (onUpdate) {
          onUpdate(index, { ...item, visibility: e.target.value as 'public' | 'team' | 'private' });
      }
  };

  const handleTextClick = (e: React.MouseEvent) => {
      if (!isResizing) {
          onClick(index);
      }
  };

  const handleTextBlur = () => {
      setIsEditingText(false);
      if (onUpdate && item.type === 'text' && textContent !== item.content) {
          // Preserve all existing properties, only update content
          onUpdate(index, { ...item, content: textContent });
      }
  };

  const startResize = (e: React.MouseEvent | React.TouchEvent, direction: string) => {
      e.preventDefault();
      e.stopPropagation();

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      if (!itemRef.current) return;
      const rect = itemRef.current.getBoundingClientRect();

      // Get current image dimensions or use rect
      const currentWidth = dimensions.width || rect.width;
      const currentHeight = dimensions.height || (rect.height - paddingBottom);

      resizeStartRef.current = {
          x: clientX,
          y: clientY,
          w: currentWidth,
          h: currentHeight,
          padding: paddingBottom
      };

      // Initialize dimensions if they were undefined (auto)
      if (!dimensions.width || !dimensions.height) {
          setDimensions({ width: currentWidth, height: currentHeight });
          if (currentWidth && currentHeight) {
              aspectRatioRef.current = currentWidth / currentHeight;
          }
      }

      const onMove = (moveEvent: MouseEvent | TouchEvent) => {
          if (!resizeStartRef.current) return;

          const moveX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
          const moveY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;

          const deltaX = moveX - resizeStartRef.current.x;
          const deltaY = moveY - resizeStartRef.current.y;

          // Horizontal drag: change image width (and height if locked)
          if (direction.includes('E') || direction.includes('W')) {
              let newWidth = resizeStartRef.current.w;
              if (direction.includes('E')) newWidth += deltaX;
              if (direction.includes('W')) newWidth -= deltaX;

              // Constraints
              newWidth = Math.max(100, Math.min(newWidth, 1600));

              if (lockedRatio && aspectRatioRef.current) {
                  const newHeight = Math.round(newWidth / aspectRatioRef.current);
                  setDimensions({ width: Math.round(newWidth), height: newHeight });
              } else {
                  setDimensions(prev => ({ ...prev, width: Math.round(newWidth) }));
              }
          }

          // Vertical drag: change card padding bottom
          if (direction.includes('S') || direction.includes('N')) {
              let newPadding = resizeStartRef.current.padding;
              if (direction.includes('S')) newPadding += deltaY;
              if (direction.includes('N')) newPadding -= deltaY;

              // Constraints (0 - 500px)
              newPadding = Math.max(0, Math.min(newPadding, 500));
              setPaddingBottom(Math.round(newPadding));
          }
      };

      const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('touchmove', onMove);
          window.removeEventListener('mouseup', onUp);
          window.removeEventListener('touchend', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);
  };

  const handleResizeSave = () => {
      if (onUpdate && confirm("Save new size settings?")) {
          // Use refs to ensure we get the latest values
          onUpdate(index, {
              ...item,
              cardWidth: dimensionsRef.current.width,
              cardHeight: dimensionsRef.current.height,
              cardPaddingBottom: paddingBottomRef.current,
              lockedAspectRatio: lockedRatioRef.current
          });
          setIsResizing(false);
      }
  };

  const handleResizeCancel = () => {
      setDimensions({ width: item.cardWidth, height: item.cardHeight });
      setPaddingBottom(item.cardPaddingBottom ?? 50);
      setLockedRatio(item.lockedAspectRatio !== false);
      setIsResizing(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onEdit) onEdit(index, item);
  };

  const setRefs = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      (itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  // Get YouTube embed URL from videoId
  const getYouTubeEmbedUrl = (): string | null => {
    if (item.type !== 'video') return null;
    const videoId = item.videoId;
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  };

  return (
    <div ref={setRefs} style={style} className={`${styles.imageWrapper} ${item.type === 'text' ? styles.textWrapper : ''} ${isResizing ? styles.resizing : ''}`} {...attributes}>
        {item.type === 'image' || item.type === 'video' ? (
             <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: 'auto', justifyContent: 'flex-start' }}>
               <div
                  onClick={(e) => {
                      if (!isResizing) {
                          if (item.type === 'video') {
                              // Video: play in place instead of opening lightbox
                              setIsPlaying(true);
                          } else {
                              // Image: open lightbox
                              onClick(index);
                          }
                      }
                  }}
                  style={{
                      position: 'relative',
                      width: '100%',
                      height: hasCustomSize ? `${dimensions.height}px` : 'auto',
                      cursor: 'pointer',
                      minHeight: 0,
                      flexShrink: 0
                  }}
               >
                  {item.src ? (
                      <>
                          {item.type === 'video' && isPlaying ? (
                              // Show YouTube iframe when playing
                              (() => {
                                  const embedUrl = getYouTubeEmbedUrl();
                                  return embedUrl ? (
                                      <>
                                          <iframe
                                              src={embedUrl}
                                              style={{
                                                  position: 'absolute',
                                                  top: 0,
                                                  left: 0,
                                                  width: '100%',
                                                  height: '100%',
                                                  border: 'none'
                                              }}
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                          />
                                          {/* Close button to stop video */}
                                          <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  setIsPlaying(false);
                                              }}
                                              style={{
                                                  position: 'absolute',
                                                  top: '10px',
                                                  right: '10px',
                                                  width: '32px',
                                                  height: '32px',
                                                  background: 'rgba(0, 0, 0, 0.7)',
                                                  border: 'none',
                                                  borderRadius: '50%',
                                                  color: 'white',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontSize: '18px',
                                                  zIndex: 10
                                              }}
                                              title="Close video"
                                          >
                                              ×
                                          </button>
                                      </>
                                  ) : (
                                      <div style={{
                                          width: '100%',
                                          height: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          background: '#f0f0f0',
                                          color: '#666'
                                      }}>
                                          Invalid YouTube URL
                                      </div>
                                  );
                              })()
                          ) : (
                              <>
                                  <Image
                                      src={item.src}
                                      alt={item.alt || `Item ${index + 1}`}
                                      width={dimensions.width || (item.type === 'video' ? 0 : item.width)}
                                      height={dimensions.height || (item.type === 'video' ? 0 : item.height)}
                                      fill={item.type === 'video' && !hasCustomSize}
                                      sizes={hasCustomSize ? `${dimensions.width}px` : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
                                      className={styles.image}
                                      unoptimized
                                      loading="lazy"
                                      style={
                                          item.visibility === 'private'
                                              ? { ...imageStyle, opacity: 0.5, filter: 'grayscale(100%)' }
                                              : imageStyle
                                      }
                                  />
                                  {item.type === 'video' && !isPlaying && (
                                      <div style={{
                                          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                          width: '40px', height: '40px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                                      }}>
                                          <div style={{
                                              width: 0, height: 0,
                                              borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
                                              borderLeft: '14px solid white', marginLeft: '3px'
                                          }} />
                                      </div>
                                  )}
                              </>
                          )}
                      </>
                  ) : (
                      <div style={{ width: '100%', height: '100%', minHeight: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          Image Missing
                      </div>
                  )}
                  {/* Admin Overlay - 이미지 영역 내부에 배치 */}
                  {isAdmin && adminMode && !isResizing && !isEditingText && !isPlaying && (
                      <div className={styles.adminOverlay}
                           onClick={(e) => e.stopPropagation()}
                           onPointerDown={(e) => e.stopPropagation()}
                           onMouseDown={(e) => e.stopPropagation()}
                      >
                          <div className={styles.dragHandle}
                               ref={setActivatorNodeRef}
                               {...listeners}
                               style={{ cursor: 'grab', touchAction: 'none' }}
                          >
                            :::
                          </div>
                          <button onClick={(e) => {
                              e.stopPropagation();
                              if (originalImageRef.current) {
                                aspectRatioRef.current = originalImageRef.current.width / originalImageRef.current.height;
                              } else if (dimensions.width && dimensions.height) {
                                aspectRatioRef.current = dimensions.width / dimensions.height;
                              }
                              setIsResizing(true);
                          }} className={styles.resizeToggleBtn} title="Resize">⤡</button>
                          <button onClick={handleEditClick} className={styles.editBtn}>Edit</button>
                      </div>
                  )}
               </div>
               {/* Title display below image/video */}
               {hasTitle && (
                   <div className={styles.galleryTitle} style={{ flexShrink: 0 }}>
                       {item.title}
                   </div>
               )}
               {/* Padding space below content */}
               {hasCustomSize && paddingBottom > 0 && (
                   <div style={{ height: `${paddingBottom}px`, flexShrink: 0 }} />
               )}
             </div>
        ) : (
            isEditingText ? (
                <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    onBlur={handleTextBlur}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setIsEditingText(false);
                            setTextContent(item.content); // Revert on Escape
                        }
                    }}
                    autoFocus
                    style={{
                        width: hasCustomSize ? `${dimensions.width}px` : '100%',
                        height: hasCustomSize ? `${dimensions.height}px` : '200px',
                        resize: 'none',
                        border: 'none',
                        outline: '2px solid black', // Visual indicator for editing
                        fontFamily: item.style?.fontFamily,
                        fontSize: item.style?.fontSize,
                        backgroundColor: item.style?.backgroundColor || '#ffffff',
                        color: item.style?.color,
                        textAlign: item.style?.textAlign as any,
                        padding: '20px',
                        boxSizing: 'border-box',
                        display: 'block',
                    }}
                />
            ) : (
                <div
                    className={styles.textItem}
                    onClick={handleTextClick}
                    style={{
                        ...(item.visibility === 'private' ? { opacity: 0.5 } : {}),
                        width: hasCustomSize ? `${dimensions.width}px` : '100%',
                        height: hasCustomSize ? `${dimensions.height}px` : '200px',
                        minHeight: 'unset',
                        fontFamily: item.style?.fontFamily,
                        fontSize: item.style?.fontSize,
                        backgroundColor: item.style?.backgroundColor || '#ffffff',
                        color: item.style?.color,
                        textAlign: item.style?.textAlign as any,
                        padding: '20px',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: item.style?.textAlign === 'center' ? 'center' : 'flex-start',
                        justifyContent: item.style?.textAlign === 'center' ? 'center' : (item.style?.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                        whiteSpace: 'pre-wrap', // Preserve line breaks
                        cursor: isAdmin && adminMode ? 'text' : 'pointer'
                    }}
                >
                    {item.content}
                    {/* Admin Overlay - text 타입 내부에 배치 */}
                    {isAdmin && adminMode && !isResizing && !isEditingText && (
                        <div className={styles.adminOverlay}
                             onClick={(e) => e.stopPropagation()}
                             onPointerDown={(e) => e.stopPropagation()}
                             onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className={styles.dragHandle}
                                 ref={setActivatorNodeRef}
                                 {...listeners}
                                 style={{ cursor: 'grab', touchAction: 'none' }}
                            >
                              :::
                            </div>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              if (originalImageRef.current) {
                                aspectRatioRef.current = originalImageRef.current.width / originalImageRef.current.height;
                              } else if (dimensions.width && dimensions.height) {
                                aspectRatioRef.current = dimensions.width / dimensions.height;
                              }
                              setIsResizing(true);
                          }} className={styles.resizeToggleBtn} title="Resize">⤡</button>
                            <button onClick={handleEditClick} className={styles.editBtn}>Edit</button>
                        </div>
                    )}
                </div>
            )
        )}

      {isResizing && (
        <>
            <div className={`${styles.resizeHandle} ${styles.resizeHandleNW}`} onMouseDown={(e) => startResize(e, 'NW')} onTouchStart={(e) => startResize(e, 'NW')} />
            <div className={`${styles.resizeHandle} ${styles.resizeHandleNE}`} onMouseDown={(e) => startResize(e, 'NE')} onTouchStart={(e) => startResize(e, 'NE')} />
            <div className={`${styles.resizeHandle} ${styles.resizeHandleSW}`} onMouseDown={(e) => startResize(e, 'SW')} onTouchStart={(e) => startResize(e, 'SW')} />
            <div className={`${styles.resizeHandle} ${styles.resizeHandleSE}`} onMouseDown={(e) => startResize(e, 'SE')} onTouchStart={(e) => startResize(e, 'SE')} />
            
            <div className={styles.resizeOverlay} onMouseDown={(e) => e.stopPropagation()}>
                <div className={styles.resizeControlsRow}>
                    <div className={styles.resizeInputGroup}>
                        <span className={styles.resizeLabel}>W</span>
                        <input
                            className={styles.resizeInput}
                            type="number"
                            value={dimensions.width || ''}
                            onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <div className={styles.resizeInputGroup}>
                        <span className={styles.resizeLabel}>H</span>
                        <input
                            className={styles.resizeInput}
                            type="number"
                            value={dimensions.height || ''}
                            onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>
                <div className={styles.resizeControlsRow}>
                    <label className={styles.resizeLabel} style={{display:'flex', alignItems:'center', gap: '5px', cursor:'pointer'}}>
                        <input type="checkbox" checked={lockedRatio} onChange={(e) => setLockedRatio(e.target.checked)} />
                        Lock
                    </label>
                    <button className={styles.resetLink} onClick={handleReset} title="Reset to original image size">Reset</button>
                    <div className={styles.resizeInputGroup}>
                        <span className={styles.resizeLabel}>Pad</span>
                        <input
                            className={styles.resizeInput}
                            type="number"
                            value={paddingBottom}
                            onChange={(e) => setPaddingBottom(parseInt(e.target.value) || 0)}
                            style={{ width: '50px' }}
                        />
                    </div>
                </div>
                <div className={styles.resizeControlsRow}>
                    <button className={styles.resizeBtn} onClick={handleResizeSave}>Save</button>
                    <button className={`${styles.resizeBtn} ${styles.cancel}`} onClick={handleResizeCancel}>Cancel</button>
                </div>
            </div>
        </>
      )}
    </div>
  );
}
