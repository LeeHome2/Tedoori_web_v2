-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  link TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  is_visible TEXT DEFAULT 'public' CHECK (is_visible IN ('public', 'team', 'private')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create an index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- Create an index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_projects_display_order ON projects(display_order);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view public projects
CREATE POLICY "Public projects are viewable by everyone"
  ON projects FOR SELECT
  USING (is_visible = 'public');

-- Policy: Authenticated users can view team projects
CREATE POLICY "Authenticated users can view team projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_visible IN ('public', 'team'));

-- Policy: Authenticated users can view all projects (including private)
CREATE POLICY "Authenticated users can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can insert
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can update
CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can delete
CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for project images
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Anyone can view public bucket files
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

-- Storage policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-images');

-- Storage policy: Authenticated users can update files
CREATE POLICY "Authenticated users can update images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-images');

-- Storage policy: Authenticated users can delete files
CREATE POLICY "Authenticated users can delete images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-images');
