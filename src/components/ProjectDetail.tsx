"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useId } from "react";
import Image from "next/image";
import { Project, GalleryItem, ContentBlock, MemoStyle } from "@/data/projects";
import styles from "./ProjectDetail.module.css";
import { useAdmin } from "@/context/AdminContext";
import { useProjects } from "@/context/ProjectContext";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableGalleryItem } from "./SortableGalleryItem";
import BlogEditor from "./BlogEditor";

interface ProjectDetailProps {
  project: Project;
}

export default function ProjectDetail({ project: initialProject }: ProjectDetailProps) {
  // Generate a unique ID for DndContext to avoid hydration mismatches
  const dndContextId = useId();
  
  // Use context to get live data if available, otherwise fallback to props
  const { projects, updateProject } = useProjects();
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  const { isAdmin, adminMode, toggleAdminMode } = useAdmin();

  // Responsive State for Hydration Fix
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const handleResize = () => {
        setIsDesktop(window.innerWidth >= 768);
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Description Blocks State (Deprecated for BlogEditor but kept for migration if needed)
  const [descriptionBlocks, setDescriptionBlocks] = useState<ContentBlock[]>(project.descriptionBlocks || []);
  const lastSelectionRef = useRef<{ blockId: string, cursorIndex: number } | null>(null);
  // HTML Content State for BlogEditor
  // @ts-ignore
  const [blogHtml, setBlogHtml] = useState(project.content || project.details?.content_html || '');

  // Local Edit Mode for Blog Section
  const [isBlogEditing, setIsBlogEditing] = useState(false);

  useEffect(() => {
    // @ts-ignore
    setBlogHtml(project.content || project.details?.content_html || '');
  }, [project.content, project.details]);
  
  const handleBlogChange = async (html: string) => {
      setBlogHtml(html);
      // We don't auto-save to DB on every keystroke to avoid API spam, 
      // rely on 'Done' button or manual save if implemented, or debounce.
      // For now, BlogEditor handles local storage auto-save.
      // But we should update the context/DB when 'Done' is clicked or periodically.
  };

  const saveBlogContent = async () => {
      await updateProject({ ...project, content: blogHtml });
  };

  // Resizable Pane State
  const [leftPaneWidth, setLeftPaneWidth] = useState(70); // Default Gallery 70%
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const resizingBlockRef = useRef<{ id: string, startX: number, startWidth: number, currentWidth?: number } | null>(null);
  const latestBlocksRef = useRef(descriptionBlocks);

  useEffect(() => { latestBlocksRef.current = descriptionBlocks; }, [descriptionBlocks]);

  // Resize Handlers
  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    // Calculate percentage based on Gallery (Left Pane) width
    let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limits (min 10%, max 90%)
    if (newWidth < 10) newWidth = 10;
    if (newWidth > 90) newWidth = 90;
    
    setLeftPaneWidth(newWidth);
  }, []);

  // Removed Block Resize Logic since BlogEditor handles images differently
  // If we need resizing in BlogEditor, it's done via Tiptap extensions or NodeView


  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0); // Index within the full galleryImages array
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Upload State (Shared)
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State for Add/Edit Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [projectType, setProjectType] = useState<'project' | 'video' | 'memo'>('project'); // 'project' maps to 'image' here
  
  // Image/Video Form State
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  
  // Video State
  const [isYoutube, setIsYoutube] = useState(false);
  const [youtubeId, setYoutubeId] = useState('');
  const [fetchingVideo, setFetchingVideo] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  
  // Memo State
  const [memoContent, setMemoContent] = useState('');
  const [memoStyle, setMemoStyle] = useState<MemoStyle>({});

  const handleBlockImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);

      try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          
          const newImageBlock: ContentBlock = {
              id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'image',
              content: data.url,
              width: 800
          };
          
          const newBlocks = [...descriptionBlocks];
          
          // Logic: Insert after the LAST active text selection or at the end
          // If we have a selection recorded
          if (lastSelectionRef.current) {
                const { blockId, cursorIndex } = lastSelectionRef.current;
                const blockIndex = newBlocks.findIndex(b => b.id === blockId);
                
                if (blockIndex !== -1 && newBlocks[blockIndex].type === 'text') {
                    const textBlock = newBlocks[blockIndex];
                    const textBefore = textBlock.content.substring(0, cursorIndex);
                    const textAfter = textBlock.content.substring(cursorIndex);

                    // Update current block
                    newBlocks[blockIndex] = { ...textBlock, content: textBefore };
                    
                    // New text block for after
                    const afterTextBlock: ContentBlock = {
                        id: `blk-${Date.now()}-after-${Math.random().toString(36).substr(2, 9)}`,
                        type: 'text',
                        content: textAfter
                    };
                    
                    // Insert: [TextBefore] -> [Image] -> [TextAfter]
                    newBlocks.splice(blockIndex + 1, 0, newImageBlock, afterTextBlock);
                } else {
                    newBlocks.push(newImageBlock);
                    // Add empty text block after image to continue writing
                    newBlocks.push({
                        id: `blk-${Date.now()}-next`,
                        type: 'text',
                        content: ''
                    });
                }
          } else {
              // No selection, append to end
              newBlocks.push(newImageBlock);
              newBlocks.push({
                  id: `blk-${Date.now()}-next`,
                  type: 'text',
                  content: ''
              });
          }

          setDescriptionBlocks(newBlocks);
          await updateProject({ ...project, descriptionBlocks: newBlocks });
          
          // Clear selection
          lastSelectionRef.current = null;

      } catch (err: any) {
          setError(err.message);
      } finally {
          setUploading(false);
          e.target.value = '';
      }
  };

  const handleUpdateBlock = async (id: string, content: string) => {
      const newBlocks = descriptionBlocks.map(b => b.id === id ? { ...b, content } : b);
      setDescriptionBlocks(newBlocks);
  };

  const handleSaveBlockContent = async () => {
      // Always update on blur to ensure content is saved
      await updateProject({ ...project, descriptionBlocks });
  };

  const handleDeleteBlock = async (id: string) => {
      if (!confirm('Delete this block?')) return;
      const newBlocks = descriptionBlocks.filter(b => b.id !== id);
      setDescriptionBlocks(newBlocks);
      await updateProject({ ...project, descriptionBlocks: newBlocks });
  };

  const handleMoveBlock = async (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === descriptionBlocks.length - 1) return;
      
      const newBlocks = [...descriptionBlocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      
      setDescriptionBlocks(newBlocks);
      await updateProject({ ...project, descriptionBlocks: newBlocks });
  };

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Lightbox & Edit Handlers
  const handleItemClick = async (itemIndex: number) => {
    const item = project.galleryImages?.[itemIndex];
    if (!item) return;

    // Admin Mode: Click inserts image into blog at cursor
    if (isAdmin && adminMode) {
        if (item.type === 'text') return; // Don't insert text blocks via click for now
        
        // For BlogEditor, we might want to insert image into Tiptap
        // But since Tiptap state is inside BlogEditor, we can't easily reach it from here 
        // without lifting state or using a ref.
        // Current requirement #2 is "Add image button in editor", not "Click gallery to insert".
        // Requirement #3 is "Drag and drop inserted images".
        // The user didn't explicitly ask to keep the "Click gallery to insert" feature for the new editor.
        // However, it's a nice feature.
        // For now, let's disable the "Click to insert" logic for the NEW editor to avoid confusion,
        // or we need to pass a ref to BlogEditor to execute `editor.chain().setImage(...)`.
        // Let's stick to the "Add Image" button inside the editor as requested.
        // So we do NOTHING here for now if it's the new editor mode.
        // Or we just open edit modal for the item itself.
        
        openEditModal(itemIndex, item);
        return;
    }

    if (item.type === 'text') {
        if (isAdmin && adminMode) {
             openEditModal(itemIndex, item);
        } else {
             setCurrentItemIndex(itemIndex);
             setLightboxOpen(true);
             setZoomLevel(1);
             document.body.style.overflow = 'hidden';
        }
    } else {
        // Image or Video
        setCurrentItemIndex(itemIndex);
        setLightboxOpen(true);
        setZoomLevel(1);
        document.body.style.overflow = 'hidden';
    }
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = 'auto';
  };

  const nextItem = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentItemIndex((prev) => 
      prev === (project.galleryImages?.length || 0) - 1 ? 0 : prev + 1
    );
    setZoomLevel(1);
  }, [project.galleryImages]);

  const prevItem = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentItemIndex((prev) => 
      prev === 0 ? (project.galleryImages?.length || 0) - 1 : prev - 1
    );
    setZoomLevel(1);
  }, [project.galleryImages]);

  const handleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentItem = project.galleryImages?.[currentItemIndex];
    if (currentItem?.type === 'image') {
        setZoomLevel(prev => prev === 1 ? 2 : 1); 
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextItem();
      if (e.key === 'ArrowLeft') prevItem();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, nextItem, prevItem]);

  // Admin Functions
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && project.galleryImages) {
      const oldIndex = project.galleryImages.findIndex((item) => item.id === active.id);
      const newIndex = project.galleryImages.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(project.galleryImages, oldIndex, newIndex);
      
      await updateProject({ ...project, galleryImages: newItems });
    }
  };

  const handleDeleteItem = async (index: number) => {
      if (!project.galleryImages) return;
      const newItems = [...project.galleryImages];
      newItems.splice(index, 1);
      await updateProject({ ...project, galleryImages: newItems });
  };

  const handleUpdateItem = async (index: number, updatedItem: GalleryItem) => {
      const newGalleryImages = [...(project.galleryImages || [])];
      newGalleryImages[index] = updatedItem;
      const updatedProject = { ...project, galleryImages: newGalleryImages };
      await updateProject(updatedProject);
  };

  // Modal Functions
  const openAddModal = () => {
      setEditingItemIndex(null);
      setProjectType('project');
      setImageUrl('');
      setImageAlt('');
      setUploadProgress(0);
      setError(null);
      setIsYoutube(false);
      setYoutubeId('');
      setVideoLink('');
      setMemoContent('');
      setMemoStyle({});
      setIsModalOpen(true);
  };

  const openEditModal = (index: number, item: GalleryItem) => {
      setEditingItemIndex(index);
      setError(null);
      setUploadProgress(0);

      if (item.type === 'text') {
          setProjectType('memo');
          setMemoContent(item.content);
          setMemoStyle(item.style || {});
      } else if (item.type === 'video') {
          setProjectType('video');
          setIsYoutube(true);
          setYoutubeId(item.videoId);
          setImageUrl(item.src);
          setVideoLink(`https://www.youtube.com/watch?v=${item.videoId}`);
          setImageAlt(item.alt || '');
      } else {
          setProjectType('project'); // Maps to Image
          setImageUrl(item.src);
          setImageAlt(item.alt || '');
          setIsYoutube(false);
          setYoutubeId('');
      }
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingItemIndex(null);
  };

  const getYoutubeId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleLinkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setVideoLink(url);
      const videoId = getYoutubeId(url);
      
      if (videoId) {
          setIsYoutube(true);
          setYoutubeId(videoId);
          setProjectType('video');
          setFetchingVideo(true);
          setError(null);
          
          try {
              const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
              if (res.ok) {
                  const data = await res.json();
                  setImageUrl(data.thumbnail_url);
                  if (!imageAlt) setImageAlt(data.title);
              } else {
                  setImageUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
              }
          } catch (err) {
              console.error("Error fetching video info:", err);
              setImageUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
          } finally {
              setFetchingVideo(false);
          }
      } else {
          setIsYoutube(false);
          setYoutubeId('');
          // if (projectType === 'video') setProjectType('project');
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
          setError("Invalid file type. Please upload JPG, PNG, GIF, or WebP.");
          return;
      }

      if (file.size > 10 * 1024 * 1024) {
          setError("File size exceeds 10MB limit.");
          return;
      }

      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
          const interval = setInterval(() => {
              setUploadProgress(prev => Math.min(prev + 10, 90));
          }, 100);

          const res = await fetch('/api/upload', {
              method: 'POST',
              body: formData
          });

          clearInterval(interval);
          setUploadProgress(100);

          if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || 'Upload failed');
          }

          const data = await res.json();
          setImageUrl(data.url);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setUploading(false);
      }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
      e.preventDefault();

      let newItem: GalleryItem;
      const idPrefix = projectType === 'memo' ? 'txt' : (projectType === 'video' ? 'vid' : 'img');
      const newId = editingItemIndex !== null && project.galleryImages 
          ? project.galleryImages[editingItemIndex].id 
          : `${idPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (projectType === 'memo') {
          if (!memoContent.trim()) {
              setError("Content is required");
              return;
          }
          newItem = {
              type: 'text',
              id: newId,
              content: memoContent,
              style: memoStyle
          };
      } else if (projectType === 'video') {
          if (!youtubeId) {
              setError("Valid YouTube URL is required");
              return;
          }
          newItem = {
              type: 'video',
              id: newId,
              src: imageUrl,
              videoId: youtubeId,
              alt: imageAlt,
              width: 1200, // Default width
              height: 800  // Default height
          };
      } else {
          // Image
          if (!imageUrl) {
              setError("Image is required");
              return;
          }
          newItem = {
              type: 'image',
              id: newId,
              src: imageUrl,
              alt: imageAlt,
              width: 1200, // Default/Placeholder
              height: 800
          };
          // Preserve existing dimensions if editing
          if (editingItemIndex !== null && project.galleryImages) {
              const oldItem = project.galleryImages[editingItemIndex];
              if (oldItem.type === 'image') {
                  newItem.width = oldItem.width;
                  newItem.height = oldItem.height;
                  // If source changed, ideally we should get new dimensions, but for now we keep simple
              }
          }
      }

      // Preserve common properties (card size, visibility, ratio lock) for ALL types
      if (editingItemIndex !== null && project.galleryImages) {
          const oldItem = project.galleryImages[editingItemIndex];
          newItem.cardWidth = oldItem.cardWidth;
          newItem.cardHeight = oldItem.cardHeight;
          newItem.lockedAspectRatio = oldItem.lockedAspectRatio;
          newItem.visibility = oldItem.visibility;
      }

      let newItems = [...(project.galleryImages || [])];
      
      if (editingItemIndex !== null) {
          newItems[editingItemIndex] = newItem;
      } else {
          newItems = [newItem, ...newItems];
      }

      await updateProject({ ...project, galleryImages: newItems });
      closeModal();
  };

  const handleDeleteFromModal = async () => {
      if (editingItemIndex !== null && confirm('Are you sure you want to delete this item?')) {
          await handleDeleteItem(editingItemIndex);
          closeModal();
      }
  };

  const currentItem = project.galleryImages?.[currentItemIndex];

  return (
    <div className={styles.container} ref={containerRef}>
      {isAdmin && (
          <div style={{ position: 'fixed', top: '25px', right: '40px', zIndex: 1000, display: 'flex', gap: '20px', alignItems: 'center' }}>
              {adminMode && (
                  <button 
                    onClick={openAddModal} 
                    style={{ padding: '5px 10px', background: 'black', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '12px', fontFamily: 'Consolas, monospace' }}
                  >
                      + Add
                  </button>
              )}
              <button 
                onClick={toggleAdminMode} 
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    padding: 0, 
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    textTransform: 'lowercase',
                    fontSize: '14px',
                    color: 'black',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    height: '20px',
                    lineHeight: '1',
                    fontFamily: 'Consolas, monospace',
                    width: '140px'
                }}
                aria-label={adminMode ? "Switch to User View" : "Switch to Admin Mode"}
              >
                  {adminMode ? 'admin mode: on' : 'admin mode: off'}
              </button>
          </div>
      )}

      {/* Left Pane: Gallery Section */}
      <div 
        className={styles.imageColumn}
        style={{ width: isDesktop ? `${leftPaneWidth}%` : '100%', flexGrow: 1 }}
      >
        {isAdmin && adminMode && uploading && !isModalOpen && (
            <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }}></div>
            </div>
        )}
        {isAdmin && adminMode && error && !isModalOpen && <p style={{ color: 'red', marginTop: '10px', width: '100%' }}>{error}</p>}

        <DndContext 
            id={dndContextId}
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={project.galleryImages?.filter(item => (isAdmin && adminMode) || item.visibility !== 'private').map(item => item.id) || []} 
                strategy={rectSortingStrategy}
            >
                <div className={styles.grid}>
                {project.galleryImages?.map((item, index) => {
                    if ((!isAdmin || !adminMode) && item.visibility === 'private') return null;
                    
                    return (
                        <SortableGalleryItem 
                                key={item.id}
                                item={item} 
                                index={index} 
                                onClick={() => handleItemClick(index)}
                                onDelete={handleDeleteItem}
                                onUpdate={handleUpdateItem}
                                onEdit={(idx, it) => openEditModal(idx, it)}
                            />
                    );
                })}
                </div>
            </SortableContext>
        </DndContext>
      </div>

      {/* Resizer Handle */}
      <div
        className={styles.resizer}
        onMouseDown={startResizing}
      >
        <div className={styles.resizerHandleIcon} />
      </div>

      {/* Right Pane: Blog Section */}
      <div 
        className={styles.infoColumn} 
        style={{ width: isDesktop ? `${100 - leftPaneWidth}%` : '100%', flexShrink: 0 }}
      >
        {isAdmin && adminMode && (
            <div className={styles.blogHeader}>
                 <div className={styles.blogControls}>
                    <button 
                        className={`${styles.headerBtn} ${isBlogEditing ? styles.active : ''}`}
                        onClick={() => {
                            if (isBlogEditing) {
                                saveBlogContent();
                            }
                            setIsBlogEditing(!isBlogEditing);
                        }}
                    >
                        {isBlogEditing ? 'Done' : 'Edit'}
                    </button>
                 </div>
            </div>
        )}

        {/* Blog Section: Scrollable */}
        <div className={styles.blogSection}>
            {isAdmin && adminMode && isBlogEditing ? (
                <BlogEditor 
                    content={blogHtml} 
                    editable={true} 
                    onChange={handleBlogChange} 
                    projectId={project.id}
                />
            ) : (
                <div 
                    className={styles.blogContent}
                    dangerouslySetInnerHTML={{ __html: blogHtml || '<p>No content yet.</p>' }} 
                />
            )}
        </div>
      </div>

      {/* Lightbox Overlay */}
      <div className={`${styles.lightbox} ${lightboxOpen ? styles.open : ""}`} onClick={closeLightbox}>
        <div className={styles.closeBtn} onClick={closeLightbox}>
             <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <span style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: 'black', transform: 'rotate(45deg)' }}></span>
                <span style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: 'black', transform: 'rotate(-45deg)' }}></span>
             </div>
        </div>
        
        <div className={styles.prevBtn} onClick={prevItem}>&lt;</div>
        
        <div 
            className={styles.lightboxImageWrapper} 
            style={{ 
                transform: (currentItem?.type === 'image' || currentItem?.type === 'video') ? `scale(${zoomLevel})` : 'none', 
                cursor: (currentItem?.type === 'image' || currentItem?.type === 'video') ? (zoomLevel === 1 ? 'zoom-in' : 'zoom-out') : 'default',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%'
            }}
            onClick={handleZoom}
        >
            {currentItem && (
                currentItem.type === 'text' ? (
                 <div 
                    className={styles.lightboxTextItem}
                    style={{
                        fontFamily: currentItem.style?.fontFamily,
                        fontSize: currentItem.style?.fontSize,
                        backgroundColor: currentItem.style?.backgroundColor,
                        color: currentItem.style?.color,
                        textAlign: currentItem.style?.textAlign as any,
                        padding: '40px',
                        maxWidth: '80%',
                        maxHeight: '80%',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap'
                    }}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent zoom
                        if (isAdmin && adminMode) {
                            openEditModal(currentItemIndex, currentItem);
                            setLightboxOpen(false);
                        }
                    }}
                 >
                     {currentItem.content}
                 </div>
                ) : (
                    // Image or Video
                    currentItem.src ? (
                        <>
                            <Image
                                src={currentItem.src}
                                alt={currentItem.alt || "Lightbox Image"}
                                width={currentItem.width}
                                height={currentItem.height}
                                className={styles.lightboxImage}
                                unoptimized
                            />
                            {currentItem.type === 'video' && (
                                <a 
                                    href={`https://www.youtube.com/watch?v=${currentItem.videoId}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                        width: '80px', height: '80px', background: 'rgba(255,0,0,0.8)', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                                        textDecoration: 'none'
                                    }}
                                >
                                    <div style={{
                                        width: 0, height: 0, 
                                        borderTop: '15px solid transparent', borderBottom: '15px solid transparent',
                                        borderLeft: '25px solid white', marginLeft: '5px'
                                    }} />
                                </a>
                            )}
                        </>
                    ) : (
                        <div style={{ color: 'white' }}>Image Missing</div>
                    )
                )
            )}
        </div>

        <div className={styles.nextBtn} onClick={nextItem}>&gt;</div>

        <div className={styles.thumbnailStrip} onClick={(e) => e.stopPropagation()}>
             {project.galleryImages?.map((item, index) => (
                 <div 
                    key={item.id} 
                    className={`${styles.thumbnail} ${currentItemIndex === index ? styles.active : ""}`}
                    onClick={() => {
                        setCurrentItemIndex(index);
                        setZoomLevel(1);
                    }}
                 >
                     {item.type === 'image' || item.type === 'video' ? (
                         item.src ? (
                            <div style={{ position: 'relative', height: '100%', width: 'auto' }}>
                                <img 
                                    src={item.src} 
                                    alt={`Thumbnail ${index}`} 
                                    style={{ height: '100%', width: 'auto' }}
                                    // @ts-ignore
                                    fetchPriority="low" 
                                />
                                {item.type === 'video' && (
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                        width: '20px', height: '20px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <div style={{
                                            width: 0, height: 0, 
                                            borderTop: '4px solid transparent', borderBottom: '4px solid transparent',
                                            borderLeft: '7px solid white', marginLeft: '1px'
                                        }} />
                                    </div>
                                )}
                            </div>
                         ) : (
                            <div style={{ height: '100%', width: '30px', background: '#ccc' }} />
                         )
                     ) : (
                         <div style={{ 
                             height: '100%', 
                             width: '50px', 
                             background: item.style?.backgroundColor || '#ffffff', 
                             display: 'flex', 
                             alignItems: 'center', 
                             justifyContent: 'center', 
                             fontSize: '10px',
                             overflow: 'hidden',
                             color: item.style?.color || '#333',
                             border: '1px solid #ccc',
                             boxSizing: 'border-box'
                         }}>
                             {item.content.charAt(0)}
                         </div>
                     )}
                 </div>
             ))}
        </div>
      </div>

      {/* Unified Add/Edit Modal */}
      {isModalOpen && (
          <div style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '400px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                  <h2>{editingItemIndex !== null ? 'Edit Item' : 'Add New Item'}</h2>
                  
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <button 
                        type="button"
                        onClick={() => setProjectType('project')}
                        style={{ padding: '5px 10px', background: projectType === 'project' ? 'black' : '#eee', color: projectType === 'project' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                          Image
                      </button>
                      <button 
                        type="button"
                        onClick={() => setProjectType('video')}
                        style={{ padding: '5px 10px', background: projectType === 'video' ? 'black' : '#eee', color: projectType === 'video' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                          Video
                      </button>
                      <button 
                        type="button"
                        onClick={() => setProjectType('memo')}
                        style={{ padding: '5px 10px', background: projectType === 'memo' ? 'black' : '#eee', color: projectType === 'memo' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                          Memo
                      </button>
                  </div>

                  <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      
                      {projectType !== 'memo' && (
                          <>
                            {/* Image Upload Section */}
                            <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                <span style={{fontWeight: 'bold'}}>Image:</span>
                                
                                {imageUrl && imageUrl.trim() !== "" && (
                                    <div style={{ position: 'relative', width: '100%', height: '200px', marginBottom: '10px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <Image 
                                            src={imageUrl} 
                                            alt="Preview" 
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            unoptimized
                                        />
                                    </div>
                                )}

                                <input 
                                    type="file" 
                                    accept="image/png, image/jpeg, image/gif, image/webp"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    style={{ width: '100%', padding: '5px' }} 
                                />
                                
                                {uploading && (
                                    <div style={{ width: '100%', height: '5px', background: '#eee', marginTop: '5px', borderRadius: '2px' }}>
                                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'black', transition: 'width 0.3s' }}></div>
                                    </div>
                                )}
                                
                                {error && <span style={{ color: 'red', fontSize: '12px' }}>{error}</span>}
                            </div>

                            {projectType === 'video' && (
                                <label style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                    <span style={{fontWeight: 'bold'}}>YouTube URL:</span>
                                    <input 
                                        name="link" 
                                        value={videoLink} 
                                        placeholder="https://www.youtube.com/watch?v=..." 
                                        onChange={handleLinkChange}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
                                    />
                                    {fetchingVideo && <span style={{fontSize: '12px', color: '#666'}}>Fetching video info...</span>}
                                    {isYoutube && <span style={{fontSize: '12px', color: 'green'}}>YouTube video detected!</span>}
                                </label>
                            )}
                            
                            <label style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                <span style={{fontWeight: 'bold'}}>Alt Text:</span>
                                <input 
                                    value={imageAlt}
                                    onChange={(e) => setImageAlt(e.target.value)}
                                    placeholder="Image description"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
                                />
                            </label>
                          </>
                      )}

                      {projectType === 'memo' && (
                          <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                                  {/* Font Family and Font Size disabled temporarily
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Font Family:</span>
                                      <select 
                                          value={memoStyle.fontFamily || ''} 
                                          onChange={(e) => setMemoStyle(prev => ({ ...prev, fontFamily: e.target.value }))}
                                          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                      >
                                          <option value="">Default</option>
                                          <option value="Arial, sans-serif">Arial</option>
                                          <option value="'Courier New', monospace">Courier New</option>
                                          <option value="'Georgia', serif">Georgia</option>
                                          <option value="'Times New Roman', serif">Times New Roman</option>
                                          <option value="'Verdana', sans-serif">Verdana</option>
                                      </select>
                                  </label>
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Font Size:</span>
                                      <input 
                                          type="text"
                                          placeholder="e.g. 16px"
                                          value={memoStyle.fontSize || ''} 
                                          onChange={(e) => setMemoStyle(prev => ({ ...prev, fontSize: e.target.value }))}
                                          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                      />
                                  </label>
                                  */}
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Background:</span>
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                          <input 
                                              type="color"
                                              value={memoStyle.backgroundColor || '#ffffff'} 
                                              onChange={(e) => setMemoStyle(prev => ({ ...prev, backgroundColor: e.target.value }))}
                                              style={{ height: '35px', width: '35px', padding: '0', border: 'none', cursor: 'pointer' }}
                                          />
                                          <input 
                                              type="text"
                                              value={memoStyle.backgroundColor || ''}
                                              placeholder="#ffffff"
                                              onChange={(e) => setMemoStyle(prev => ({ ...prev, backgroundColor: e.target.value }))}
                                              style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                                          />
                                      </div>
                                  </label>
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Text Color:</span>
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                          <input 
                                              type="color"
                                              value={memoStyle.color || '#000000'} 
                                              onChange={(e) => setMemoStyle(prev => ({ ...prev, color: e.target.value }))}
                                              style={{ height: '35px', width: '35px', padding: '0', border: 'none', cursor: 'pointer' }}
                                          />
                                          <input 
                                              type="text"
                                              value={memoStyle.color || ''}
                                              placeholder="#000000"
                                              onChange={(e) => setMemoStyle(prev => ({ ...prev, color: e.target.value }))}
                                              style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                                          />
                                      </div>
                                  </label>
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: 'span 2' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Alignment:</span>
                                      <div style={{ display: 'flex', gap: '15px' }}>
                                          {['left', 'center', 'right', 'justify'].map(align => (
                                              <label key={align} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px' }}>
                                                  <input 
                                                      type="radio" 
                                                      name="textAlign" 
                                                      value={align}
                                                      checked={memoStyle.textAlign === align || (!memoStyle.textAlign && align === 'left')}
                                                      onChange={(e) => setMemoStyle(prev => ({ ...prev, textAlign: e.target.value as any }))}
                                                  />
                                                  {align.charAt(0).toUpperCase() + align.slice(1)}
                                              </label>
                                          ))}
                                      </div>
                                  </label>
                              </div>
                              <label style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                  <span style={{fontWeight: 'bold'}}>Memo Content:</span>
                                  <textarea 
                                    value={memoContent}
                                    onChange={(e) => setMemoContent(e.target.value)}
                                    required
                                    maxLength={2000}
                                    style={{ 
                                        width: '100%', 
                                        height: '300px', 
                                        padding: '20px', 
                                        border: '1px solid #ccc', 
                                        borderRadius: '4px', 
                                        resize: 'vertical',
                                        // Preview styles
                                        fontFamily: memoStyle.fontFamily,
                                        fontSize: memoStyle.fontSize,
                                        backgroundColor: memoStyle.backgroundColor,
                                        color: memoStyle.color,
                                        textAlign: memoStyle.textAlign
                                    }}
                                  />
                                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
                                      {memoContent.length} / 2000
                                  </div>
                              </label>
                          </>
                      )}
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button type="button" onClick={closeModal} style={{ flex: 1, padding: '10px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                          {editingItemIndex !== null && (
                              <button 
                                type="button" 
                                onClick={handleDeleteFromModal}
                                style={{ flex: 1, padding: '10px', background: '#fff5f5', color: '#cc0000', border: '1px solid #ffdada', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                  Delete
                              </button>
                          )}
                          <button type="submit" disabled={uploading || fetchingVideo} style={{ flex: 1, padding: '10px', background: 'black', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: (uploading || fetchingVideo) ? 0.7 : 1 }}>
                              {editingItemIndex !== null ? 'Update' : 'Add'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
}
