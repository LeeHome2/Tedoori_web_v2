/**
 * Database types for Supabase tables
 */

/**
 * Project table row structure
 */
export interface ProjectRow {
  id: string;
  title: string;
  slug: string;
  image_url: string;
  display_order: number;
  is_visible: boolean;
  details?: ProjectDetails;
  gallery_images?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Project details JSONB structure
 */
export interface ProjectDetails {
  cardWidth?: number;
  cardHeight?: number;
  lockedAspectRatio?: boolean;
  galleryWidthRatio?: number;
  type?: 'project' | 'memo' | 'video';
  videoId?: string;
  content?: string;
  memoStyle?: Record<string, string>;
  showId?: boolean;
  showTitle?: boolean;
  hasDetailLink?: boolean;
  descriptionBlocks?: DescriptionBlock[];
}

/**
 * Description block for project details
 */
export interface DescriptionBlock {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  order: number;
}

/**
 * Frontend project format (transformed from ProjectRow)
 */
export interface Project {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  link: string;
  details: ProjectDetails;
  galleryImages: string[];
  isVisible: boolean;
  cardWidth?: number;
  cardHeight?: number;
  lockedAspectRatio?: boolean;
  galleryWidthRatio?: number;
  type?: 'project' | 'memo' | 'video';
  videoId?: string;
  content?: string;
  memoStyle?: Record<string, string>;
  showId?: boolean;
  showTitle?: boolean;
  hasDetailLink?: boolean;
  descriptionBlocks?: DescriptionBlock[];
  order: number;
}

/**
 * Essay table row structure
 */
export interface EssayRow {
  id: string;
  title: string;
  content: string;
  date: string;
  order_index: number;
  created_at: string;
  updated_at?: string;
}

/**
 * News table row structure
 */
export interface NewsRow {
  id: string;
  title: string;
  content: string;
  date: string;
  order_index: number;
  created_at: string;
  updated_at?: string;
}

/**
 * About block table row structure
 */
export interface AboutBlockRow {
  id: string;
  type: 'text' | 'image' | 'map';
  content: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}
