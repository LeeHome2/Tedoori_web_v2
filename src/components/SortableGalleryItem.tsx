"use client";

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
}

export function SortableGalleryItem({ item, index, onDelete, onClick, onUpdate }: SortableGalleryItemProps) {
  const { isAdmin, adminMode } = useAdmin();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, disabled: !isAdmin || !adminMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  const handleVisibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      if (onUpdate) {
          onUpdate(index, { ...item, visibility: e.target.value as 'public' | 'team' | 'private' });
      }
  };

  const getVisibilityIcon = () => {
      switch (item.visibility) {
          case 'team': return '👥';
          case 'private': return '🔒';
          default: return '👁️'; // public
      }
  };

  // If not admin and item is not public, hide it? 
  // Wait, if not admin, we might need to hide it completely from rendering in parent.
  // But here we can also return null if we want to be safe, though filtering in parent is better.
  // Assuming parent filters for non-admins.
  
  return (
    <div ref={setNodeRef} style={style} className={`${styles.imageWrapper} ${item.type === 'text' ? styles.textWrapper : ''}`}>
        {item.type === 'image' ? (
             <div onClick={() => onClick(index)}>
                <Image
                    src={item.src}
                    alt={item.alt || `Image ${index + 1}`}
                    width={item.width}
                    height={item.height}
                    className={styles.image}
                    unoptimized
                    loading="lazy"
                    style={item.visibility === 'private' ? { opacity: 0.5, filter: 'grayscale(100%)' } : {}}
                />
             </div>
        ) : (
            <div 
                className={styles.textItem}
                onClick={() => onClick(index)}
                style={item.visibility === 'private' ? { opacity: 0.5, backgroundColor: '#eee' } : {}}
            >
                {item.content}
            </div>
        )}
      
      {isAdmin && adminMode && (
          <div className={styles.adminOverlay} 
               onClick={(e) => e.stopPropagation()}
               onPointerDown={(e) => e.stopPropagation()}
               onMouseDown={(e) => e.stopPropagation()}
          >
              <div className={styles.controlsRow}>
                  <select 
                    value={item.visibility || 'public'} 
                    onChange={handleVisibilityChange}
                    className={styles.visibilitySelect}
                    title="Visibility"
                  >
                      <option value="public">Public</option>
                      <option value="team">Team Only</option>
                      <option value="private">Private</option>
                  </select>
                  
                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if(confirm('Delete this item?')) onDelete(index);
                    }} 
                    className={styles.deleteBtn}
                  >
                    Delete
                  </button>
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
    </div>
  );
}
