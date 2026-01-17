# Tedoori Web v3 - Supabase Setup Guide

This version uses Supabase for authentication, database, and file storage instead of local JSON files.

## Features

- ✅ Supabase Authentication (Email/Password)
- ✅ PostgreSQL Database
- ✅ File Storage (Images)
- ✅ Row Level Security (RLS)
- ✅ Works on Vercel (serverless-compatible)

## Prerequisites

- Node.js 18+
- Supabase account (free tier available)

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Project Name**: tedoori-web (or any name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project to finish setting up (~2 minutes)

### 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, click **Settings** (gear icon)
2. Go to **API** section
3. You'll see:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`)

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### 4. Create Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

This creates:
- `projects` table with all necessary columns
- Row Level Security policies
- `project-images` storage bucket
- Storage policies

### 5. Create Your Admin User

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter:
   - **Email**: your-email@example.com
   - **Password**: Choose a strong password
   - **Auto Confirm User**: Enable this checkbox
4. Click **Create user**

### 6. Install Dependencies and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### 7. Test Login

1. Open [http://localhost:3000/login](http://localhost:3000/login)
2. Login with the email/password you created
3. You should be redirected to the home page
4. Click "Switch to Admin Mode" to start managing projects

## Migrating Data from v2

If you have existing projects in `src/data/projects.json`, you need to import them:

### Option 1: Manual Import via Supabase Dashboard

1. Go to **Table Editor** → **projects** table
2. Click **Insert** → **Insert row**
3. Fill in the data for each project

### Option 2: SQL Import Script

1. Open `src/data/projects.json`
2. For each project, create an INSERT statement:

```sql
INSERT INTO projects (id, title, slug, image_url, link, details, gallery_images, is_visible, display_order)
VALUES (
  '320',
  'ADIDAS Arena',
  'adidas-arena',
  'https://placehold.co/600x400?text=ADIDAS+Arena',
  '/projet/adidas-arena',
  '{}'::jsonb,
  '[]'::jsonb,
  'public',
  0
);
```

3. Run in SQL Editor

## Storage Setup for Images

### Upload Images to Supabase Storage

1. In Supabase dashboard, go to **Storage**
2. Click on **project-images** bucket
3. Upload your images
4. Copy the public URL
5. Use this URL in your project's `imageUrl` field

### Image URL Format

```
https://your-project-id.supabase.co/storage/v1/object/public/project-images/your-image.jpg
```

## Deployment to Vercel

1. Push your code to GitHub
2. In Vercel, import your repository
3. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

Your admin features will now work in production because data is stored in Supabase, not local files.

## Troubleshooting

### "Failed to fetch projects"
- Check that your `.env.local` file has correct Supabase credentials
- Make sure you ran the `supabase-schema.sql` script
- Check Supabase dashboard for any errors

### "Unauthorized" when trying to add/edit projects
- Make sure you're logged in
- Check that your user was created in Supabase Authentication
- Verify RLS policies were created correctly

### Images not showing
- Make sure the `project-images` bucket exists in Supabase Storage
- Check that the bucket is set to **public**
- Verify storage policies allow public read access

## Database Schema

```
projects
├── id (text, primary key)
├── title (text)
├── slug (text, unique)
├── image_url (text)
├── link (text)
├── details (jsonb)
├── gallery_images (jsonb)
├── is_visible (text) - 'public' | 'team' | 'private'
├── display_order (integer)
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Security Notes

- Row Level Security (RLS) is enabled by default
- Only authenticated users can add/edit/delete projects
- Public users can only view projects where `is_visible = 'public'`
- Never commit your `.env.local` file to Git
- The `service_role` key has full database access - keep it secret!

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
