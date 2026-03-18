"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAddAction } from '@/context/AddActionContext';
import { Project, MemoStyle } from "@/data/projects";
import ProjectCard from "./ProjectCard";
import styles from "./ProjectGrid.module.css";
import { useAdmin } from '@/context/AdminContext';
import { useProjects } from '@/context/ProjectContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import Image from 'next/image';

export default function ProjectGrid() {
  const { projects, loading, error, clearError, addProject, updateProject, deleteProject, reorderProjects } = useProjects();
  const { isAdmin, adminMode } = useAdmin();
  const { setAddAction } = useAddAction();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fix hydration error - only enable DnD after client mount
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch news and essays for memo link selection
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const [newsRes, essaysRes] = await Promise.all([
          fetch('/api/news'),
          fetch('/api/essays')
        ]);
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          setNewsItems(newsData.map((item: {id: string; title: string}) => ({ id: item.id, title: item.title })));
        }
        if (essaysRes.ok) {
          const essaysData = await essaysRes.json();
          setEssayItems(essaysData.map((item: {id: string; title: string}) => ({ id: item.id, title: item.title })));
        }
      } catch (err) {
        console.error('Failed to fetch news/essays:', err);
      }
    };
    fetchItems();
  }, []);
  
  // Upload State
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // YouTube State
  const [isYoutube, setIsYoutube] = useState(false);
  const [youtubeId, setYoutubeId] = useState('');
  const [fetchingVideo, setFetchingVideo] = useState(false);

  // Memo State
  const [projectType, setProjectType] = useState<'project' | 'video' | 'memo'>('project');
  const [memoContent, setMemoContent] = useState('');
  const [memoStyle, setMemoStyle] = useState<MemoStyle>({});

  // Memo Link State
  const [linkedPage, setLinkedPage] = useState<'news' | 'essays' | null>(null);
  const [linkedItemId, setLinkedItemId] = useState<string>('');
  const [newsItems, setNewsItems] = useState<Array<{id: string; title: string}>>([]);
  const [essayItems, setEssayItems] = useState<Array<{id: string; title: string}>>([]);

  // Form State
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [showId, setShowId] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [hasDetailLink, setHasDetailLink] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'team' | 'private'>('public');

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);
      const newProjects = arrayMove(projects, oldIndex, newIndex);
      reorderProjects(newProjects);
    }
  };

  const openAddModal = useCallback(() => {
      setEditingProject(null);
      setImageUrl('');
      setUploadError(null);
      setUploadProgress(0);
      setIsYoutube(false);
      setYoutubeId('');
      setProjectType('project');
      setMemoContent('');
      setMemoStyle({});
      setLinkedPage(null);
      setLinkedItemId('');
      setFormId('');
      setFormTitle('');
      setShowId(true);
      setShowTitle(true);
      setHasDetailLink(true);
      setVisibility('public');
      setIsModalOpen(true);
  }, []);

  // Register add action for header
  useEffect(() => {
    setAddAction(openAddModal);
    return () => setAddAction(null);
  }, [openAddModal, setAddAction]);

  const openEditModal = (project: Project) => {
      setEditingProject(project);
      setImageUrl(project.imageUrl);
      setUploadError(null);
      setUploadProgress(0);
      setIsYoutube(project.type === 'video');
      setYoutubeId(project.videoId || '');
      setProjectType(project.type || 'project');
      setMemoContent(project.content || '');
      setMemoStyle(project.memoStyle || {});
      setLinkedPage(project.linkedPage || null);
      setLinkedItemId(project.linkedItemId || '');
      setFormId(project.id);
      setFormTitle(project.title);
      setShowId(project.showId !== undefined ? project.showId : true);
      setShowTitle(project.showTitle !== undefined ? project.showTitle : true);
      setHasDetailLink(project.hasDetailLink !== undefined ? project.hasDetailLink : true);
      setVisibility(project.isVisible === undefined || project.isVisible === true ? 'public' : (project.isVisible === false ? 'private' : project.isVisible as 'public' | 'team' | 'private'));
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingProject(null);
      setImageUrl('');
      setUploadError(null);
      setIsYoutube(false);
      setYoutubeId('');
      setProjectType('project');
      setMemoContent('');
      setMemoStyle({});
      setLinkedPage(null);
      setLinkedItemId('');
      setFormId('');
      setFormTitle('');
      setShowId(true);
      setShowTitle(true);
      setHasDetailLink(true);
      setVisibility('public');
  };

  const getYoutubeId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleLinkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      const videoId = getYoutubeId(url);
      
      if (videoId) {
          setIsYoutube(true);
          setYoutubeId(videoId);
          setProjectType('video');
          setFetchingVideo(true);
          setUploadError(null);
          
          try {
              // Fetch YouTube video info using oEmbed
              const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
              if (res.ok) {
                  const data = await res.json();
                  setImageUrl(data.thumbnail_url);
                  
                  // Auto-fill title if empty
                  if (!formTitle) {
                      setFormTitle(data.title);
                  }
                  
                  // Auto-fill ID if empty (use video ID)
                  if (!formId) {
                      setFormId(videoId);
                  }
              } else {
                  // Fallback thumbnail if oEmbed fails
                  setImageUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
                  setUploadError("Could not fetch video details, but YouTube link is valid.");
              }
          } catch (err) {
              console.error("Error fetching video info:", err);
              setImageUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
              setUploadError("Network error while fetching video info.");
          } finally {
              setFetchingVideo(false);
          }
      } else {
          setIsYoutube(false);
          setYoutubeId('');
          if (projectType === 'video') setProjectType('project');
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setProjectType('project');
      setIsYoutube(false);
      
      // Client-side validation
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
          setUploadError("Invalid file type. Please upload JPG, PNG, GIF, or WebP.");
          return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
          setUploadError("File size exceeds 5MB limit.");
          return;
      }

      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
          // Simulate progress since fetch doesn't support it natively easily without XHR
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
          setUploadError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
          setUploading(false);
      }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);

      // Use state imageUrl instead of formData if available
      const currentImageUrl = imageUrl || formData.get('imageUrl')?.toString() || '';

      if (projectType !== 'memo' && !currentImageUrl) {
          setUploadError("Please upload an image or provide a URL.");
          return;
      }

      const projectData: Partial<Project> & { id?: string } = {
          id: formData.get('id') as string | undefined,
          title: formData.get('title') as string | undefined,
          imageUrl: currentImageUrl,
          // Let server handle slug generation if not editing
          // slug: formData.get('slug') || ... <- Removed client-side generation
          link: formData.get('link')?.toString() || undefined,
          type: projectType,
          videoId: projectType === 'video' ? youtubeId : undefined,
          content: projectType === 'memo' ? memoContent : undefined,
          memoStyle: projectType === 'memo' ? memoStyle : undefined,
          linkedPage: projectType === 'memo' ? linkedPage : undefined,
          linkedItemId: projectType === 'memo' && linkedPage ? linkedItemId : undefined,
          showId,
          showTitle,
          hasDetailLink,
          isVisible: visibility,
      };

      if (editingProject) {
          // Keep existing slug/link if editing, unless user cleared link?
          // For now, assume editing doesn't change slug/link unless we add inputs for them.
          // Since we don't have inputs for slug, we preserve the original project's slug.
          const originalId = editingProject.id;
          const newId = projectData.id;

          // Check for duplicate ID if ID changed
          if (originalId !== newId && projects.some(p => p.id === newId)) {
              setUploadError("Project ID already exists. Please choose a unique ID.");
              return;
          }

          // Ensure projectData has all required fields for update
          const updatedProject = { ...editingProject, ...projectData };

          if (originalId !== newId) {
              await updateProject(updatedProject, originalId);
          } else {
              await updateProject(updatedProject);
          }
      } else {
          // Check for duplicate ID
          if (projects.some(p => p.id === projectData.id)) {
              setUploadError("Project ID already exists. Please choose a unique ID.");
              return;
          }
          await addProject(projectData as Project);
      }
      closeModal();
  };

  // Show loading only if we truly have no projects and are loading
  if (loading && projects.length === 0) {
    return null; // Show nothing instead of "Loading..." for instant feel
  }

  return (
    <>
      {error && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#ffdddd', color: '#d8000c', padding: '10px 20px', borderRadius: '5px',
          zIndex: 2000, boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {error}
          <button onClick={clearError} style={{ marginLeft: '15px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
        </div>
      )}

      
      {isMounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={projects.map(p => p.id)}
            strategy={rectSortingStrategy}
            disabled={!adminMode} // Disable sorting if not in admin mode
          >
            <div className={styles.grid}>
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={openEditModal}
                  priority={index < 8} // First 8 cards for faster initial load
                />
              ))}
              {/* Placeholders for last row left-alignment */}
              {[...Array(10)].map((_, i) => (
                <div key={`placeholder-${i}`} className={styles.placeholder} style={{ width: '300px' }} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className={styles.grid}>
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={openEditModal}
              priority={index < 8} // First 8 cards for faster initial load
            />
          ))}
          {/* Placeholders for last row left-alignment */}
          {[...Array(10)].map((_, i) => (
            <div key={`placeholder-${i}`} className={styles.placeholder} style={{ width: '300px' }} />
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
          <div style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '0', width: '400px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2 style={{ margin: '0', fontSize: '18px' }}>{editingProject ? 'Edit' : 'Add'}</h2>
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
                        onClick={() => setProjectType('project')}
                        style={{ padding: '5px 10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: projectType === 'project' ? 'underline' : 'none' }}
                      >
                          Project
                      </button>
                      <button
                        onClick={() => setProjectType('video')}
                        style={{ padding: '5px 10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: projectType === 'video' ? 'underline' : 'none' }}
                      >
                          Video
                      </button>
                      <button
                        onClick={() => setProjectType('memo')}
                        style={{ padding: '5px 10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: projectType === 'memo' ? 'underline' : 'none' }}
                      >
                          Memo
                      </button>
                  </div>

                  <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <label style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <span style={{fontWeight: 'bold', minWidth: '80px'}}>ID:</span>
                          <input 
                            name="id" 
                            value={formId} 
                            onChange={(e) => setFormId(e.target.value)}
                            required 
                            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '0' }} 
                          />
                      </label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <span style={{fontWeight: 'bold', minWidth: '80px'}}>Title:</span>
                          <input 
                            name="title" 
                            value={formTitle} 
                            onChange={(e) => setFormTitle(e.target.value)}
                            required 
                            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '0' }} 
                          />
                      </label>

                      <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                              <input
                                  type="checkbox"
                                  checked={showId}
                                  onChange={(e) => setShowId(e.target.checked)}
                              />
                              <span>id</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                              <input
                                  type="checkbox"
                                  checked={showTitle}
                                  onChange={(e) => setShowTitle(e.target.checked)}
                              />
                              <span>title</span>
                          </label>
                          {projectType !== 'memo' && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={hasDetailLink}
                                    onChange={(e) => setHasDetailLink(e.target.checked)}
                                />
                                <span>link</span>
                            </label>
                          )}
                      </div>
                      
                      {projectType !== 'memo' && (
                          <>
                            {/* Image Upload Section */}
                            <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                <span style={{fontWeight: 'bold'}}>Project Image:</span>
                                
                                {imageUrl && imageUrl.trim() !== "" && (
                                    <div style={{ position: 'relative', width: '100%', height: '200px', marginBottom: '10px', background: '#f0f0f0', borderRadius: '0', overflow: 'hidden' }}>
                                        <Image 
                                            src={imageUrl} 
                                            alt="Preview" 
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            unoptimized // For local uploads
                                        />
                                    </div>
                                )}

                                <input 
                                    type="file" 
                                    accept="image/png, image/jpeg, image/gif, image/webp"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    style={{ width: '100%', padding: '5px' }} 
                                />
                                <input type="hidden" name="imageUrl" value={imageUrl} />
                                
                                {uploading && (
                                    <div style={{ width: '100%', height: '5px', background: '#eee', marginTop: '5px', borderRadius: '0' }}>
                                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'black', transition: 'width 0.3s' }}></div>
                                    </div>
                                )}
                                
                                {uploadError && <span style={{ color: 'red', fontSize: '12px' }}>{uploadError}</span>}
                            </div>

                            <label style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <span style={{fontWeight: 'bold', minWidth: '80px'}}>{projectType === 'video' ? 'YouTube URL:' : 'Link:'}</span>
                                <input
                                    name="link"
                                    defaultValue={editingProject?.link}
                                    placeholder={projectType === 'video' ? "https://www.youtube.com/watch?v=..." : "Project link"}
                                    onChange={projectType === 'video' ? handleLinkChange : undefined}
                                    style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '0' }}
                                />
                            </label>
                            {fetchingVideo && <span style={{fontSize: '12px', color: '#666', marginLeft: '90px'}}>Fetching video info...</span>}
                            {isYoutube && <span style={{fontSize: '12px', color: 'green', marginLeft: '90px'}}>YouTube video detected!</span>}
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
                                        borderRadius: '0', 
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

                              {/* Link Settings for Memo */}
                              <label style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
                                  <span style={{fontWeight: 'bold', minWidth: '80px'}}>Link:</span>
                                  <select
                                      value={linkedPage || ''}
                                      onChange={(e) => {
                                          const value = e.target.value as 'news' | 'essays' | '';
                                          setLinkedPage(value ? value : null);
                                          setLinkedItemId('');
                                      }}
                                      style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '0', minWidth: '100px' }}
                                  >
                                      <option value="">No Link</option>
                                      <option value="news">News</option>
                                      <option value="essays">Essays</option>
                                  </select>
                                  {linkedPage && (
                                      <select
                                          value={linkedItemId}
                                          onChange={(e) => setLinkedItemId(e.target.value)}
                                          style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '0', minWidth: '150px', maxWidth: '100%' }}
                                      >
                                          <option value="">Select item...</option>
                                          {(linkedPage === 'news' ? newsItems : essayItems).map(item => (
                                              <option key={item.id} value={item.id}>{item.title || `ID: ${item.id}`}</option>
                                          ))}
                                      </select>
                                  )}
                              </label>
                          </>
                      )}
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button type="button" onClick={closeModal} style={{ flex: 1, padding: '10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
                          {editingProject && (
                              <button
                                type="button"
                                onClick={() => {
                                    if(confirm('Are you sure you want to delete this project?')) {
                                        deleteProject(editingProject.id);
                                        closeModal();
                                    }
                                }}
                                style={{ flex: 1, padding: '10px', background: 'none', color: '#cc0000', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                  Delete
                              </button>
                          )}
                          <button type="submit" disabled={uploading || fetchingVideo} style={{ flex: 1, padding: '10px', background: 'none', color: 'black', border: 'none', cursor: 'pointer', textDecoration: 'underline', opacity: (uploading || fetchingVideo) ? 0.7 : 1 }}>
                              {editingProject ? 'Update' : 'Create'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </>
  );
}
