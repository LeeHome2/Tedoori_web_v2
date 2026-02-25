-- Create essays table
CREATE TABLE IF NOT EXISTS essays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create news table
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Enable read access for all users" ON essays
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON news
  FOR SELECT USING (true);

-- Create policies for authenticated users (admin) to insert/update/delete
CREATE POLICY "Enable insert for authenticated users" ON essays
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON essays
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON essays
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON news
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON news
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON news
  FOR DELETE USING (auth.role() = 'authenticated');

-- Insert sample data for essays
INSERT INTO essays (title, content, date) VALUES
('On Structure and Space', 'Exploring the fundamental relationship between structural integrity and spatial experience in modern architecture...', '2024-03-15'),
('Materiality in Context', 'How local materials shape the identity of place and ground architecture in its specific environment...', '2024-01-20');

-- Insert sample data for news
INSERT INTO news (title, content, date) VALUES
('Exhibition: Modern Wood Architecture', 'Our project "Taehwagang Eco-Center" is currently featured in the Modern Wood Architecture exhibition at Seoul Hall of Urbanism.', '2024-02-10'),
('Award: Public Design 2023', 'NP2F has been awarded the Grand Prize in the 2023 Public Design Awards for our recent community center project.', '2023-12-05');
