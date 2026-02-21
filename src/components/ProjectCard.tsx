"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './ProjectCard.module.css';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { Project } from '../data/projects';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  priority?: boolean; // For above-the-fold optimization
}

// Helper function to get visibility label
function getVisibilityLabel(visibility: string): string {
  switch (visibility) {
    case 'public':
      return 'Public';
    case 'team':
      return 'Team Only';
    case 'private':
      return 'Private';
    default:
      return 'Public';
  }
}

export default function ProjectCard({ project, onEdit, priority = false }: ProjectCardProps) {
  const { isAdmin, adminMode } = useAdmin();
  const { updateProject } = useProjects();
  
  // Resize State
  const [isResizing, setIsResizing] = useState(false);
  const [lockedRatio, setLockedRatio] = useState(!!project.lockedAspectRatio);
  const [dimensions, setDimensions] = useState({ 
      width: project.cardWidth, 
      height: project.cardHeight 
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{x: number, y: number, w: number, h: number} | null>(null);

  // Sync dimensions when project updates or resize mode ends
  useEffect(() => {
      if (!isResizing) {
          setDimensions(prev => {
            if (prev.width !== project.cardWidth || prev.height !== project.cardHeight) {
                return { width: project.cardWidth, height: project.cardHeight };
            }
            return prev;
          });
          setLockedRatio(prev => prev !== !!project.lockedAspectRatio ? !!project.lockedAspectRatio : prev);
      }
  }, [project.cardWidth, project.cardHeight, project.lockedAspectRatio, isResizing]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef, // For handle-based dragging
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.id, disabled: !isAdmin || !adminMode || isResizing }); // Disable drag if resizing

  const hasCustomSize = !!dimensions.width;

  const style = {
    transform: CSS.Transform.toString(transform),
    // If resizing, disable transition to prevent lag. 
    // Otherwise, combine dnd transition with our width/height transition logic (or let CSS handle it if dnd transition is null)
    // Note: dnd transition is usually for transform. 
    // If we simply set 'none', we kill width transition too.
    // If we set `transition` (string), it overrides CSS.
    // So we need to be careful.
    // Ideally: transition: isResizing ? 'none' : (transition ? `${transition}, width 0.3s ease, height 0.3s ease` : undefined)
    // If undefined, CSS applies.
    transition: isResizing ? 'none' : (transition ? `${transition}, width 0.3s ease, height 0.3s ease` : undefined),
    
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    
    width: hasCustomSize ? `${dimensions.width}px` : undefined,
    height: hasCustomSize ? `${dimensions.height}px` : undefined,
    
    // Logic discussed:
    // resizing -> none (allow expansion)
    // custom size -> 100% (limit to parent width)
    // default -> undefined (fallback to CSS max-width: 400px - actually 100% now)
    maxWidth: isResizing ? 'none' : (hasCustomSize ? '100%' : undefined),
    
    // Logic discussed:
    // custom size -> 0 0 auto (respect width/height, don't grow/shrink)
    // default -> undefined (fallback to CSS flex: 1 1 220px)
    flex: hasCustomSize ? '0 0 auto' : undefined,
    
    // Override CSS min-width (280px) if custom size is set, to allow resizing down to 200px
    minWidth: hasCustomSize ? '0' : undefined,

    zIndex: isResizing ? 100 : 'auto',
  };

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      // @ts-ignore
      cardRef.current = node;
  };

  const [showVisibilityOptions, setShowVisibilityOptions] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);

  // Video State
  const [showVideo, setShowVideo] = useState(false);

  // Resize Handlers
  const startResize = (e: React.MouseEvent | React.TouchEvent, direction: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      
      resizeStartRef.current = {
          x: clientX,
          y: clientY,
          w: rect.width,
          h: rect.height
      };
      
      // Initialize dimensions if they were undefined (auto)
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
          
          // Constraints (200px - 800px)
          newWidth = Math.max(200, Math.min(newWidth, 1200)); // Allow larger width for desktop
          newHeight = Math.max(200, Math.min(newHeight, 1200));
          
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

  const handleResizeSave = async () => {
      if (confirm("Save new size settings?")) {
          await updateProject({ 
              ...project, 
              cardWidth: dimensions.width, 
              cardHeight: dimensions.height,
              lockedAspectRatio: lockedRatio
          });
          setIsResizing(false);
      }
  };

  const handleResizeCancel = () => {
      setDimensions({ width: project.cardWidth, height: project.cardHeight });
      setIsResizing(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(project);
  };

  const handleVisibilityChange = async (value: 'public' | 'team' | 'private') => {
      await updateProject({ ...project, isVisible: value });
      setShowVisibilityOptions(false);
  };

  const toggleVisibilityOptions = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowVisibilityOptions(!showVisibilityOptions);
  };

  // Close visibility dropdown when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
              setShowVisibilityOptions(false);
          }
      };

      if (showVisibilityOptions) {
          document.addEventListener('mousedown', handleClickOutside);
      } else {
          document.removeEventListener('mousedown', handleClickOutside);
      }

      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [showVisibilityOptions]);

  const currentVisibility = (project.isVisible === true || project.isVisible === undefined) ? 'public' : (project.isVisible === false ? 'private' : project.isVisible);
  
  // If not admin mode and project is private, don't render (though parent grid handles this mostly, this is extra safety or for transitions)
  // Actually, parent grid filters based on API response for non-admins. 
  // But if admin is logged in but adminMode is OFF, we should show ALL projects as if we are a user?
  // No, if admin is logged in, they see all projects. AdminMode OFF just hides CONTROLS.
  // Wait, requirement says: "img 컨텐츠에 대해 접근 제어 로직 추가 (admin 모드 on일 때만 노출)"
  // -> "img 와 같은 private 설정 컨텐츠들이 화면에 렌더링되지 않아야 합니다."
  // This implies if a project is PRIVATE, and adminMode is OFF, it should NOT be visible even to admin?
  // Or does it mean the admin CONTROLS on the image should not be visible?
  // "admin 모드 상태를 체크하는 로직을 구현하여 off 상태일 경우 해당 요소들을 display: none 또는 visibility: hidden 처리"
  // "button , button , div 버튼들과 img 와 같은 private 설정 컨텐츠들이..."
  // It seems to mean the controls.
  // BUT: "img 컨텐츠에 대해 접근 제어 로직 추가 (admin 모드 on일 때만 노출)" -> This is ambiguous.
  // If it means the project image itself, then toggling admin mode would hide the project?
  // Re-reading: "admin 모드가 off 상태일 때는 ... img 와 같은 private 설정 컨텐츠들이 화면에 렌더링되지 않아야 합니다."
  // If a project is PRIVATE, normally only admins see it.
  // If Admin Mode is OFF, maybe the admin wants to see the site AS A USER.
  // So if Admin Mode is OFF, we should hide PRIVATE projects.
  
  // Let's implement this logic:
  // If !adminMode and project is private, hide the whole card or just content?
  // Parent Grid might render it because API returns it for admins.
  // So we hide it here.
  
  const isVideo = project.type === 'video';
  const isMemo = project.type === 'memo';

  const showId = project.showId !== undefined ? project.showId : true;
  const showTitle = project.showTitle !== undefined ? project.showTitle : true;
  const hasDetailLink = project.hasDetailLink !== undefined ? project.hasDetailLink : true;

  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState(project.content || '');

  useEffect(() => {
      setMemoText(prev => {
          const newContent = project.content || '';
          return prev !== newContent ? newContent : prev;
      });
  }, [project.content]);

  // If not admin mode and project is private, don't render
  if (isAdmin && !adminMode && currentVisibility === 'private') {
      return null;
  }

  const handleMemoClick = (e: React.MouseEvent) => {
      if (isAdmin && adminMode) {
          e.preventDefault();
          e.stopPropagation();
          setIsEditingMemo(true);
      }
  };

  const handleMemoBlur = async () => {
      setIsEditingMemo(false);
      if (memoText !== project.content) {
          await updateProject({ ...project, content: memoText });
      }
  };

  const handleMemoKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
          setMemoText(project.content || '');
          setIsEditingMemo(false);
      }
      // Allow Enter for new lines in textarea
  };

  const renderCardContent = () => (
      <>
          {project.imageUrl ? (
              <Image
                  src={project.imageUrl}
                  alt={project.title}
                  width={600}
                  height={400}
                  className={styles.image}
                  loading={priority ? undefined : "lazy"}
                  priority={priority}
                  unoptimized
              />
          ) : (
              <div className={styles.imagePlaceholder} style={{ width: 600, height: 400, background: '#f0f0f0' }} />
          )}

          <div className={styles.overlayInfo}>
              {showId && <span className={styles.number}>{project.id}</span>}
              {showTitle && <span className={styles.title}>{project.title}</span>}
          </div>
      </>
  );

  return (
    // Only attach attributes to the root for accessibility. Listeners are moved to the handle.
    <div ref={setRefs} style={style} className={`${styles.card} ${currentVisibility !== 'public' ? styles.hidden : ''} ${isResizing ? styles.resizing : ''} ${isMemo ? styles.memoCard : ''}`} {...attributes}>
      <div className={styles.imageWrapper}>
        {isMemo ? (
            <div 
                className={styles.memoContent} 
                onClick={handleMemoClick}
                style={{
                    backgroundColor: project.memoStyle?.backgroundColor,
                }}
            >
                {isEditingMemo ? (
                    <textarea
                        className={styles.memoTextarea}
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                        onBlur={handleMemoBlur}
                        onKeyDown={handleMemoKeyDown}
                        autoFocus
                        maxLength={2000}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
                        style={{
                            fontFamily: project.memoStyle?.fontFamily,
                            fontSize: project.memoStyle?.fontSize,
                            color: project.memoStyle?.color,
                            textAlign: project.memoStyle?.textAlign,
                            backgroundColor: 'transparent',
                        }}
                    />
                ) : (
                    <div className={styles.memoText} style={{
                        fontFamily: project.memoStyle?.fontFamily,
                        fontSize: project.memoStyle?.fontSize,
                        color: project.memoStyle?.color,
                        textAlign: project.memoStyle?.textAlign,
                    }}>{project.content}</div>
                )}
            </div>
        ) : isVideo ? (
            <div onClick={() => setShowVideo(true)} style={{ cursor: 'pointer', display: 'block', position: 'relative' }}>
                {renderCardContent()}
                <div className={styles.playButton}>
                    <svg viewBox="0 0 24 24" width="48" height="48">
                        <path fill="white" d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>
        ) : (
            hasDetailLink ? (
                <Link href={project.link || `/projet/${project.id}`} style={{ pointerEvents: isResizing ? 'none' : 'auto', display: 'block' }}>
                    {renderCardContent()}
                </Link>
            ) : (
                <div style={{ display: 'block' }}>
                    {renderCardContent()}
                </div>
            )
        )}

        {/* Overlay Info for Memo Type - Moved outside to ensure consistent positioning */}
        {isMemo && (
            <div className={styles.overlayInfo}>
                {showId && <span className={styles.number}>{project.id}</span>}
                {showTitle && <span className={styles.title}>{project.title}</span>}
            </div>
        )}
        
        {isAdmin && adminMode && !isResizing && (
            <div className={styles.adminOverlay} 
                 onPointerDown={(e) => e.stopPropagation()}
                 onMouseDown={(e) => e.stopPropagation()}
                 onClick={(e) => e.stopPropagation()}
            >
                <button onClick={(e) => { e.stopPropagation(); setIsResizing(true); }} className={styles.resizeToggleBtn} title="Resize">⤡</button>
                <button onClick={handleEdit} className={styles.editBtn}>Edit</button>
                
                {/* Drag Handle */}
                <div className={styles.dragHandle} 
                     ref={setActivatorNodeRef}
                     {...listeners}
                     style={{ cursor: 'grab', touchAction: 'none' }}
                >
                  :::
                </div>
            </div>
        )}
      </div>

      {/* Overlay Info removed from here as it is now inside CardContent/MemoContent */}
      
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

      {showVideo && project.videoId && (
          <div className={styles.videoModal} onClick={() => setShowVideo(false)}>
              <button className={styles.closeVideo} onClick={() => setShowVideo(false)}>×</button>
              <div className={styles.videoContainer} onClick={(e) => e.stopPropagation()}>
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${project.videoId}?autoplay=1`} 
                    title={project.title} 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
              </div>
          </div>
      )}
    </div>
  );
}
