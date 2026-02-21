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
  const [lockedRatio, setLockedRatio] = useState(!!item.lockedAspectRatio);
  const [dimensions, setDimensions] = useState({ 
      width: item.cardWidth, 
      height: item.cardHeight 
  });
  
  // Text Edit State
  const [isEditingText, setIsEditingText] = useState(false);
  const [textContent, setTextContent] = useState(item.type === 'text' ? item.content : '');

  const itemRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{x: number, y: number, w: number, h: number} | null>(null);

  // Sync dimensions and content
  useEffect(() => {
      if (!isResizing) {
          // eslint-disable-next-line react-hooks/exhaustive-deps
          setDimensions(prev => {
              if (prev.width !== item.cardWidth || prev.height !== item.cardHeight) {
                  return { width: item.cardWidth, height: item.cardHeight };
              }
              return prev;
          });
          setLockedRatio(prev => prev !== !!item.lockedAspectRatio ? !!item.lockedAspectRatio : prev);
      }
      if (item.type === 'text' && !isEditingText) {
          setTextContent(prev => prev !== item.content ? item.content : prev);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.cardWidth, item.cardHeight, item.lockedAspectRatio, 'content' in item ? item.content : undefined, item.type, isResizing, isEditingText]);

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? 'none' : (transition ? `${transition}, width 0.3s ease, height 0.3s ease` : undefined),
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    width: hasCustomSize ? `${dimensions.width}px` : undefined,
    height: hasCustomSize ? `${dimensions.height}px` : undefined,
    maxWidth: isResizing ? 'none' : (hasCustomSize ? '100%' : undefined),
    flex: hasCustomSize ? '0 0 auto' : undefined,
    minWidth: hasCustomSize ? '0' : undefined,
    zIndex: isResizing || isEditingText ? 100 : 'auto', // Ensure editing text is on top
  };

  const handleVisibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      if (onUpdate) {
          onUpdate(index, { ...item, visibility: e.target.value as 'public' | 'team' | 'private' });
      }
  };

  const handleTextClick = (e: React.MouseEvent) => {
      if (isAdmin && adminMode && !isResizing) {
          e.stopPropagation();
          setIsEditingText(true);
      } else if (!isResizing) {
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
      
      resizeStartRef.current = {
          x: clientX,
          y: clientY,
          w: rect.width,
          h: rect.height
      };
      
      if (!dimensions.width || !dimensions.height) {
          setDimensions({ width: rect.width, height: rect.height });
      }

      const onMove = (moveEvent: MouseEvent | TouchEvent) => {
          if (!resizeStartRef.current) return;
          
          const moveX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
          const moveY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
          
          const deltaX = moveX - resizeStartRef.current.x;
          const deltaY = moveY - resizeStartRef.current.y;
          
          let newWidth = resizeStartRef.current.w;
          let newHeight = resizeStartRef.current.h;
          
          if (direction.includes('E')) newWidth += deltaX;
          if (direction.includes('W')) newWidth -= deltaX;
          if (direction.includes('S')) newHeight += deltaY;
          if (direction.includes('N')) newHeight -= deltaY;
          
          newWidth = Math.max(100, Math.min(newWidth, 1600));
          newHeight = Math.max(100, Math.min(newHeight, 1600));
          
          if (lockedRatio) {
              const ratio = resizeStartRef.current.w / resizeStartRef.current.h;
              if (direction.includes('E') || direction.includes('W')) {
                  newHeight = newWidth / ratio;
              } else {
                  newWidth = newHeight * ratio;
              }
          }
          
          setDimensions({ width: Math.round(newWidth), height: Math.round(newHeight) });
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
          onUpdate(index, { 
              ...item, 
              cardWidth: dimensions.width, 
              cardHeight: dimensions.height,
              lockedAspectRatio: lockedRatio
          });
          setIsResizing(false);
      }
  };

  const handleResizeCancel = () => {
      setDimensions({ width: item.cardWidth, height: item.cardHeight });
      setIsResizing(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onEdit) onEdit(index, item);
  };

  const setRefs = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      // @ts-ignore
      itemRef.current = node;
  };

  return (
    <div ref={setRefs} style={style} className={`${styles.imageWrapper} ${item.type === 'text' ? styles.textWrapper : ''} ${isResizing ? styles.resizing : ''}`} {...attributes}>
        {item.type === 'image' || item.type === 'video' ? (
             <div onClick={() => !isResizing && onClick(index)} style={{ position: 'relative', width: '100%', height: '100%' }}>
                {item.src ? (
                    <>
                        <Image
                            src={item.src}
                            alt={item.alt || `Item ${index + 1}`}
                            width={item.type === 'video' ? 0 : item.width}
                            height={item.type === 'video' ? 0 : item.height}
                            fill={item.type === 'video'}
                            sizes={item.type === 'video' ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" : undefined}
                            className={styles.image}
                            unoptimized
                            loading="lazy"
                            style={
                                item.visibility === 'private' 
                                    ? { opacity: 0.5, filter: 'grayscale(100%)', objectFit: 'cover' } 
                                    : { objectFit: 'cover' }
                            }
                        />
                        {item.type === 'video' && (
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
                ) : (
                    <div style={{ width: '100%', height: '100%', minHeight: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Image Missing
                    </div>
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
                        width: '100%',
                        height: '100%',
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
                        width: '100%',
                        height: '100%',
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
                </div>
            )
        )}
      
      {isAdmin && adminMode && !isResizing && !isEditingText && (
          <div className={styles.adminOverlay} 
               onClick={(e) => e.stopPropagation()}
               onPointerDown={(e) => e.stopPropagation()}
               onMouseDown={(e) => e.stopPropagation()}
          >
              <div className={styles.controlsRow}>
                  <button onClick={(e) => { e.stopPropagation(); setIsResizing(true); }} className={styles.resizeToggleBtn} title="Resize">⤡</button>
                  <button onClick={handleEditClick} className={styles.editBtn}>Edit</button>
              </div>
              
              <div className={styles.dragHandle} 
                   ref={setActivatorNodeRef}
                   {...listeners}
                   style={{ cursor: 'grab', touchAction: 'none' }}
              >
                :::
              </div>
          </div>
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
                            onChange={(e) => setDimensions(p => ({ ...p, width: parseInt(e.target.value) || 0 }))}
                        />
                    </div>
                    <div className={styles.resizeInputGroup}>
                        <span className={styles.resizeLabel}>H</span>
                        <input 
                            className={styles.resizeInput}
                            type="number" 
                            value={dimensions.height || ''} 
                            onChange={(e) => setDimensions(p => ({ ...p, height: parseInt(e.target.value) || 0 }))}
                        />
                    </div>
                </div>
                <div className={styles.resizeControlsRow}>
                    <label className={styles.resizeLabel} style={{display:'flex', alignItems:'center', gap: '5px', cursor:'pointer'}}>
                        <input type="checkbox" checked={lockedRatio} onChange={(e) => setLockedRatio(e.target.checked)} />
                        Lock Ratio
                    </label>
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
