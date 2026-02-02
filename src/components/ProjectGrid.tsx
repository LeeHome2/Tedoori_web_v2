"use client";

import { useState, useEffect } from 'react';
import { Project } from "@/data/projects";
import ProjectCard from "./ProjectCard";
import styles from "./ProjectGrid.module.css";
import { useAdmin } from '@/context/AdminContext';
import { useProjects } from '@/context/ProjectContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import Image from 'next/image';

export default function ProjectGrid() {
  const { projects, loading, error, clearError, addProject, updateProject, deleteProject, reorderProjects } = useProjects();
  const { isAdmin, adminMode, toggleAdminMode } = useAdmin();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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

  // Form State
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');

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

  const openAddModal = () => {
      setEditingProject(null);
      setImageUrl('');
      setUploadError(null);
      setUploadProgress(0);
      setIsYoutube(false);
      setYoutubeId('');
      setProjectType('project');
      setMemoContent('');
      setFormId('');
      setFormTitle('');
      setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
      setEditingProject(project);
      setImageUrl(project.imageUrl);
      setUploadError(null);
      setUploadProgress(0);
      setIsYoutube(project.type === 'video');
      setYoutubeId(project.videoId || '');
      setProjectType(project.type || 'project');
      setMemoContent(project.content || '');
      setFormId(project.id);
      setFormTitle(project.title);
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
      setFormId('');
      setFormTitle('');
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
      } catch (err: any) {
          setUploadError(err.message);
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

      const projectData: any = {
          id: formData.get('id'),
          title: formData.get('title'),
          imageUrl: currentImageUrl,
          // Let server handle slug generation if not editing
          // slug: formData.get('slug') || ... <- Removed client-side generation
          link: formData.get('link')?.toString() || undefined,
          type: projectType,
          videoId: projectType === 'video' ? youtubeId : undefined,
          content: projectType === 'memo' ? memoContent : undefined,
      };

      if (editingProject) {
          // Keep existing slug/link if editing, unless user cleared link?
          // For now, assume editing doesn't change slug/link unless we add inputs for them.
          // Since we don't have inputs for slug, we preserve the original project's slug.
          await updateProject({ ...editingProject, ...projectData });
      } else {
          await addProject(projectData);
      }
      closeModal();
  };

  if (loading) return <div>Loading...</div>;

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

      {isAdmin && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', gap: '10px' }}>
              {adminMode && (
                  <button onClick={openAddModal} style={{ padding: '10px 20px', background: 'black', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                      + Add New Project
                  </button>
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
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onEdit={openEditModal} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Modal */}
      {isModalOpen && (
          <div style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h2>{editingProject ? 'Edit Item' : 'Add New Item'}</h2>
                  
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <button 
                        onClick={() => setProjectType('project')}
                        style={{ padding: '5px 10px', background: projectType === 'project' ? 'black' : '#eee', color: projectType === 'project' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                          Project
                      </button>
                      <button 
                        onClick={() => setProjectType('video')}
                        style={{ padding: '5px 10px', background: projectType === 'video' ? 'black' : '#eee', color: projectType === 'video' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                          Video
                      </button>
                      <button 
                        onClick={() => setProjectType('memo')}
                        style={{ padding: '5px 10px', background: projectType === 'memo' ? 'black' : '#eee', color: projectType === 'memo' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                          Memo
                      </button>
                  </div>

                  <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <label style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                          <span style={{fontWeight: 'bold'}}>ID:</span>
                          <input 
                            name="id" 
                            value={formId} 
                            onChange={(e) => setFormId(e.target.value)}
                            required 
                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
                          />
                      </label>
                      <label style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                          <span style={{fontWeight: 'bold'}}>Title:</span>
                          <input 
                            name="title" 
                            value={formTitle} 
                            onChange={(e) => setFormTitle(e.target.value)}
                            required 
                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
                          />
                      </label>
                      
                      {projectType !== 'memo' && (
                          <>
                            {/* Image Upload Section */}
                            <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                <span style={{fontWeight: 'bold'}}>Project Image:</span>
                                
                                {imageUrl && imageUrl.trim() !== "" && (
                                    <div style={{ position: 'relative', width: '100%', height: '200px', marginBottom: '10px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
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
                                    <div style={{ width: '100%', height: '5px', background: '#eee', marginTop: '5px', borderRadius: '2px' }}>
                                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'black', transition: 'width 0.3s' }}></div>
                                    </div>
                                )}
                                
                                {uploadError && <span style={{ color: 'red', fontSize: '12px' }}>{uploadError}</span>}
                            </div>

                            <label style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                <span style={{fontWeight: 'bold'}}>{projectType === 'video' ? 'YouTube URL:' : 'Link (optional):'}</span>
                                <input 
                                    name="link" 
                                    defaultValue={editingProject?.link} 
                                    placeholder={projectType === 'video' ? "https://www.youtube.com/watch?v=..." : "Project link"} 
                                    onChange={projectType === 'video' ? handleLinkChange : undefined}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
                                />
                                {fetchingVideo && <span style={{fontSize: '12px', color: '#666'}}>Fetching video info...</span>}
                                {isYoutube && <span style={{fontSize: '12px', color: 'green'}}>YouTube video detected!</span>}
                            </label>
                          </>
                      )}

                      {projectType === 'memo' && (
                          <label style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                              <span style={{fontWeight: 'bold'}}>Memo Content:</span>
                              <textarea 
                                value={memoContent}
                                onChange={(e) => setMemoContent(e.target.value)}
                                required
                                style={{ width: '100%', height: '150px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical' }}
                              />
                          </label>
                      )}
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button type="button" onClick={closeModal} style={{ flex: 1, padding: '10px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                          {editingProject && (
                              <button 
                                type="button" 
                                onClick={() => {
                                    if(confirm('Are you sure you want to delete this project?')) {
                                        deleteProject(editingProject.id);
                                        closeModal();
                                    }
                                }}
                                style={{ flex: 1, padding: '10px', background: '#fff5f5', color: '#cc0000', border: '1px solid #ffdada', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                  Delete
                              </button>
                          )}
                          <button type="submit" disabled={uploading || fetchingVideo} style={{ flex: 1, padding: '10px', background: 'black', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: (uploading || fetchingVideo) ? 0.7 : 1 }}>
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
