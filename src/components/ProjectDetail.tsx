"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Project, GalleryItem, ContentBlock, MemoStyle } from "@/data/projects";
import styles from "./ProjectDetail.module.css";
import { useAdmin } from "@/context/AdminContext";
import { useProjects } from "@/context/ProjectContext";
import { useAddAction } from "@/context/AddActionContext";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableGalleryItem } from "./SortableGalleryItem";
import BlogEditor from "./BlogEditor";
import SectionScrollTop from "./SectionScrollTop";

interface ProjectDetailProps {
  project: Project;
  prevProject: Project | null;
  nextProject: Project | null;
}

export default function ProjectDetail({ project: initialProject, prevProject, nextProject }: ProjectDetailProps) {
  // Use context to get live data if available, otherwise fallback to props
  const { projects, updateProject } = useProjects();
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  // Generate a stable ID for DndContext based on project ID to avoid hydration mismatches
  const dndContextId = `dnd-${project.id}`;

  const { isAdmin, adminMode, toggleAdminMode } = useAdmin();
  const { setAddAction } = useAddAction();

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
  const [blogHtml, setBlogHtml] = useState(project.content || project.details?.content || '');

  // Local Edit Mode for Blog Section
  const [isBlogEditing, setIsBlogEditing] = useState(false);
  const [isSavingBlog, setIsSavingBlog] = useState(false);

  useEffect(() => {
    setBlogHtml(project.content || project.details?.content || '');
  }, [project.content, project.details]);
  
  const handleBlogChange = async (html: string) => {
      console.log('[BlogChange] HTML updated:', html);
      setBlogHtml(html);
      // We don't auto-save to DB on every keystroke to avoid API spam,
      // rely on 'Done' button or manual save if implemented, or debounce.
      // For now, BlogEditor handles local storage auto-save.
      // But we should update the context/DB when 'Done' is clicked or periodically.
  };

  const saveBlogContent = async () => {
      setIsSavingBlog(true);
      try {
        console.log('[Save] blogHtml:', blogHtml);

        await updateProject({
          ...project,
          content: blogHtml, // Save to project.content as well
          details: {
            year: project.details?.year || '',
            location: project.details?.location || '',
            client: project.details?.client || '',
            mandataire: project.details?.mandataire || '',
            partners: project.details?.partners,
            team: project.details?.team,
            program: project.details?.program || '',
            area: project.details?.area || '',
            cost: project.details?.cost || '',
            mission: project.details?.mission || '',
            status: project.details?.status || '',
            photographer: project.details?.photographer || '',
            ...project.details,
            content: blogHtml, // Save to project.details.content as well
          }
        });
        console.log('[Save] Blog content saved successfully');
      } catch (error) {
        console.error('[Save] Failed to save blog content:', error);
        alert('Failed to save blog content. Please try again.');
        throw error; // Re-throw to prevent closing edit mode on error
      } finally {
        setIsSavingBlog(false);
      }
  };

  // Resizable Pane State
  const [leftPaneWidth, setLeftPaneWidth] = useState(60); // Will be adjusted on mount
  const [initialWidthSet, setInitialWidthSet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const blogSectionRef = useRef<HTMLDivElement>(null);
  const gallerySectionRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // Calculate the maximum cardWidth from gallery images to limit resizer
  const maxGalleryItemWidth = useMemo(() => {
    if (!project.galleryImages || project.galleryImages.length === 0) return 0;
    return Math.max(...project.galleryImages.map(item => item.cardWidth || 0));
  }, [project.galleryImages]);

  // Minimum blog width in pixels
  const minBlogWidth = 500;
  const resizerWidth = 1; // width 1px (no margins)

  // Calculate minimum gallery percentage based on max image width
  const calculateMinGalleryPercent = useCallback((containerWidth: number) => {
    const paddingRight = 0;
    const gridPaddingLeft = 40;
    const safetyBuffer = 20;
    const availableWidth = containerWidth - paddingRight;
    const minGalleryWidthPx = maxGalleryItemWidth + gridPaddingLeft + safetyBuffer;
    return (minGalleryWidthPx / availableWidth) * 100;
  }, [maxGalleryItemWidth]);

  // Calculate maximum gallery percentage based on minimum blog width (300px)
  const calculateMaxGalleryPercent = useCallback((containerWidth: number) => {
    const paddingRight = 0;
    const availableWidth = containerWidth - paddingRight;
    // Blog needs at least minBlogWidth, plus resizer takes resizerWidth
    // So gallery can take at most: availableWidth - minBlogWidth - resizerWidth
    const maxGalleryWidthPx = availableWidth - minBlogWidth - resizerWidth;
    return (maxGalleryWidthPx / availableWidth) * 100;
  }, []);

  // Set initial gallery width on mount - use 60% if viewport is large enough, otherwise use minimum
  useEffect(() => {
    if (!containerRef.current || maxGalleryItemWidth === 0 || initialWidthSet) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const minGalleryPercent = calculateMinGalleryPercent(containerRect.width);
    const maxGalleryPercent = calculateMaxGalleryPercent(containerRect.width);
    const defaultPercent = 60; // Default 4:6 ratio

    // Clamp gallery percentage between min (for image) and max (for blog)
    let targetPercent = defaultPercent;

    // If default is less than min needed for image, increase it
    if (targetPercent < minGalleryPercent) {
      targetPercent = minGalleryPercent;
    }

    // But don't exceed max (to keep blog at least 300px)
    if (targetPercent > maxGalleryPercent) {
      targetPercent = maxGalleryPercent;
    }

    // Final bounds check
    targetPercent = Math.max(10, Math.min(90, targetPercent));

    setLeftPaneWidth(targetPercent);
    setInitialWidthSet(true);
  }, [maxGalleryItemWidth, calculateMinGalleryPercent, calculateMaxGalleryPercent, initialWidthSet]);

  // Ensure gallery width always respects the limits on window resize
  useEffect(() => {
    if (!containerRef.current || maxGalleryItemWidth === 0) return;

    const checkAndAdjustWidth = () => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const minGalleryPercent = calculateMinGalleryPercent(containerRect.width);
      const maxGalleryPercent = calculateMaxGalleryPercent(containerRect.width);

      setLeftPaneWidth(prev => {
        let adjusted = prev;

        // Ensure gallery is at least min (for image visibility)
        if (adjusted < minGalleryPercent) {
          adjusted = minGalleryPercent;
        }

        // But don't exceed max (to keep blog at least 300px)
        if (adjusted > maxGalleryPercent) {
          adjusted = maxGalleryPercent;
        }

        // Final bounds
        adjusted = Math.max(10, Math.min(90, adjusted));

        return adjusted;
      });
    };

    // Check on window resize
    window.addEventListener('resize', checkAndAdjustWidth);
    return () => window.removeEventListener('resize', checkAndAdjustWidth);
  }, [maxGalleryItemWidth, calculateMinGalleryPercent, calculateMaxGalleryPercent]);

  // Store initial offset when resizing starts
  const resizeOffsetRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    // Layout: [blog: (100-leftPaneWidth)%] [resizer margin: 80px] [gallery: leftPaneWidth%]
    const resizerMargin = 80;
    const paddingRight = 0;

    // Available width for percentage calculation (excluding padding-right)
    const availableWidth = containerRect.width - paddingRight;

    // Blog area width in pixels (from container.left to mouse, excluding resizer margin and initial offset)
    const blogWidthPx = e.clientX - containerRect.left - resizerMargin - resizeOffsetRef.current;

    // Blog area percentage
    const blogWidthPercent = (blogWidthPx / availableWidth) * 100;

    // Gallery area percentage (leftPaneWidth stores gallery width)
    let newWidth = 100 - blogWidthPercent;

    // Calculate minimum gallery width based on max image cardWidth
    const gridPaddingLeft = 40;
    const safetyBuffer = 20;
    const minGalleryWidthPx = maxGalleryItemWidth + gridPaddingLeft + safetyBuffer;
    const minGalleryPercent = (minGalleryWidthPx / availableWidth) * 100;

    // Calculate maximum gallery width based on minimum blog width (300px)
    const maxGalleryWidthPx = availableWidth - minBlogWidth - resizerWidth;
    const maxGalleryPercent = (maxGalleryWidthPx / availableWidth) * 100;

    // Limits: min based on max image width, max based on min blog width
    const effectiveMin = Math.max(10, minGalleryPercent);
    const effectiveMax = Math.min(90, maxGalleryPercent);
    if (newWidth < effectiveMin) newWidth = effectiveMin;
    if (newWidth > effectiveMax) newWidth = effectiveMax;

    // Round to pixel-aligned percentage to prevent subpixel rendering issues
    // Calculate pixel width, round it, then convert back to percentage
    const galleryWidthPx = Math.round((newWidth / 100) * availableWidth);
    newWidth = (galleryWidthPx / availableWidth) * 100;

    setLeftPaneWidth(newWidth);
  }, [maxGalleryItemWidth]);

  // Stop resizing (no save - saving happens when Done button is clicked)
  const stopResizing = useCallback(() => {
      isResizing.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
  }, [handleMouseMove]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    // Calculate the initial offset from mouse position to current resizer position
    const containerRect = containerRef.current.getBoundingClientRect();
    const resizerMargin = 80;
    const availableWidth = containerRect.width;
    const currentBlogWidthPx = (100 - leftPaneWidth) / 100 * availableWidth;
    const currentResizerX = containerRect.left + currentBlogWidthPx + resizerMargin;
    resizeOffsetRef.current = e.clientX - currentResizerX;

    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, [stopResizing, handleMouseMove, leftPaneWidth]);

  // Removed Block Resize Logic since BlogEditor handles images differently
  // If we need resizing in BlogEditor, it's done via Tiptap extensions or NodeView


  // Custom scrollbar state for blog section
  const [blogScrollPercent, setBlogScrollPercent] = useState(0);
  const [isDraggingBlogScrollbar, setIsDraggingBlogScrollbar] = useState(false);
  const [blogHasScroll, setBlogHasScroll] = useState(false);
  const [blogScrollThumbHeight, setBlogScrollThumbHeight] = useState(64); // Dynamic thumb height
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);

  // Track blog section scroll position
  useEffect(() => {
    const blogSection = blogSectionRef.current;
    const track = scrollbarTrackRef.current;
    if (!blogSection) return;

    const handleScroll = () => {
      if (isDraggingBlogScrollbar) return; // Don't update while dragging
      const { scrollTop, scrollHeight, clientHeight } = blogSection;
      const maxScroll = scrollHeight - clientHeight;
      setBlogHasScroll(maxScroll > 0);

      // Calculate dynamic thumb height based on visible ratio
      if (track && scrollHeight > 0) {
        const trackRect = track.getBoundingClientRect();
        const trackTop = 0;
        const trackBottom = trackRect.height;
        const availableTrackHeight = trackBottom - trackTop;

        // Thumb height = (visible area / total content) * track height
        const ratio = clientHeight / scrollHeight;
        const minThumbHeight = 30; // Minimum thumb height
        const maxThumbHeight = availableTrackHeight;
        const thumbHeight = Math.max(minThumbHeight, Math.min(maxThumbHeight, ratio * availableTrackHeight));
        setBlogScrollThumbHeight(thumbHeight);
      }

      if (maxScroll > 0) {
        setBlogScrollPercent(scrollTop / maxScroll);
      } else {
        setBlogScrollPercent(0);
      }
    };

    blogSection.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    // Watch for content height changes
    const resizeObserver = new ResizeObserver(() => {
      handleScroll();
    });
    resizeObserver.observe(blogSection);

    return () => {
      blogSection.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [isDraggingBlogScrollbar]);

  // Handle blog scrollbar drag (supports both scrolling and resizing)
  const handleBlogScrollbarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const track = scrollbarTrackRef.current;
    const blogSection = blogSectionRef.current;
    if (!track || !blogSection) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let mode: 'undecided' | 'scroll' | 'resize' = 'undecided';
    const threshold = 5; // pixels to determine direction

    const rect = track.getBoundingClientRect();
    const trackTop = 0;
    const trackBottom = rect.height;
    const thumbHeight = blogScrollThumbHeight;
    const trackHeight = trackBottom - trackTop - thumbHeight;

    // Calculate initial offset from indicator center to mouse position
    const indicatorTop = trackTop + blogScrollPercent * trackHeight;
    const initialScrollOffset = e.clientY - rect.top - indicatorTop - thumbHeight / 2;

    // For resizing - calculate initial offset
    const containerRect = containerRef.current?.getBoundingClientRect();
    const resizerMargin = 80;
    const availableWidth = containerRect?.width || 0;
    const currentBlogWidthPx = (100 - leftPaneWidth) / 100 * availableWidth;
    const currentResizerX = (containerRect?.left || 0) + currentBlogWidthPx + resizerMargin;
    const initialResizeOffset = e.clientX - currentResizerX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);

      // Determine mode based on initial movement direction
      if (mode === 'undecided') {
        if (deltaX > threshold || deltaY > threshold) {
          mode = deltaX > deltaY ? 'resize' : 'scroll';
          if (mode === 'scroll') {
            setIsDraggingBlogScrollbar(true);
          } else {
            isResizing.current = true;
            document.body.style.cursor = "ew-resize";
            document.body.style.userSelect = "none";
          }
        }
        return;
      }

      if (mode === 'scroll') {
        // Scroll logic
        const currentRect = track.getBoundingClientRect();
        const relativeY = Math.max(0, Math.min(moveEvent.clientY - currentRect.top - trackTop - thumbHeight / 2 - initialScrollOffset, trackHeight));
        const percent = trackHeight > 0 ? relativeY / trackHeight : 0;

        const { scrollHeight, clientHeight } = blogSection;
        const maxScroll = scrollHeight - clientHeight;
        blogSection.scrollTop = percent * maxScroll;
        setBlogScrollPercent(Math.max(0, Math.min(1, percent)));
      } else if (mode === 'resize') {
        // Resize logic (same as handleMouseMove in startResizing)
        if (!containerRef.current) return;
        const containerRectNow = containerRef.current.getBoundingClientRect();
        const paddingRight = 0;
        const availableWidthNow = containerRectNow.width - paddingRight;
        const blogWidthPx = moveEvent.clientX - containerRectNow.left - resizerMargin - initialResizeOffset;
        const blogWidthPercent = (blogWidthPx / availableWidthNow) * 100;
        let newWidth = 100 - blogWidthPercent;

        // Calculate limits
        const gridPaddingLeft = 40;
        const safetyBuffer = 20;
        const minGalleryWidthPx = maxGalleryItemWidth + gridPaddingLeft + safetyBuffer;
        const minGalleryPercent = (minGalleryWidthPx / availableWidthNow) * 100;
        const maxGalleryWidthPx = availableWidthNow - minBlogWidth - resizerWidth;
        const maxGalleryPercent = (maxGalleryWidthPx / availableWidthNow) * 100;

        const effectiveMin = Math.max(10, minGalleryPercent);
        const effectiveMax = Math.min(90, maxGalleryPercent);
        if (newWidth < effectiveMin) newWidth = effectiveMin;
        if (newWidth > effectiveMax) newWidth = effectiveMax;

        const galleryWidthPx = Math.round((newWidth / 100) * availableWidthNow);
        newWidth = (galleryWidthPx / availableWidthNow) * 100;

        setLeftPaneWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (mode === 'scroll') {
        setIsDraggingBlogScrollbar(false);
      } else if (mode === 'resize') {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [blogScrollPercent, blogScrollThumbHeight, leftPaneWidth, maxGalleryItemWidth]);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0); // Index within the full galleryImages array
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lightboxVideoPlaying, setLightboxVideoPlaying] = useState(false);
  
  // Upload State (Shared)
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State for Add/Edit Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [projectType, setProjectType] = useState<'project' | 'video' | 'memo'>('project'); // 'project' maps to 'image' here
  const [visibility, setVisibility] = useState<'public' | 'team' | 'private'>('public');
  
  // Image/Video Form State
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [showTitle, setShowTitle] = useState(false);
  
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

      } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Unknown error');
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

    // Admin mode + memo: open edit modal directly instead of lightbox
    if (isAdmin && adminMode && item.type === 'text') {
      openEditModal(itemIndex, item);
      return;
    }

    // Open lightbox for both admin and normal mode
    // Admin can use the "Edit" button in the overlay to edit items
    setCurrentItemIndex(itemIndex);
    setLightboxOpen(true);
    setZoomLevel(1);
    setLightboxVideoPlaying(false);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxVideoPlaying(false);
  };

  // Manage lightbox body class for styling and accessibility
  // Toggles 'lightbox-active' class on body to control global styles (e.g., hiding header)
  useEffect(() => {
    if (lightboxOpen) {
      document.body.classList.add('lightbox-active');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('lightbox-active');
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.classList.remove('lightbox-active');
      document.body.style.overflow = 'auto';
    };
  }, [lightboxOpen]);

  const nextItem = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentItemIndex((prev) =>
      prev === (project.galleryImages?.length || 0) - 1 ? 0 : prev + 1
    );
    setZoomLevel(1);
    setLightboxVideoPlaying(false);
  }, [project.galleryImages]);

  const prevItem = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentItemIndex((prev) =>
      prev === 0 ? (project.galleryImages?.length || 0) - 1 : prev - 1
    );
    setZoomLevel(1);
    setLightboxVideoPlaying(false);
  }, [project.galleryImages]);

  const handleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentItem = project.galleryImages?.[currentItemIndex];
    // Only allow zoom for images, not for videos or when video is playing
    if (currentItem?.type === 'image' && !lightboxVideoPlaying) {
        setZoomLevel(prev => prev === 1 ? 2 : 1);
    }
  };

  // Keyboard and scroll navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextItem();
      if (e.key === 'ArrowLeft') prevItem();
    };

    // Scroll navigation: scroll down = next, scroll up = previous
    let scrollTimeout: NodeJS.Timeout | null = null;
    const handleWheel = (e: WheelEvent) => {
      // If scrolling over a lightbox text/memo item, let it scroll naturally
      const target = e.target as HTMLElement;
      if (target.closest(`.${styles.lightboxTextItem}`)) {
        return;
      }

      e.preventDefault();

      // Debounce to prevent rapid scrolling
      if (scrollTimeout) return;

      if (e.deltaY > 0) {
        // Scroll down - next image
        nextItem();
      } else if (e.deltaY < 0) {
        // Scroll up - previous image
        prevItem();
      }

      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
      }, 300); // 300ms debounce
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
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
  const openAddModal = useCallback(() => {
      setEditingItemIndex(null);
      setProjectType('project');
      setImageUrl('');
      setImageAlt('');
      setItemTitle('');
      setShowTitle(false);
      setUploadProgress(0);
      setError(null);
      setIsYoutube(false);
      setYoutubeId('');
      setVideoLink('');
      setMemoContent('');
      setMemoStyle({});
      setVisibility('public');
      setIsModalOpen(true);
  }, []);

  // Register add action for header
  useEffect(() => {
    setAddAction(openAddModal);
    return () => setAddAction(null);
  }, [openAddModal, setAddAction]);

  const openEditModal = (index: number, item: GalleryItem) => {
      setEditingItemIndex(index);
      setError(null);
      setUploadProgress(0);

      if (item.type === 'text') {
          setProjectType('memo');
          setMemoContent(item.content);
          setMemoStyle(item.style || {});
          setItemTitle(item.title || '');
          setShowTitle(item.showTitle || false);
      } else if (item.type === 'video') {
          setProjectType('video');
          setIsYoutube(true);
          setYoutubeId(item.videoId);
          setImageUrl(item.src);
          setVideoLink(`https://www.youtube.com/watch?v=${item.videoId}`);
          setImageAlt(item.alt || '');
          setItemTitle(item.title || '');
          setShowTitle(item.showTitle || false);
      } else {
          setProjectType('project'); // Maps to Image
          setImageUrl(item.src);
          setImageAlt(item.alt || '');
          setItemTitle(item.title || '');
          setShowTitle(item.showTitle || false);
          setIsYoutube(false);
          setYoutubeId('');
      }
      setVisibility(item.visibility || 'public');
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingItemIndex(null);
      setVisibility('public');
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
      } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Unknown error');
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
              title: itemTitle || undefined,
              showTitle: showTitle,
              style: memoStyle,
              cardWidth: 250,  // Default card width for memo
              cardHeight: 200,  // Default card height for memo
              cardPaddingBottom: 30  // Default padding
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
              title: itemTitle || undefined,
              showTitle: showTitle,
              width: 1200, // Default width
              height: 800,  // Default height
              cardWidth: 400,  // Default card width for video
              cardHeight: 300,  // Default card height for video
              cardPaddingBottom: 30  // Default padding
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
              title: itemTitle || undefined,
              showTitle: showTitle,
              width: 1200, // Default/Placeholder
              height: 800,
              cardWidth: 400,  // Default card width for image
              cardHeight: 300,  // Default card height for image
              cardPaddingBottom: 30  // Default padding
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
          // Title is set from itemTitle state, not preserved from old item
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
      {/* Left Pane: Blog Section */}
      <div
        ref={blogSectionRef}
        className={styles.infoColumn}
        style={{ width: isDesktop ? `calc(${100 - leftPaneWidth}% - 1px)` : '100%', flexShrink: 0 }}
      >
        {/* Project Navigation with Edit Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div className={styles.projectNav}>
                {prevProject ? (
                    <Link href={prevProject.link || `/projet/${prevProject.id}`} className={styles.navArrow} title={`Previous: ${prevProject.title}`}>
                        &lt;
                    </Link>
                ) : (
                    <span className={`${styles.navArrow} ${styles.disabled}`}>
                        &lt;
                    </span>
                )}

                <span className={styles.projectId}>{project.id}</span>

                {nextProject ? (
                    <Link href={nextProject.link || `/projet/${nextProject.id}`} className={styles.navArrow} title={`Next: ${nextProject.title}`}>
                        &gt;
                    </Link>
                ) : (
                    <span className={`${styles.navArrow} ${styles.disabled}`}>
                        &gt;
                    </span>
                )}
            </div>

            {isAdmin && adminMode && (
                <button
                    onClick={async () => {
                        if (isBlogEditing) {
                            try {
                                await saveBlogContent();
                                setIsBlogEditing(false);
                            } catch (error) {
                                // Keep edit mode open on error
                                return;
                            }
                        } else {
                            setIsBlogEditing(true);
                        }
                    }}
                    disabled={isSavingBlog}
                    style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: 'black' }}
                >
                    {isSavingBlog ? 'Saving...' : (isBlogEditing ? 'Done' : 'Edit')}
                </button>
            )}
        </div>

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
        <SectionScrollTop containerRef={blogSectionRef} position="left" galleryWidthPercent={leftPaneWidth} />
      </div>

      {/* Resizer Handle - also acts as scrollbar track */}
      <div
        ref={scrollbarTrackRef}
        className={styles.resizer}
        style={{ cursor: 'ew-resize' }}
        onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            // If clicking on the scrollbar indicator, handle scroll drag
            if (target.closest(`.${styles.scrollbarIndicator}`)) {
              // Handled by indicator onMouseDown
              return;
            } else {
              // Otherwise, start resizing
              startResizing(e);
            }
        }}
      >
        {/* Blog Scrollbar Indicator */}
        {isDesktop && blogHasScroll && (
          <div
            className={`${styles.scrollbarIndicator} ${styles.scrollbarIndicatorFull}`}
            style={{
              top: `calc((100vh - ${blogScrollThumbHeight}px) * ${blogScrollPercent})`,
              height: `${blogScrollThumbHeight}px`,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleBlogScrollbarMouseDown(e);
            }}
          />
        )}
        <div className={styles.resizerHandleIcon} />
      </div>

      {/* Right Pane: Gallery Section */}
      <div
        ref={gallerySectionRef}
        className={styles.imageColumn}
        style={{ width: isDesktop ? `${leftPaneWidth}%` : '100%', flexGrow: 0, flexShrink: 0, position: 'relative' }}
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
        <SectionScrollTop containerRef={gallerySectionRef} />
      </div>

      {/* Lightbox Overlay */}
      <div
        className={`${styles.lightbox} ${lightboxOpen ? styles.open : ""}`}
        onClick={closeLightbox}
        role="dialog"
        aria-modal="true"
        aria-label="Image Gallery"
      >
        <div className={styles.closeBtn} onClick={closeLightbox} role="button" aria-label="Close gallery">
             <div style={{ position: 'relative', width: 42, height: 42 }}>
                <span style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 1, background: 'black', transform: 'rotate(45deg)' }}></span>
                <span style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 1, background: 'black', transform: 'rotate(-45deg)' }}></span>
             </div>
        </div>

        {/* Main content area with navigation arrows */}
        <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            {/* Left navigation arrow - outside image */}
            <div
                className={styles.prevBtn}
                onClick={prevItem}
                role="button"
                aria-label="Previous image"
            >
                <span className={styles.arrowLeft}></span>
            </div>

            <div
                className={styles.lightboxImageWrapper}
                onClick={(e) => e.stopPropagation()}
            >
            {currentItem && (
                currentItem.type === 'text' ? (
                 <div 
                    className={styles.lightboxTextItem}
                    style={{
                        fontFamily: currentItem.style?.fontFamily === 'serif'
                            ? '"Noto Serif KR", serif'
                            : currentItem.style?.fontFamily === 'sans'
                              ? '"Noto Sans KR", sans-serif'
                              : currentItem.style?.fontFamily,
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
                            {currentItem.type === 'video' && lightboxVideoPlaying ? (
                                // Show YouTube iframe when playing
                                <>
                                    <iframe
                                        src={`https://www.youtube.com/embed/${currentItem.videoId}?autoplay=1`}
                                        style={{
                                            width: '90vw',
                                            height: '90vh',
                                            maxWidth: '1600px',
                                            maxHeight: '900px',
                                            border: 'none'
                                        }}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                    {/* Close button to stop video */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxVideoPlaying(false);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '20px',
                                            right: '20px',
                                            width: '40px',
                                            height: '40px',
                                            background: 'rgba(0, 0, 0, 0.7)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            color: 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px',
                                            zIndex: 20
                                        }}
                                        title="Stop video"
                                    >
                                        ×
                                    </button>
                                </>
                            ) : (
                                <>
                                    <img
                                        src={currentItem.src}
                                        alt={currentItem.alt || "Lightbox Image"}
                                        className={styles.lightboxImage}
                                    />
                                    {currentItem.type === 'video' && !lightboxVideoPlaying && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxVideoPlaying(true);
                                            }}
                                            style={{
                                                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                                width: '80px', height: '80px', background: 'rgba(255,0,0,0.8)', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                            title="Play video"
                                        >
                                            <div style={{
                                                width: 0, height: 0,
                                                borderTop: '15px solid transparent', borderBottom: '15px solid transparent',
                                                borderLeft: '25px solid white', marginLeft: '5px'
                                            }} />
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ color: 'white' }}>Image Missing</div>
                    )
                )
            )}
            </div>

            {/* Right navigation arrow - outside image */}
            <div
                className={styles.nextBtn}
                onClick={nextItem}
                role="button"
                aria-label="Next image"
            >
                <span className={styles.arrowRight}></span>
            </div>
        </div>

        <div className={styles.thumbnailStrip} onClick={(e) => e.stopPropagation()}>
             {project.galleryImages?.map((item, index) => (
                 <div
                    key={item.id}
                    className={`${styles.thumbnail} ${currentItemIndex === index ? styles.active : ""}`}
                    onMouseEnter={() => {
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
                                    loading="lazy"
                                    style={{ height: '100%', width: 'auto' }}
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
              <div style={{ background: 'white', padding: '20px', borderRadius: '0', width: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2 style={{ margin: '0', fontSize: '18px' }}>{editingItemIndex !== null ? 'Edit' : 'Add'}</h2>
                      <select
                          value={visibility}
                          onChange={(e) => setVisibility(e.target.value as 'public' | 'team' | 'private')}
                          style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '0', fontSize: '12px', background: 'white' }}
                      >
                          <option value="public">Public</option>
                          <option value="team">Team Only</option>
                          <option value="private">Private</option>
                      </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setProjectType('project')}
                        style={{ padding: '5px 10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: projectType === 'project' ? 'underline' : 'none' }}
                      >
                          Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectType('video')}
                        style={{ padding: '5px 10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: projectType === 'video' ? 'underline' : 'none' }}
                      >
                          Video
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectType('memo')}
                        style={{ padding: '5px 10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: projectType === 'memo' ? 'underline' : 'none' }}
                      >
                          Memo
                      </button>
                  </div>

                  <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                      {/* Title Input - Common for all types */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <span style={{fontWeight: 'bold', minWidth: '80px'}}>Title:</span>
                              <input
                                value={itemTitle}
                                onChange={(e) => setItemTitle(e.target.value)}
                                placeholder="Enter title (optional)"
                                style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '0' }}
                              />
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '90px', cursor: 'pointer', fontSize: '12px' }}>
                              <input
                                  type="checkbox"
                                  checked={showTitle}
                                  onChange={(e) => setShowTitle(e.target.checked)}
                              />
                              <span>Show title</span>
                          </label>
                      </div>

                      {projectType !== 'memo' && (
                          <>
                            {/* Image Upload Section */}
                            <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                <span style={{fontWeight: 'bold'}}>Image:</span>
                                
                                {imageUrl && imageUrl.trim() !== "" && (
                                    <div style={{ position: 'relative', width: '100%', height: '200px', marginBottom: '10px', background: '#f0f0f0', borderRadius: '0', overflow: 'hidden' }}>
                                        <Image
                                            src={imageUrl}
                                            alt="Preview"
                                            fill
                                            sizes="400px"
                                            style={{ objectFit: 'cover' }}
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
                                    <div style={{ width: '100%', height: '5px', background: '#eee', marginTop: '5px', borderRadius: '0' }}>
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
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0' }} 
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
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0' }} 
                                />
                            </label>
                          </>
                      )}

                      {projectType === 'memo' && (
                          <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '0' }}>
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Background:</span>
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                          <input 
                                              type="color"
                                              value={memoStyle.backgroundColor || '#ffffff'} 
                                              onChange={(e) => setMemoStyle(prev => ({ ...prev, backgroundColor: e.target.value }))}
                                              style={{ height: '35px', width: '35px', padding: '0', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                                          />
                                          <input 
                                              type="text"
                                              value={memoStyle.backgroundColor || ''}
                                              placeholder="#ffffff"
                                              onChange={(e) => setMemoStyle(prev => ({ ...prev, backgroundColor: e.target.value }))}
                                              style={{ width: '0', flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '0', fontSize: '12px' }}
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
                                              style={{ height: '35px', width: '35px', padding: '0', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                                          />
                                          <input 
                                              type="text"
                                              value={memoStyle.color || ''}
                                              placeholder="#000000"
                                              onChange={(e) => setMemoStyle(prev => ({ ...prev, color: e.target.value }))}
                                              style={{ width: '0', flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '0', fontSize: '12px' }}
                                          />
                                      </div>
                                  </label>
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Alignment:</span>
                                      <div style={{ display: 'flex', gap: '15px', marginTop: '0' }}>
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
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Font:</span>
                                      <select
                                          value={memoStyle.fontFamily || 'sans'}
                                          onChange={(e) => setMemoStyle(prev => ({ ...prev, fontFamily: e.target.value }))}
                                          style={{ fontSize: '11px', padding: '2px 4px', border: '1px solid #ccc' }}
                                      >
                                          <option value="sans">Noto Sans</option>
                                          <option value="serif">Noto Serif</option>
                                      </select>
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
                                            borderRadius: '0', 
                                            resize: 'vertical',
                                            // Preview styles
                                            fontFamily: memoStyle.fontFamily === 'serif' ? '"Noto Serif KR", serif' : memoStyle.fontFamily === 'sans' ? '"Noto Sans KR", sans-serif' : memoStyle.fontFamily,
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
                              <button type="button" onClick={closeModal} style={{ flex: 1, padding: '10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
                              {editingItemIndex !== null && (
                                  <button
                                    type="button"
                                    onClick={handleDeleteFromModal}
                                    style={{ flex: 1, padding: '10px', background: 'none', color: '#cc0000', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                  >
                                      Delete
                                  </button>
                              )}
                              <button type="submit" disabled={uploading || fetchingVideo} style={{ flex: 1, padding: '10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', textDecoration: 'underline', opacity: (uploading || fetchingVideo) ? 0.7 : 1 }}>
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
