"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { Project, GalleryItem, ContentBlock } from "@/data/projects";
import styles from "./ProjectDetail.module.css";
import { useAdmin } from "@/context/AdminContext";
import { useProjects } from "@/context/ProjectContext";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableGalleryItem } from "./SortableGalleryItem";

interface ProjectDetailProps {
  project: Project;
}

export default function ProjectDetail({ project: initialProject }: ProjectDetailProps) {
  // Use context to get live data if available, otherwise fallback to props
  const { projects, updateProject } = useProjects();
  const project = projects.find(p => p.id === initialProject.id) || initialProject;

  const { isAdmin, adminMode, toggleAdminMode } = useAdmin();
  const [showDetails, setShowDetails] = useState(true);

  // Collapse details by default on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowDetails(false);
    }
  }, []);
  
  // Edit Details State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedDetails, setEditedDetails] = useState(project.details || {});

  // Update editedDetails when project changes
  useEffect(() => {
    setEditedDetails(project.details || {});
  }, [project.details]);

  const handleDetailChange = (key: string, value: string) => {
    setEditedDetails(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveDetails = async () => {
    await updateProject({ ...project, details: editedDetails as any });
    setIsEditingDetails(false);
  };

  const handleCancelDetails = () => {
    setEditedDetails(project.details || {});
    setIsEditingDetails(false);
  };

  const detailFields = [
    { key: 'year', label: 'Year' },
    { key: 'location', label: 'Location' },
    { key: 'client', label: 'Client' },
    { key: 'mandataire', label: 'Lead Architect' },
    { key: 'partners', label: 'Partner' },
    { key: 'team', label: 'With' },
    { key: 'program', label: 'Program' },
    { key: 'area', label: 'Area' },
    { key: 'cost', label: 'Cost' },
    { key: 'mission', label: 'Mission' },
    { key: 'status', label: 'Status' },
    { key: 'photographer', label: 'Photographer' },
  ];
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0); // Index within the full galleryImages array
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Upload/Text state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Text Modal state
  const [showTextModal, setShowTextModal] = useState(false);
  const [newTextContent, setNewTextContent] = useState("");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Edit Gallery Item State
  const [editingItemIndex, setEditingTextItemIndex] = useState<number | null>(null);
  const [showImageEditModal, setShowImageEditModal] = useState(false);
  const [editImageSrc, setEditImageSrc] = useState("");
  const [editImageAlt, setEditImageAlt] = useState("");

  // Description Blocks State
  const [descriptionBlocks, setDescriptionBlocks] = useState<ContentBlock[]>(project.descriptionBlocks || []);

  useEffect(() => {
    setDescriptionBlocks(project.descriptionBlocks || []);
  }, [project.descriptionBlocks]);

  const handleAddTextBlock = async () => {
      const newBlock: ContentBlock = {
          id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'text',
          content: ''
      };
      const newBlocks = [...descriptionBlocks, newBlock];
      setDescriptionBlocks(newBlocks);
      await updateProject({ ...project, descriptionBlocks: newBlocks });
  };

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
          
          const newBlock: ContentBlock = {
              id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'image',
              content: data.url
          };
          const newBlocks = [...descriptionBlocks, newBlock];
          setDescriptionBlocks(newBlocks);
          await updateProject({ ...project, descriptionBlocks: newBlocks });
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
      // Debounce save or save on blur? 
      // We will save on blur in the UI component
  };

  const handleSaveBlockContent = async () => {
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

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleItemClick = (itemIndex: number) => {
    const item = project.galleryImages?.[itemIndex];
    if (!item) return;

    if (item.type === 'image') {
        setCurrentItemIndex(itemIndex);
        setLightboxOpen(true);
        setZoomLevel(1);
        document.body.style.overflow = 'hidden';
    } else if (item.type === 'text') {
        if (isAdmin && adminMode) {
             setEditingTextId(item.id);
             setNewTextContent(item.content);
             setShowTextModal(true);
        } else {
             setCurrentItemIndex(itemIndex);
             setLightboxOpen(true);
             setZoomLevel(1);
             document.body.style.overflow = 'hidden';
        }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
          setError("File size exceeds 10MB");
          return;
      }

      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
          // Simulate progress
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
          const newImage: GalleryItem = {
              type: 'image',
              id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              src: data.url,
              width: data.width,
              height: data.height,
              alt: file.name
          };

          const newItems = project.galleryImages ? [newImage, ...project.galleryImages] : [newImage];
          await updateProject({ ...project, galleryImages: newItems });
          
      } catch (err: any) {
          setError(err.message);
      } finally {
          setUploading(false);
          // Clear input
          e.target.value = '';
          setTimeout(() => setUploadProgress(0), 1000);
      }
  };

  const handleAddText = () => {
      setEditingTextId(null);
      setNewTextContent("");
      setShowTextModal(true);
  };

  const handleSaveText = async () => {
      if (!newTextContent.trim()) return;

      let newItems = [...(project.galleryImages || [])];

      if (editingTextId) {
          // Update existing
          newItems = newItems.map(item => {
              if (item.id === editingTextId && item.type === 'text') {
                  return { ...item, content: newTextContent };
              }
              return item;
          });
      } else {
          // Create new
          const newTextItem: GalleryItem = {
              type: 'text',
              id: `txt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              content: newTextContent,
              style: {
                  backgroundColor: '#f5f5f5',
                  fontSize: '16px'
              }
          };
          newItems = [newTextItem, ...newItems];
      }

      await updateProject({ ...project, galleryImages: newItems });
      
      setShowTextModal(false);
      setNewTextContent("");
      setEditingTextId(null);
  };

  const currentItem = project.galleryImages?.[currentItemIndex];
  const details = project.details || {
      year: "",
      location: "",
      client: "",
      mandataire: "",
      program: "",
      area: "",
      cost: "",
      mission: "",
      status: "",
      photographer: ""
  };

  const handleUpdateItem = async (index: number, updatedItem: GalleryItem) => {
      const newGalleryImages = [...(project.galleryImages || [])];
      newGalleryImages[index] = updatedItem;
      const updatedProject = { ...project, galleryImages: newGalleryImages };
      await updateProject(updatedProject);
  };

  const handleEditItem = (index: number, item: GalleryItem) => {
      if (item.type === 'text') {
          setEditingTextId(item.id);
          setNewTextContent(item.content);
          setShowTextModal(true);
      } else {
          setEditingTextItemIndex(index);
          setEditImageSrc(item.src);
          setEditImageAlt(item.alt);
          setShowImageEditModal(true);
      }
  };

  const handleSaveImageEdit = async () => {
      if (editingItemIndex === null || !project.galleryImages) return;
      
      const item = project.galleryImages[editingItemIndex];
      if (item.type !== 'image') return;

      const updatedItem = {
          ...item,
          src: editImageSrc,
          alt: editImageAlt
      };

      await handleUpdateItem(editingItemIndex, updatedItem);
      setShowImageEditModal(false);
      setEditingTextItemIndex(null);
  };

  const handleImageFileReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || editingItemIndex === null) return;

      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
          const res = await fetch('/api/upload', {
              method: 'POST',
              body: formData
          });

          if (!res.ok) throw new Error('Upload failed');

          const data = await res.json();
          setEditImageSrc(data.url);
          // Optionally update dimensions if you want to keep original file aspect ratio
          // But usually we just update the source.
      } catch (err: any) {
          setError(err.message);
      } finally {
          setUploading(false);
      }
  };

  const handleDeleteFromModal = async () => {
      let indexToDelete = -1;
      
      if (editingTextId) {
          indexToDelete = project.galleryImages?.findIndex(item => item.id === editingTextId) ?? -1;
      } else if (editingItemIndex !== null) {
          indexToDelete = editingItemIndex;
      }

      if (indexToDelete !== -1 && confirm('Are you sure you want to delete this item?')) {
          await handleDeleteItem(indexToDelete);
          setShowTextModal(false);
          setShowImageEditModal(false);
          setEditingTextId(null);
          setEditingTextItemIndex(null);
      }
  };

  // Close add menu when clicking outside
  const addMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
            setShowAddMenu(false);
        }
    };
    if (showAddMenu) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);

  return (
    <div className={styles.container}>
      {isAdmin && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', gap: '10px' }}>
              {adminMode && (
                  <div style={{ position: 'relative' }} ref={addMenuRef}>
                      <button 
                        onClick={() => setShowAddMenu(!showAddMenu)} 
                        style={{ padding: '10px 20px', background: 'black', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      >
                          + Add
                      </button>
                      {showAddMenu && (
                          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '5px', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden', minWidth: '120px', zIndex: 1001 }}>
                              <label style={{ display: 'block', padding: '12px 16px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #eee', color: 'black' }}>
                                  + Image
                                  <input 
                                    type="file" 
                                    style={{ display: 'none' }} 
                                    accept="image/*" 
                                    onChange={(e) => {
                                        handleFileUpload(e);
                                        setShowAddMenu(false);
                                    }} 
                                  />
                              </label>
                              <button 
                                onClick={() => { 
                                    handleAddText(); 
                                    setShowAddMenu(false); 
                                }} 
                                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: 'black' }}
                              >
                                  + Text
                              </button>
                          </div>
                      )}
                  </div>
              )}
              <button 
                onClick={toggleAdminMode} 
                style={{ 
                    padding: '10px 20px', 
                    background: adminMode ? 'black' : '#eee', 
                    color: adminMode ? 'white' : 'black', 
                    border: '1px solid #ccc', 
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease'
                }}
                aria-label={adminMode ? "Switch to User View" : "Switch to Admin Mode"}
              >
                  {adminMode ? 'Admin Mode: ON' : 'Admin Mode: OFF'}
              </button>
          </div>
      )}

      <div className={styles.infoColumn}>
        <h1 className={styles.title}>{project.title}</h1>
        <div className={styles.subtitle}>
          {details.year}{details.year && details.location ? ", " : ""}{details.location}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <div className={styles.detailsTrigger} onClick={toggleDetails} style={{ marginBottom: 0 }}>
            infos
          </div>

          {isAdmin && adminMode && (
               <div style={{ display: 'flex' }}>
                   {!isEditingDetails ? (
                       <button 
                          onClick={() => setIsEditingDetails(true)}
                          style={{ padding: '5px 10px', background: '#eee', border: '1px solid #ccc', cursor: 'pointer', borderRadius: '4px' }}
                       >
                           Edit Infos
                       </button>
                   ) : (
                       <div style={{ display: 'flex', gap: '5px' }}>
                           <button 
                              onClick={handleSaveDetails}
                              style={{ padding: '5px 10px', background: 'black', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                           >
                               Save
                           </button>
                           <button 
                              onClick={handleCancelDetails}
                              style={{ padding: '5px 10px', background: '#eee', border: '1px solid #ccc', cursor: 'pointer', borderRadius: '4px' }}
                           >
                               Cancel
                           </button>
                       </div>
                   )}
               </div>
          )}
        </div>

        <div className={`${styles.detailsList} ${showDetails ? styles.open : ""}`}>
          {!isEditingDetails ? (
            detailFields.map(field => {
                // Show item if it has a value OR if we are in admin mode (so we can see empty fields to edit later? No, edit mode handles that)
                // Actually, in view mode, we usually hide empty fields.
                // But let's follow existing logic: render conditional for partners/team, others always?
                // The original code rendered some conditionally (partners, team) and others always.
                const val = (details as any)[field.key];
                if (!val && (field.key === 'partners' || field.key === 'team')) return null;
                
                return (
                    <div className={styles.detailItem} key={field.key}>
                        <span className={styles.detailLabel}>{field.label}</span>
                        {val}
                    </div>
                );
            })
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 {detailFields.map(field => (
                     <div key={field.key} style={{ display: 'flex', flexDirection: 'column' }}>
                         <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>{field.label}</label>
                         <input 
                             type="text" 
                             value={(editedDetails as any)[field.key] || ''}
                             onChange={(e) => handleDetailChange(field.key, e.target.value)}
                             style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
                         />
                     </div>
                 ))}
             </div>
          )}
        </div>

        {/* Description Blocks Section */}
        <div style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            {descriptionBlocks.map((block, index) => (
                <div key={block.id} style={{ marginBottom: '20px', position: 'relative' }}>
                    {block.type === 'text' ? (
                        isAdmin && adminMode ? (
                            <textarea
                                value={block.content}
                                onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
                                onBlur={handleSaveBlockContent}
                                placeholder="Write something..."
                                style={{ width: '100%', minHeight: '100px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        ) : (
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{block.content}</div>
                        )
                    ) : (
                        <div style={{ position: 'relative' }}>
                             <img src={block.content} alt="Block Image" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }} />
                        </div>
                    )}
                    
                    {isAdmin && adminMode && (
                        <div style={{ position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.8)', padding: '5px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <button onClick={() => handleMoveBlock(index, 'up')} disabled={index === 0} style={{ cursor: index === 0 ? 'default' : 'pointer', border: 'none', background: 'none', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
                            <button onClick={() => handleMoveBlock(index, 'down')} disabled={index === descriptionBlocks.length - 1} style={{ cursor: index === descriptionBlocks.length - 1 ? 'default' : 'pointer', border: 'none', background: 'none', opacity: index === descriptionBlocks.length - 1 ? 0.3 : 1 }}>↓</button>
                            <button onClick={() => handleDeleteBlock(block.id)} style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'red' }}>✕</button>
                        </div>
                    )}
                </div>
            ))}

            {isAdmin && adminMode && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={handleAddTextBlock} style={{ flex: 1, padding: '10px', background: '#f5f5f5', border: '1px dashed #ccc', cursor: 'pointer', borderRadius: '4px' }}>
                        + Add Text
                    </button>
                    <label style={{ flex: 1, padding: '10px', background: '#f5f5f5', border: '1px dashed #ccc', cursor: 'pointer', borderRadius: '4px', textAlign: 'center' }}>
                        + Add Image
                        <input type="file" accept="image/*" onChange={handleBlockImageUpload} style={{ display: 'none' }} />
                    </label>
                </div>
            )}
        </div>
      </div>

      <div className={styles.imageColumn}>
        {isAdmin && adminMode && uploading && (
            <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }}></div>
            </div>
        )}
        {isAdmin && adminMode && error && <p style={{ color: 'red', marginTop: '10px', width: '100%' }}>{error}</p>}

        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={project.galleryImages?.map(item => item.id) || []} 
                strategy={rectSortingStrategy}
            >
                <div className={styles.grid}>
                {project.galleryImages?.map((item, index) => {
                    // Filter logic for non-admins or when admin mode is off
                    if ((!isAdmin || !adminMode) && item.visibility === 'private') return null;
                    // Note: 'team' visibility logic would go here if we had team users context
                    
                    return (
                        <SortableGalleryItem 
                                key={item.id}
                                item={item} 
                                index={index} 
                                onClick={() => handleItemClick(index)}
                                onDelete={handleDeleteItem}
                                onUpdate={handleUpdateItem}
                                onEdit={handleEditItem}
                            />
                    );
                })}
                </div>
            </SortableContext>
        </DndContext>
      </div>

      {/* Lightbox Overlay */}
      <div className={`${styles.lightbox} ${lightboxOpen ? styles.open : ""}`} onClick={closeLightbox}>
        <div className={styles.closeBtn} onClick={closeLightbox}>
             {/* Simple Close Icon */}
             <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <span style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: 'black', transform: 'rotate(45deg)' }}></span>
                <span style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: 'black', transform: 'rotate(-45deg)' }}></span>
             </div>
        </div>
        
        <div className={styles.prevBtn} onClick={prevItem}>&lt;</div>
        
        <div 
            className={styles.lightboxImageWrapper} 
            style={{ 
                transform: currentItem?.type === 'image' ? `scale(${zoomLevel})` : 'none', 
                cursor: currentItem?.type === 'image' ? (zoomLevel === 1 ? 'zoom-in' : 'zoom-out') : 'default',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%'
            }}
            onClick={handleZoom}
        >
            {currentItem && (
                currentItem.type === 'image' ? (
                 currentItem.src ? (
                    <Image
                        src={currentItem.src}
                        alt={currentItem.alt || "Lightbox Image"}
                        width={currentItem.width}
                        height={currentItem.height}
                        className={styles.lightboxImage}
                        unoptimized
                    />
                 ) : (
                    <div style={{ color: 'white' }}>Image Missing</div>
                 )
                ) : (
                 <div 
                    className={styles.lightboxTextItem}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent zoom
                        if (isAdmin && adminMode) {
                            setEditingTextId(currentItem.id);
                            setNewTextContent(currentItem.content);
                            setShowTextModal(true);
                        }
                    }}
                 >
                     {currentItem.content}
                 </div>
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
                     {item.type === 'image' ? (
                         item.src ? (
                            <img src={item.src} alt={`Thumbnail ${index}`} style={{ height: '100%', width: 'auto' }} />
                         ) : (
                            <div style={{ height: '100%', width: '30px', background: '#ccc' }} />
                         )
                     ) : (
                         <div style={{ 
                             height: '100%', 
                             width: '50px', 
                             background: '#ffffff', 
                             display: 'flex', 
                             alignItems: 'center', 
                             justifyContent: 'center', 
                             fontSize: '10px',
                             overflow: 'hidden',
                             color: '#333',
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

      {/* Add Text Modal */}
      {showTextModal && (
          <div className={styles.modalOverlay} onClick={() => setShowTextModal(false)}>
              <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <h3 className={styles.modalTitle}>{editingTextId ? 'Edit Text Note' : 'Add Text Note'}</h3>
                  <textarea 
                      className={styles.modalTextarea} 
                      placeholder="Enter text here..."
                      value={newTextContent}
                      onChange={e => setNewTextContent(e.target.value)}
                      autoFocus
                  />
                  <div className={styles.modalActions}>
                      <button className={`${styles.modalBtn} ${styles.cancelBtn}`} onClick={() => setShowTextModal(false)}>Cancel</button>
                      {editingTextId && (
                          <button className={`${styles.modalBtn} ${styles.deleteModalBtn}`} onClick={handleDeleteFromModal}>Delete</button>
                      )}
                      <button className={`${styles.modalBtn} ${styles.saveBtn}`} onClick={handleSaveText}>Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Image Modal */}
      {showImageEditModal && (
          <div className={styles.modalOverlay} onClick={() => setShowImageEditModal(false)}>
              <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <h3 className={styles.modalTitle}>Edit Image Item</h3>
                  
                  <div style={{ marginBottom: '15px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Replace Image:</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageFileReplace}
                        style={{ fontSize: '12px' }}
                      />
                      {uploading && <div className={styles.progressBar} style={{ height: '4px' }}><div className={styles.progressFill} style={{ width: `${uploadProgress}%` }}></div></div>}
                  </div>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Image URL:</span>
                      <input 
                        type="text" 
                        value={editImageSrc}
                        onChange={(e) => setEditImageSrc(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Alt Text:</span>
                      <input 
                        type="text" 
                        value={editImageAlt}
                        onChange={(e) => setEditImageAlt(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                  </label>
                  <div className={styles.modalActions}>
                      <button className={`${styles.modalBtn} ${styles.cancelBtn}`} onClick={() => setShowImageEditModal(false)}>Cancel</button>
                      <button className={`${styles.modalBtn} ${styles.deleteModalBtn}`} onClick={handleDeleteFromModal}>Delete</button>
                      <button className={`${styles.modalBtn} ${styles.saveBtn}`} onClick={handleSaveImageEdit}>Save</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
