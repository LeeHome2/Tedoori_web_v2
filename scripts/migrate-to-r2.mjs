/**
 * Migrate images from Supabase Storage to Cloudflare R2
 *
 * Usage: node scripts/migrate-to-r2.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function migrateImages() {
  console.log('Starting migration from Supabase to R2...\n');

  // 1. Get all projects with images
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, image_url, gallery_images');

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  console.log(`Found ${projects.length} projects\n`);

  const urlMapping = {}; // Old URL -> New URL mapping
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const project of projects) {
    console.log(`\n--- Project: ${project.title} (${project.id}) ---`);

    // Migrate main image
    if (project.image_url && project.image_url.includes('supabase')) {
      const newUrl = await migrateImage(project.image_url, urlMapping);
      if (newUrl) {
        migratedCount++;
      } else {
        errorCount++;
      }
    } else if (project.image_url) {
      console.log(`  Main image skipped (not Supabase)`);
      skippedCount++;
    }

    // Migrate gallery images (array of objects with src property)
    if (project.gallery_images && Array.isArray(project.gallery_images)) {
      for (const item of project.gallery_images) {
        // Handle both string URLs and object with src property
        const imgUrl = typeof item === 'string' ? item : item?.src;

        if (imgUrl && typeof imgUrl === 'string' && imgUrl.includes('supabase')) {
          const newUrl = await migrateImage(imgUrl, urlMapping);
          if (newUrl) {
            migratedCount++;
          } else {
            errorCount++;
          }
        } else if (imgUrl) {
          skippedCount++;
        }
      }
    }
  }

  console.log('\n\n========== MIGRATION SUMMARY ==========');
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('=========================================\n');

  // 2. Update database with new URLs
  if (Object.keys(urlMapping).length > 0) {
    console.log('\nUpdating database with new URLs...\n');

    for (const project of projects) {
      let updated = false;
      const updates = {};

      // Update main image
      if (project.image_url && urlMapping[project.image_url]) {
        updates.image_url = urlMapping[project.image_url];
        updated = true;
      }

      // Update gallery images (array of objects)
      if (project.gallery_images && Array.isArray(project.gallery_images)) {
        const newGallery = project.gallery_images.map(item => {
          if (typeof item === 'string') {
            return urlMapping[item] || item;
          } else if (item?.src && urlMapping[item.src]) {
            return { ...item, src: urlMapping[item.src] };
          }
          return item;
        });

        if (JSON.stringify(newGallery) !== JSON.stringify(project.gallery_images)) {
          updates.gallery_images = newGallery;
          updated = true;
        }
      }

      if (updated) {
        const { error: updateError } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', project.id);

        if (updateError) {
          console.error(`  Error updating project ${project.id}:`, updateError);
        } else {
          console.log(`  Updated project: ${project.title}`);
        }
      }
    }

    console.log('\nDatabase update complete!');
  }

  console.log('\n\nMigration finished!');
  console.log(`Total URL mappings: ${Object.keys(urlMapping).length}`);
}

async function migrateImage(supabaseUrl, urlMapping) {
  // Skip if already migrated
  if (urlMapping[supabaseUrl]) {
    console.log(`  Already migrated: ${supabaseUrl.substring(0, 60)}...`);
    return urlMapping[supabaseUrl];
  }

  try {
    // Extract filename from Supabase URL - handle nested paths
    const urlObj = new URL(supabaseUrl);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];

    console.log(`  Migrating: ${filename}`);

    // Download from Supabase
    const response = await fetch(supabaseUrl);
    if (!response.ok) {
      console.error(`    Failed to download: ${response.status}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    const newUrl = `${R2_PUBLIC_URL}/${filename}`;
    urlMapping[supabaseUrl] = newUrl;

    console.log(`    -> ${newUrl}`);
    return newUrl;
  } catch (error) {
    console.error(`    Error: ${error.message}`);
    return null;
  }
}

migrateImages().catch(console.error);
