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
}

export default function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const { isAdmin, adminMode } = useAdmin();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef, // For handle-based dragging
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.id, disabled: !isAdmin || !adminMode }); // Disable drag if not admin or adminMode is off

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  const { deleteProject, updateProject } = useProjects();
  const [showVisibilityOptions, setShowVisibilityOptions] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject(project.id);
    }
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
  
  if (isAdmin && !adminMode && currentVisibility === 'private') {
      return null;
  }

  const getVisibilityLabel = (vis: string) => {
      switch(vis) {
          case 'public': return 'Public';
          case 'team': return 'Team Only';
          case 'private': return 'Private';
          default: return 'Public';
      }
  };

  return (
    // Only attach attributes to the root for accessibility. Listeners are moved to the handle.
    <div ref={setNodeRef} style={style} className={`${styles.card} ${currentVisibility !== 'public' ? styles.hidden : ''}`} {...attributes}>
      <Link href={project.link || `/projet/${project.slug}`}>
        <div className={styles.imageWrapper}>
          <Image
            src={project.imageUrl}
            alt={project.title}
            width={600}
            height={400}
            className={styles.image}
            unoptimized
          />
          <div className={styles.overlayInfo}>
            <span className={styles.number}>{project.id}</span>
            <span className={styles.title}>{project.title}</span>
          </div>
          
          {isAdmin && adminMode && (
              <div 
                className={styles.visibilitySelectContainer}
                style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}
                ref={visibilityRef}
                onClick={(e) => e.preventDefault()} // Prevent link navigation
              >
                  <button 
                    className={styles.visibilitySelectTrigger}
                    onClick={toggleVisibilityOptions}
                    aria-haspopup="listbox"
                    aria-expanded={showVisibilityOptions}
                    title="Change Visibility"
                  >
                      <span>{getVisibilityLabel(currentVisibility as string)}</span>
                      <span style={{ fontSize: '10px', marginLeft: '5px' }}>▼</span>
                  </button>
                  
                  <div className={`${styles.visibilityOptions} ${showVisibilityOptions ? styles.open : ''}`} role="listbox">
                      <div 
                        className={`${styles.visibilityOption} ${currentVisibility === 'public' ? styles.selected : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleVisibilityChange('public'); }}
                        role="option"
                        aria-selected={currentVisibility === 'public'}
                      >
                          <span>Public</span>
                      </div>
                      <div 
                        className={`${styles.visibilityOption} ${currentVisibility === 'team' ? styles.selected : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleVisibilityChange('team'); }}
                        role="option"
                        aria-selected={currentVisibility === 'team'}
                      >
                          <span>Team Only</span>
                      </div>
                      <div 
                        className={`${styles.visibilityOption} ${currentVisibility === 'private' ? styles.selected : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleVisibilityChange('private'); }}
                        role="option"
                        aria-selected={currentVisibility === 'private'}
                      >
                          <span>Private</span>
                      </div>
                  </div>
              </div>
          )}
        </div>
      </Link>
      
      {isAdmin && adminMode && (
          <div className={styles.adminOverlay} 
               // Prevent clicks/drags in the overlay area from bubbling up (though listeners are now on handle only)
               onPointerDown={(e) => e.stopPropagation()}
               onMouseDown={(e) => e.stopPropagation()}
               onClick={(e) => e.stopPropagation()}
          >
              <button onClick={handleEdit} className={styles.editBtn}>Edit</button>
              <button onClick={handleDelete} className={styles.deleteBtn}>Delete</button>
              
              {/* Drag Handle - Attach listeners and activator ref here */}
              <div className={styles.dragHandle} 
                   ref={setActivatorNodeRef}
                   {...listeners}
                   style={{ cursor: 'grab', touchAction: 'none' }} // Ensure touch action is none for touch drag
              >
                :::
              </div>
          </div>
      )}
    </div>
  );
}
