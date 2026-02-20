# Tedoori Web v3 - Development Guide

> Comprehensive documentation for easier development with Claude Code
> Last updated: 2026-02-20

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Key Components](#key-components)
6. [API Routes](#api-routes)
7. [Authentication](#authentication)
8. [State Management](#state-management)
9. [Common Workflows](#common-workflows)
10. [Backup System](#backup-system)
11. [Known Issues & Solutions](#known-issues--solutions)
12. [Development Tips](#development-tips)

---

## Project Overview

**Tedoori Web v3** is a Next.js-based portfolio website for architectural projects with:
- Dynamic project management (CRUD operations)
- Admin interface with drag-and-drop reordering
- Rich blog content editor (TipTap)
- Image gallery system
- YouTube video embedding
- Memo/note card system
- Supabase backend (PostgreSQL + Storage)

### Key Features
- **Admin Mode Toggle**: Switch between user/admin views
- **Project Types**: Regular projects, videos, memos
- **Visibility Control**: Public, team, private projects
- **Image Upload**: Supabase Storage integration
- **Blog Editor**: TipTap WYSIWYG editor in project detail pages
- **Undo/Redo**: Full history tracking for project changes

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 16.1.1 |
| React | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL) | - |
| Storage | Supabase Storage | - |
| Styling | CSS Modules | - |
| Drag & Drop | @dnd-kit | 6.3.1 |
| Rich Text | TipTap | 3.20.0 |
| Image Processing | Sharp | 0.34.4 |

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.90.1",
  "@supabase/ssr": "^0.8.0",
  "@dnd-kit/core": "^6.3.1",
  "@tiptap/react": "^3.20.0",
  "next": "16.1.1",
  "react": "19.2.3"
}
```

---

## Project Structure

```
Tedoori_web_v3/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # Root layout with providers
│   │   ├── page.tsx             # Home page (Header + ProjectGrid)
│   │   ├── globals.css          # Global styles
│   │   ├── projet/[id]/         # Dynamic project detail pages
│   │   │   └── page.tsx         # Project detail page
│   │   ├── about/               # About page (future: office info + map)
│   │   │   └── page.tsx
│   │   ├── login/               # Login page
│   │   │   └── page.tsx
│   │   └── api/                 # API routes
│   │       ├── projects/        # CRUD for projects
│   │       │   └── route.ts
│   │       ├── upload/          # Image upload to Supabase
│   │       │   └── route.ts
│   │       └── auth/            # Authentication endpoints
│   │           ├── check/route.ts
│   │           ├── login/route.ts
│   │           └── logout/route.ts
│   │
│   ├── components/              # React components
│   │   ├── Header.tsx          # Site header with nav
│   │   ├── ProjectGrid.tsx     # Grid view with drag-and-drop
│   │   ├── ProjectCard.tsx     # Individual project card
│   │   ├── ProjectDetail.tsx   # Project detail page (CRITICAL)
│   │   ├── ProjectDetailHeader.tsx
│   │   ├── BlogEditor.tsx      # TipTap rich text editor
│   │   └── BackToTop.tsx       # Scroll to top button
│   │
│   ├── context/                 # React Context providers
│   │   ├── ProjectContext.tsx  # Project state & CRUD operations
│   │   └── AdminContext.tsx    # Admin auth state
│   │
│   ├── data/                    # TypeScript types & interfaces
│   │   └── projects.ts         # Project interfaces (CRITICAL)
│   │
│   └── lib/                     # Utility libraries
│       ├── supabase/
│       │   ├── client.ts       # Browser Supabase client
│       │   └── server.ts       # Server Supabase client
│       └── db.ts               # Database query helpers
│
├── backup_YYYY-MM-DD/           # Backup directories (gitignored)
├── backup-storage.js            # Supabase Storage backup script
├── backup-database.js           # Supabase DB backup script
├── backup-full.bat              # Windows batch for full backup
├── restore-*.js                 # Content restoration scripts
├── package.json
├── .env.local                   # Environment variables (gitignored)
└── .env.local.example           # Example env file
```

### Critical Files

**MOST IMPORTANT FILES** to understand:
1. `src/components/ProjectDetail.tsx` - Main project detail page with blog editor
2. `src/app/api/projects/route.ts` - API for all CRUD operations
3. `src/data/projects.ts` - TypeScript interfaces
4. `src/context/ProjectContext.tsx` - Global state management
5. `src/context/AdminContext.tsx` - Authentication state

---

## Database Schema

### Supabase Tables

#### `projects` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Project identifier (e.g., "001", "042", "257") |
| `title` | TEXT | Project title |
| `slug` | TEXT | URL-friendly slug |
| `image_url` | TEXT | Cover image URL (Supabase Storage or external) |
| `link` | TEXT | Project detail page link (e.g., "/projet/001") |
| `details` | JSONB | Project metadata (see below) |
| `gallery_images` | JSONB | Array of gallery items |
| `is_visible` | TEXT | Visibility: 'public', 'team', 'private' |
| `display_order` | INTEGER | Order in grid (0 = first) |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-generated |

#### `details` JSONB Structure

The `details` column stores all project metadata as JSON:

```typescript
{
  // ProjectDetail fields
  year: string;              // e.g., "2023"
  location: string;          // e.g., "Seoul, South Korea"
  client: string;            // Client name
  mandataire: string;        // Main contractor
  partners?: string;         // Partner firms (optional)
  team?: string;            // Team members (optional)
  program: string;          // Project program/type
  area: string;             // Floor area (e.g., "1,200 m²")
  cost: string;             // Project cost
  mission: string;          // Mission type
  status: string;           // Project status (e.g., "completed in 2023")
  photographer: string;     // Photo credits

  // Blog content (CRITICAL)
  content?: string;         // HTML blog content (TipTap output)

  // Card display settings
  type?: 'project' | 'video' | 'memo';
  videoId?: string;         // YouTube video ID
  memoStyle?: MemoStyle;    // Memo card styling
  cardWidth?: number;       // Custom card width
  cardHeight?: number;      // Custom card height
  lockedAspectRatio?: boolean;
  showId?: boolean;         // Show ID on card
  showTitle?: boolean;      // Show title on card
  hasDetailLink?: boolean;  // Enable detail page link
  descriptionBlocks?: ContentBlock[];  // Legacy content blocks
}
```

#### `gallery_images` JSONB Structure

Array of gallery items (images, text, videos):

```typescript
type GalleryItem =
  | {
      type: 'image';
      id: string;
      src: string;
      width: number;
      height: number;
      alt: string;
      visibility?: 'public' | 'team' | 'private';
    }
  | {
      type: 'text';
      id: string;
      content: string;
      style?: MemoStyle;
    }
  | {
      type: 'video';
      id: string;
      src: string;        // Thumbnail URL
      videoId: string;    // YouTube video ID
    };
```

### Supabase Storage

**Bucket:** `project-images`
- Public read access
- Images uploaded via `/api/upload`
- URL format: `https://[project-id].supabase.co/storage/v1/object/public/project-images/[filename]`

---

## Key Components

### 1. ProjectDetail.tsx (CRITICAL)

**Location:** `src/components/ProjectDetail.tsx`

**Purpose:** Main component for project detail pages with:
- Project metadata display
- Image gallery
- **Blog content editor (TipTap)**
- Resizable panes (details/gallery)

**Critical Features:**
- **Blog Content Field Reference:** Always use `project.details?.content` (NOT `content_html`)
- **Save Function:** Must preserve all `details` fields when updating
- **Resize Logic:** Prevents jumping during pane resizing

**Common Bug:**
- ❌ Using `project.details?.content_html`
- ✅ Using `project.details?.content`

**Key State:**
```typescript
const [blogHtml, setBlogHtml] = useState(project.content || project.details?.content || '');
```

**Save Function Pattern:**
```typescript
const saveBlogContent = async () => {
  await updateProject({
    ...project,
    details: {
      // IMPORTANT: Preserve all existing fields
      year: project.details?.year || '',
      location: project.details?.location || '',
      // ... all other fields ...
      ...project.details,
      content: blogHtml  // Update content
    }
  });
};
```

### 2. ProjectGrid.tsx

**Location:** `src/components/ProjectGrid.tsx`

**Purpose:** Homepage grid with all projects

**Features:**
- Drag-and-drop reordering (@dnd-kit)
- Add/Edit modal
- Project type selector (project/video/memo)
- Image upload
- YouTube video detection
- Memo styling controls

**Admin Controls:**
- Add button (top-right, admin mode only)
- Drag handles (admin mode only)
- Edit modal on card click (admin mode only)

### 3. BlogEditor.tsx

**Location:** `src/components/BlogEditor.tsx`

**Purpose:** TipTap WYSIWYG editor

**Features:**
- Bold, italic, underline, strikethrough
- Headings (H1-H6)
- Text alignment
- Lists (ordered/unordered)
- Links, images
- Block quotes
- Horizontal rules
- Font family, text color, highlight
- Undo/redo

### 4. Header.tsx

**Location:** `src/components/Header.tsx`

**Features:**
- Site logo/title
- Navigation
- Admin mode toggle (if logged in)
- Undo/Redo buttons (admin mode)
- Login/Logout button

---

## API Routes

### `/api/projects` (GET)

**Purpose:** Fetch all projects

**Response:**
```typescript
Project[]  // Ordered by display_order
```

**Visibility Filtering:**
- Admin: Returns all projects
- Public: Filters out `is_visible='private'`

### `/api/projects` (POST)

**Purpose:** Create new project

**Request Body:**
```typescript
{
  id: string;           // Required
  title: string;        // Required
  imageUrl: string;     // Required (except for memo type)
  type?: 'project' | 'video' | 'memo';
  videoId?: string;
  content?: string;
  memoStyle?: MemoStyle;
  // ... other fields
}
```

**Process:**
1. Validates required fields
2. Auto-generates slug from title if not provided
3. Creates empty `details` object if missing
4. Assigns next `display_order` (max + 1)
5. Inserts into database
6. Returns saved project with generated fields

### `/api/projects` (PUT)

**Purpose:** Update existing project or reorder projects

**Two Modes:**

**1. Reorder (Array of Projects):**
```typescript
// Request: Project[]
// Updates display_order for all projects
```

**2. Update Single Project:**
```typescript
{
  id: string;
  originalId?: string;  // If ID changed
  // ... all project fields
}
```

**CRITICAL:** Content preservation
```typescript
// Only updates content if provided
...(project.content !== undefined && { content: project.content })
```

This prevents `undefined` from overwriting existing blog content when updating other fields.

### `/api/projects` (DELETE)

**Purpose:** Delete project

**Query Params:**
```
?id=<project-id>
```

### `/api/upload` (POST)

**Purpose:** Upload image to Supabase Storage

**Request:** `multipart/form-data` with file

**Validations:**
- File type: JPEG, PNG, GIF, WebP only
- Max size: 5MB
- Server-side compression (browser-image-compression)

**Response:**
```typescript
{
  url: string;  // Full Supabase Storage URL
}
```

### `/api/auth/login` (POST)

**Purpose:** Simple cookie-based authentication (temporary)

**Request:**
```typescript
{ password: string }
```

**Response:**
```typescript
{ success: true }  // Sets admin_token cookie
```

### `/api/auth/check` (GET)

**Purpose:** Check if admin cookie is set

**Response:**
```typescript
{ isAdmin: boolean }
```

### `/api/auth/logout` (POST)

**Purpose:** Clear admin cookie

**Response:**
```typescript
{ success: true }
```

---

## Authentication

**Current System:** Hybrid (Temporary + Future-Ready)

### Current Implementation

**1. Cookie-Based Auth (Simple)**
- Password check → Sets `admin_token` cookie
- Used as fallback when Supabase Auth is not available
- File: `src/app/api/auth/login/route.ts`

**2. Supabase Auth (Ready but Not Used)**
- OAuth/Email authentication ready
- Client: `src/lib/supabase/client.ts`
- Server: `src/lib/supabase/server.ts`

### Admin Context Flow

**File:** `src/context/AdminContext.tsx`

```typescript
// Auth check priority:
1. Check Supabase Auth user
2. Fallback to cookie check (admin_token)
3. If both fail → Not authenticated
```

### Admin Mode

- `isAdmin`: Whether user is authenticated
- `adminMode`: Whether admin features are active (toggle)
- Stored in `sessionStorage` to persist across page refreshes

**UI Behavior:**
- Login → Auto-enable admin mode
- Admin can toggle between admin/user view
- Undo/Redo only in admin mode
- Drag & drop only in admin mode

### Future: Proper Supabase Auth

**Recommended Implementation:**
1. Replace cookie auth with Supabase Auth
2. Implement Row Level Security (RLS) on `projects` table
3. Add OAuth providers (Google, GitHub, etc.)
4. Use `user.id` for ownership tracking

**RLS Example:**
```sql
-- Only show public projects to anonymous users
CREATE POLICY "Public projects are viewable by everyone"
ON projects FOR SELECT
USING (is_visible = 'public');

-- Admins can see everything
CREATE POLICY "Admins can do everything"
ON projects FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');
```

---

## State Management

### ProjectContext

**File:** `src/context/ProjectContext.tsx`

**Global State:**
```typescript
{
  projects: Project[];          // All projects
  loading: boolean;            // Fetch loading state
  error: string | null;        // Error messages

  // CRUD operations
  addProject: (project: Project) => Promise<void>;
  updateProject: (project: Project, originalId?: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  reorderProjects: (projects: Project[]) => Promise<void>;
  refreshProjects: () => Promise<void>;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Error handling
  clearError: () => void;
}
```

**History Tracking:**
- Maintains array of project states
- `historyIndex` tracks current position
- Auto-syncs with server on undo/redo (if admin)

**Optimistic Updates:**
- UI updates immediately
- Rolls back on API error

### AdminContext

**File:** `src/context/AdminContext.tsx`

**Global State:**
```typescript
{
  isAdmin: boolean;           // Authenticated?
  isLoading: boolean;         // Auth check in progress
  adminMode: boolean;         // Admin features active?

  login: () => void;
  logout: () => void;
  toggleAdminMode: () => void;
}
```

---

## Common Workflows

### 1. Creating a New Project

**Steps:**
1. Click "+ Add" button (admin mode)
2. Choose project type (project/video/memo)
3. Fill in ID and title
4. Upload image OR paste YouTube URL
5. Submit form

**API Flow:**
```
User submits → ProjectGrid.handleSave()
  ↓
addProject() → POST /api/projects
  ↓
Server validates, generates slug, assigns display_order
  ↓
Returns saved project with all fields
  ↓
ProjectContext updates state + history
```

### 2. Editing Project Metadata

**Steps:**
1. Click project card (admin mode)
2. Edit form opens with current values
3. Modify fields
4. Submit

**API Flow:**
```
User submits → ProjectGrid.handleSave()
  ↓
updateProject(project, originalId) → PUT /api/projects
  ↓
If ID changed: originalId used to find record
  ↓
Server updates all fields
  ↓
ProjectContext updates state + history
```

### 3. Editing Blog Content

**Steps:**
1. Navigate to project detail page
2. Toggle to admin mode
3. Edit blog content in TipTap editor
4. Click "Save Blog Content"

**API Flow:**
```
User clicks save → ProjectDetail.saveBlogContent()
  ↓
updateProject({ ...project, details: { ...details, content: blogHtml } })
  ↓
PUT /api/projects
  ↓
Server updates details.content field
```

**CRITICAL:**
- Always spread existing `details` fields
- Only update `content` field, preserve all others
- Use `project.details?.content` (NOT `content_html`)

### 4. Changing Project ID

**Special Case:** ID is the primary key

**Steps:**
1. Edit project
2. Change ID field
3. Submit

**API Flow:**
```
updateProject(newProject, oldId)
  ↓
PUT /api/projects with { ...newProject, originalId: oldId }
  ↓
Server uses originalId to find record, updates to new ID
  ↓
.eq('id', targetId)  // targetId = originalId
```

**IMPORTANT:** Content preservation
- Previously, changing ID would lose blog content
- **Fixed:** API now preserves `content` if not provided:
```typescript
...(project.content !== undefined && { content: project.content })
```

### 5. Reordering Projects

**Steps:**
1. Drag project card (admin mode)
2. Drop in new position

**API Flow:**
```
DragEnd event → ProjectGrid.handleDragEnd()
  ↓
arrayMove(projects, oldIndex, newIndex)
  ↓
reorderProjects(newProjects) → PUT /api/projects (array)
  ↓
Server batch updates display_order for all
```

### 6. Uploading Images

**Two Methods:**

**A. File Upload**
```
User selects file → handleFileUpload()
  ↓
Validates type and size (client-side)
  ↓
POST /api/upload with FormData
  ↓
Server compresses and uploads to Supabase Storage
  ↓
Returns public URL
  ↓
Sets imageUrl state
```

**B. YouTube URL**
```
User pastes YouTube URL → handleLinkChange()
  ↓
Extract video ID with regex
  ↓
Fetch video info from YouTube oEmbed API
  ↓
Set thumbnail URL, auto-fill title and ID
  ↓
Sets imageUrl and videoId state
```

### 7. Using Undo/Redo

**Steps:**
1. Make changes to projects (add/edit/delete/reorder)
2. Click Undo button in header
3. Click Redo to restore

**State Flow:**
```
Every project change adds to history:
history: [state0, state1, state2, state3]
                              ↑
                        historyIndex = 2

Undo:
- Decrease historyIndex → 1
- Set projects to history[1]
- Sync with server (PUT /api/projects)

Redo:
- Increase historyIndex → 2
- Set projects to history[2]
- Sync with server
```

**Limitations:**
- History cleared on page refresh
- Only tracks project list changes (not blog content)

---

## Backup System

### Why Backup?

- Supabase free tier doesn't include automatic backups
- Manual backups protect against:
  - Accidental deletions
  - Data corruption
  - Schema changes gone wrong

### Backup Scripts

**1. Database Backup**
```bash
npm run backup:db
# OR
node backup-database.js
```

- Exports `projects` table to JSON
- Saves to `backup_YYYY-MM-DD/projects.json`
- Includes all fields (details, gallery_images, etc.)

**2. Storage Backup**
```bash
npm run backup:storage
# OR
node backup-storage.js
```

- Downloads all files from `project-images` bucket
- Saves to `backup_YYYY-MM-DD/storage/`
- Preserves original filenames

**3. Full Backup**
```bash
npm run backup:full
# OR (Windows)
backup-full.bat
```

Runs both DB and storage backups sequentially.

### Restoration Scripts

**Created for specific recovery scenarios:**

- `restore-lost-content.js` - Restore blog content from backup
- `find-lost-projects.js` - Find projects with missing content
- `show-lost-content.js` - Preview content from backup
- `check-all-blog-content.js` - Compare current vs backup

**Example Usage:**
```javascript
// restore-lost-content.js
const lostIds = [
  { backupId: '4', currentId: '004', title: 'Project Name' },
  // Map old ID to new ID
];

// Reads backup JSON, finds content, updates Supabase
```

### Backup Best Practices

1. **Frequency:** Backup before major changes
2. **Storage:** Keep at least 3 recent backups
3. **Testing:** Periodically test restoration
4. **Automation:** Consider scheduled backups (cron/Task Scheduler)

---

## Known Issues & Solutions

### 1. Blog Content Disappearing

**Symptom:** After changing project ID, blog content (`details.content`) becomes NULL

**Root Cause:**
- Old code used `project.details.content_html` but data was in `project.details.content`
- API route updated `content: undefined` when field not provided

**Solution (Applied):**
```typescript
// In ProjectDetail.tsx
const [blogHtml, setBlogHtml] = useState(
  project.content || project.details?.content || ''  // ✅ Correct
  // NOT: project.details?.content_html  // ❌ Wrong
);

// In /api/projects PUT route
const detailsToSave = {
  ...(project.details || {}),
  // Only update content if provided
  ...(project.content !== undefined && { content: project.content }),
  // ... other fields
};
```

**Prevention:**
- Always spread existing `details` when updating
- Use optional chaining: `project.details?.content`
- Test ID changes before deployment

### 2. TypeScript Build Errors

**Symptom:** Vercel build fails with type errors

**Common Issues:**

**A. Missing Field in Interface**
```typescript
// Error: Property 'content' does not exist on type 'ProjectDetail'

// Solution: Add to interface in src/data/projects.ts
export interface ProjectDetail {
  // ... existing fields
  content?: string;  // Add this
}
```

**B. Type Mismatch in Details**
```typescript
// Error: Type '{ ... }' is not assignable to type 'ProjectDetail'

// Solution: Explicitly spread all fields
const updatedDetails: ProjectDetail = {
  year: project.details?.year || '',
  location: project.details?.location || '',
  // ... all required fields
  ...project.details,  // Then spread existing
  content: blogHtml    // Then override specific field
};
```

**Prevention:**
- Run `npm run build` locally before pushing
- Keep `ProjectDetail` interface complete

### 3. Supabase RLS Issues

**Symptom:** Private projects visible to public users

**Cause:** No Row Level Security policies set up

**Temporary Solution:**
- Manual filtering in API routes and db.ts
```typescript
if (!isAdmin) {
  query = query.neq('is_visible', 'private');
}
```

**Future Solution:**
- Implement proper RLS policies in Supabase dashboard

### 4. Middleware Conflicts

**Symptom:** Next.js middleware not working as expected

**Solution:**
- Renamed `src/middleware.ts` → `src/proxy.ts`
- Avoids conflicts with Next.js routing

### 5. Image Upload Timeout

**Symptom:** Large images fail to upload

**Solutions:**
- Client-side compression (browser-image-compression)
- 5MB file size limit
- Progress indicator for user feedback

### 6. Undo/Redo Not Syncing

**Symptom:** Undo works in UI but doesn't update database

**Cause:** Missing API call in undo/redo functions

**Solution:**
```typescript
const undo = useCallback(async () => {
  if (historyIndex > 0) {
    const newIndex = historyIndex - 1;
    const prevProjects = history[newIndex];
    setProjects(prevProjects);

    // IMPORTANT: Sync with server
    if (isAdmin) {
      await fetch('/api/projects', {
        method: 'PUT',
        body: JSON.stringify(prevProjects),
      });
    }
  }
}, [history, historyIndex, isAdmin]);
```

---

## Development Tips

### 1. Working with Blog Content

**Always:**
- Use `project.details?.content` (NOT `content_html`)
- Preserve all `details` fields when updating
- Test save/load cycle before deploying

**Never:**
- Overwrite `details` object without spreading
- Use hardcoded field references

### 2. Adding New Project Fields

**Steps:**
1. Update TypeScript interface in `src/data/projects.ts`
2. Update API routes (`GET`, `POST`, `PUT` in `/api/projects`)
3. Update database transformation in `src/lib/db.ts`
4. Update UI components to display/edit new field

**Example: Adding "architect" field**
```typescript
// 1. src/data/projects.ts
export interface ProjectDetail {
  // ... existing
  architect?: string;  // Add here
}

// 2. src/app/api/projects/route.ts (POST/PUT)
const detailsToSave = {
  ...(project.details || {}),
  architect: project.architect,  // Handle here
  // ...
};

// 3. src/lib/db.ts (GET transformations)
return {
  // ... existing
  architect: data.details?.architect,
};

// 4. src/components/ProjectDetail.tsx
<div>{project.details?.architect}</div>
```

### 3. Testing Changes Locally

**Before Pushing:**
```bash
# 1. Build check
npm run build

# 2. Test locally
npm run dev

# 3. Verify all features:
- Create project
- Edit project
- Change ID
- Save blog content
- Reorder
- Delete
- Undo/Redo
```

### 4. Debugging Database Issues

**Tools:**
```typescript
// Check what's actually in the database
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('id', 'project-id');
console.log('DB Data:', JSON.stringify(data, null, 2));
```

**Common Checks:**
- Is `details` object correct?
- Is `content` field present?
- Are all required fields populated?
- Is `display_order` unique?

### 5. Working with Supabase Storage

**Upload Pattern:**
```typescript
const { data, error } = await supabase.storage
  .from('project-images')
  .upload(fileName, file, {
    cacheControl: '3600',
    upsert: true  // Overwrite if exists
  });

if (error) throw error;

// Get public URL
const { data: urlData } = supabase.storage
  .from('project-images')
  .getPublicUrl(fileName);

return urlData.publicUrl;
```

**Delete Pattern:**
```typescript
const { error } = await supabase.storage
  .from('project-images')
  .remove([fileName]);
```

### 6. Handling Environment Variables

**Required in `.env.local`:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Access in Code:**
```typescript
// Client-side (components)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Server-side only (API routes)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

### 7. Common Git Workflow

```bash
# 1. Make changes

# 2. Test thoroughly
npm run build

# 3. Commit with descriptive message
git add .
git commit -m "Fix: Preserve blog content when changing project ID"

# 4. Push
git push origin main

# 5. Vercel auto-deploys
# Check build logs at vercel.com
```

### 8. Performance Optimization

**Image Loading:**
- Use Next.js `<Image>` component
- Set `unoptimized={true}` for Supabase Storage images
- Lazy load gallery images

**Data Fetching:**
- Use `revalidate = 0` for dynamic pages
- Consider ISR for static content
- Cache Supabase queries when appropriate

**Bundle Size:**
- TipTap extensions are tree-shakeable
- Only import needed extensions
- Check bundle with `npm run build -- --analyze`

### 9. Accessibility

**Current Status:** Needs improvement

**To Do:**
- Add ARIA labels to admin buttons
- Keyboard navigation for drag-and-drop
- Alt text for all images
- Focus management in modals
- Screen reader testing

### 10. Future Enhancements

**Planned:**
- Google Maps integration on About page
- Proper Supabase Auth (OAuth)
- Row Level Security (RLS)
- Image optimization pipeline
- Automated backups
- Analytics integration
- SEO optimization
- Multi-language support

**Nice to Have:**
- Project search/filter
- Bulk operations
- Export to PDF
- Version history for blog content
- Collaborative editing
- Mobile app

---

## Quick Reference

### File Path Cheat Sheet

| What You Need | File Path |
|---------------|-----------|
| Project types | `src/data/projects.ts` |
| API endpoints | `src/app/api/projects/route.ts` |
| Main grid | `src/components/ProjectGrid.tsx` |
| Detail page | `src/components/ProjectDetail.tsx` |
| Blog editor | `src/components/BlogEditor.tsx` |
| Global state | `src/context/ProjectContext.tsx` |
| Auth state | `src/context/AdminContext.tsx` |
| Database queries | `src/lib/db.ts` |
| Supabase client | `src/lib/supabase/client.ts` |
| Supabase server | `src/lib/supabase/server.ts` |

### Common Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Production build
npm start                      # Start production server

# Backups
npm run backup:db             # Backup database to JSON
npm run backup:storage        # Backup storage files
npm run backup:full           # Full backup (Windows)

# Utilities
npm run lint                  # Run ESLint
node find-lost-projects.js    # Find projects with missing content
node restore-lost-content.js  # Restore content from backup
```

### Environment Setup

**First Time Setup:**
```bash
# 1. Clone repo
git clone <repo-url>
cd Tedoori_web_v3

# 2. Install dependencies
npm install

# 3. Create .env.local (copy from .env.local.example)
# Add your Supabase credentials

# 4. Run development server
npm run dev

# 5. Access at http://localhost:3000
```

---

## Contact & Support

For questions about this documentation or the project:
- Check Git commit history for recent changes
- Review backup files for data recovery
- Test changes locally before deploying
- Keep backups before major updates

**Last Updated:** 2026-02-20
**Version:** 3.0.0

---

## Changelog

### 2026-02-20
- Fixed blog content disappearing bug
- Updated API to preserve content field
- Added comprehensive backup system
- Restored lost blog content for 7 projects
- Fixed TypeScript build errors
- Added this documentation

### Previous Changes
- See Git history for detailed commit log
