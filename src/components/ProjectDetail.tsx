"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { Project, GalleryItem } from "@/data/projects";
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

  return (
    <div className={styles.container}>
      {isAdmin && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', gap: '10px' }}>
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
        
        <div className={styles.detailsTrigger} onClick={toggleDetails}>
          infos
        </div>

        {isAdmin && adminMode && (
             <div style={{ marginBottom: '10px' }}>
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
      </div>

      <div className={styles.imageColumn}>
        {isAdmin && adminMode && (
            <div className={styles.uploadSection}>
                <label className={styles.uploadLabel}>
                    + Add Image
                    <input 
                        type="file" 
                        className={styles.uploadInput} 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        disabled={uploading}
                    />
                </label>
                <button className={styles.addTextBtn} onClick={handleAddText}>
                    + Add Text
                </button>
                {uploading && (
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                )}
                {error && <p style={{ color: 'red', marginTop: '10px', width: '100%' }}>{error}</p>}
            </div>
        )}

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
                 <Image
                    src={currentItem.src}
                    alt={currentItem.alt || "Lightbox Image"}
                    width={currentItem.width}
                    height={currentItem.height}
                    className={styles.lightboxImage}
                    unoptimized
                 />
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
                         <img src={item.src} alt={`Thumbnail ${index}`} style={{ height: '100%', width: 'auto' }} />
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
                      <button className={`${styles.modalBtn} ${styles.saveBtn}`} onClick={handleSaveText}>Save</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
