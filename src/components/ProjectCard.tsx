"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  // Resize State
  const [isResizing, setIsResizing] = useState(false);
  const [lockedRatio, setLockedRatio] = useState(true); // Default to locked
  const [dimensions, setDimensions] = useState({
      width: project.cardWidth,
      height: project.cardHeight
  });
  const [paddingBottom, setPaddingBottom] = useState(project.cardPaddingBottom ?? 30);
  const cardRef = useRef<HTMLDivElement>(null);
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
    if (project.imageUrl) {
      const img = new window.Image();
      img.onload = () => {
        originalImageRef.current = { width: img.naturalWidth, height: img.naturalHeight };
        if (!aspectRatioRef.current || aspectRatioRef.current === 1) {
          aspectRatioRef.current = img.naturalWidth / img.naturalHeight;
        }
      };
      img.src = project.imageUrl;
    }
  }, [project.imageUrl]);

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

  // Sync dimensions when project updates or resize mode ends
  useEffect(() => {
      if (!isResizing) {
          setDimensions(prev => {
            if (prev.width !== project.cardWidth || prev.height !== project.cardHeight) {
                return { width: project.cardWidth, height: project.cardHeight };
            }
            return prev;
          });
          setPaddingBottom(project.cardPaddingBottom ?? 30);
          // Keep lockedRatio as true by default, only change if explicitly set to false
          if (project.lockedAspectRatio === false) {
              setLockedRatio(false);
          }
      }
  }, [project.cardWidth, project.cardHeight, project.cardPaddingBottom, project.lockedAspectRatio, isResizing]);
  
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
  const totalHeight = hasCustomSize && dimensions.height ? dimensions.height + paddingBottom : undefined;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? 'none' : (transition ? `${transition}, width 0.3s ease, height 0.3s ease` : undefined),

    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,

    // Card width follows image width
    width: hasCustomSize ? `${dimensions.width}px` : undefined,
    // Card height = image height + padding bottom
    height: totalHeight ? `${totalHeight}px` : undefined,

    maxWidth: isResizing ? 'none' : (hasCustomSize ? '100%' : undefined),
    flex: hasCustomSize ? '0 0 auto' : undefined,
    minWidth: hasCustomSize ? '0' : undefined,

    zIndex: isResizing ? 100 : 'auto',
  };

  // Image style for controlling displayed image size
  const imageStyle = hasCustomSize ? {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    objectFit: 'cover' as const,
  } : undefined;

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
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

      // Get current image dimensions or use card rect
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
              newWidth = Math.max(100, Math.min(newWidth, 1200));

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

  const handleResizeSave = async () => {
      if (confirm("Save new size settings?")) {
          // Use refs to ensure we get the latest values
          await updateProject({
              ...project,
              cardWidth: dimensionsRef.current.width,
              cardHeight: dimensionsRef.current.height,
              cardPaddingBottom: paddingBottomRef.current,
              lockedAspectRatio: lockedRatioRef.current
          });
          setIsResizing(false);
          // Refresh to get latest data from server and bypass cache
          router.refresh();
      }
  };

  const handleResizeCancel = () => {
      setDimensions({ width: project.cardWidth, height: project.cardHeight });
      setPaddingBottom(project.cardPaddingBottom ?? 30);
      setLockedRatio(project.lockedAspectRatio !== false);
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
  // Hide private projects when: not logged in OR admin mode is off
  if (currentVisibility === 'private' && (!isAdmin || !adminMode)) {
      return null;
  }

  const handleMemoClick = (e: React.MouseEvent) => {
      if (isAdmin && adminMode) {
          e.preventDefault();
          e.stopPropagation();
          setIsEditingMemo(true);
      } else if (project.linkedPage && project.linkedItemId) {
          // 링크가 설정된 경우 해당 페이지로 이동
          e.preventDefault();
          e.stopPropagation();
          router.push(`/${project.linkedPage}?item=${project.linkedItemId}`);
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
                  width={dimensions.width || 600}
                  height={dimensions.height || 400}
                  className={styles.image}
                  loading={priority ? "eager" : "lazy"}
                  priority={priority}
                  quality={priority ? 90 : 80}
                  sizes={hasCustomSize ? `${dimensions.width}px` : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
                  placeholder="empty"
                  style={imageStyle}
                  unoptimized={hasCustomSize}
              />
          ) : (
              <div className={styles.imagePlaceholder} style={{ width: dimensions.width || 600, height: dimensions.height || 400, background: '#f0f0f0' }} />
          )}

          <div className={styles.overlayInfo} aria-hidden="true">
              {showId && <span className={styles.number}>{project.id}</span>}{showId && showTitle && ' '}{showTitle && <span className={styles.title}>{project.title}</span>}
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
                    cursor: (!isAdmin || !adminMode) && project.linkedPage && project.linkedItemId ? 'pointer' : undefined,
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
                {showId && <span className={styles.number}>{project.id}</span>}{showId && showTitle && ' '}{showTitle && <span className={styles.title}>{project.title}</span>}
            </div>
        )}
        
        {isAdmin && adminMode && !isResizing && (
            <div className={`${styles.adminOverlay} ${!showId && !showTitle ? styles.noOverlayInfo : ''}`}
                 onPointerDown={(e) => e.stopPropagation()}
                 onMouseDown={(e) => e.stopPropagation()}
                 onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Handle */}
                <div className={styles.dragHandle} 
                     ref={setActivatorNodeRef}
                     {...listeners}
                     style={{ cursor: 'grab', touchAction: 'none' }}
                >
                  :::
                </div>

                <button onClick={(e) => {
                  e.stopPropagation();
                  // Use original image aspect ratio if available, otherwise use current dimensions
                  if (originalImageRef.current) {
                    aspectRatioRef.current = originalImageRef.current.width / originalImageRef.current.height;
                  } else if (dimensions.width && dimensions.height) {
                    aspectRatioRef.current = dimensions.width / dimensions.height;
                  }
                  setIsResizing(true);
                }} className={styles.resizeToggleBtn} title="Resize">⤡</button>
                <button onClick={handleEdit} className={styles.editBtn}>Edit</button>
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
                    <div className={styles.resizeInputGroup}>
                        <span className={styles.resizeLabel}>Pad</span>
                        <input
                            className={styles.resizeInput}
                            type="number"
                            value={paddingBottom}
                            onChange={(e) => setPaddingBottom(parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>
                <div className={styles.resizeControlsRow}>
                    <label className={styles.resizeLabel} style={{display:'flex', alignItems:'center', gap: '5px', cursor:'pointer'}}>
                        <input type="checkbox" checked={lockedRatio} onChange={(e) => setLockedRatio(e.target.checked)} />
                        Lock
                    </label>
                </div>
                <div className={styles.resizeControlsRow}>
                    <button className={styles.resetLink} onClick={handleReset} title="Reset to original image size">Reset</button>
                    <div style={{display: 'flex', gap: '10px', marginLeft: 'auto'}}>
                        <button className={styles.resetLink} onClick={handleResizeSave}>Save</button>
                        <button className={styles.resetLink} onClick={handleResizeCancel}>Cancel</button>
                    </div>
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
