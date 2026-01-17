import { loadEnv } from './env.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

loadEnv();

function shortHash(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 10);
}

async function scrapeProject(url) {
  console.log(`Scraping: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  Failed: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const title = $('meta[property="og:title"]').attr('content') || 
                  $('title').text() || 
                  'Untitled';
    
    const images = [];
    
    // Get og:image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      images.push({ url: ogImage, type: 'og:image' });
    }
    
    // Get all images from content
    $('.article img, .entry-content img, .tt_article_useless_p_margin img').each((i, el) => {
      const src = $(el).attr('src');
      const srcset = $(el).attr('srcset');
      
      if (src && src.startsWith('http')) {
        images.push({ url: src, type: 'img:src' });
      }
      
      if (srcset) {
        const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
        urls.forEach(u => {
          if (u.startsWith('http')) {
            images.push({ url: u, type: 'img:srcset' });
          }
        });
      }
    });
    
    // Deduplicate images
    const uniqueImages = [];
    const seen = new Set();
    
    for (const img of images) {
      if (!seen.has(img.url)) {
        seen.add(img.url);
        uniqueImages.push(img);
      }
    }
    
    const slug = 'p-' + shortHash(url);
    
    return {
      url,
      slug,
      title: title.trim(),
      images: uniqueImages,
      selectedImages: uniqueImages.slice(0, 20), // Limit to first 20
    };
    
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return null;
  }
}

async function main() {
  const urlFile = process.argv[2];
  if (!urlFile) {
    console.error('Usage: node scrape-urls.mjs <url-file>');
    process.exit(1);
  }
  
  const outRoot = path.resolve(process.cwd(), 'assets');
  const scrapeRoot = path.join(outRoot, '_scrape');
  await fs.mkdir(scrapeRoot, { recursive: true });
  
  // Read URLs from file
  const content = await fs.readFile(urlFile, 'utf8');
  const urls = content.split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('http'));
  
  console.log(`Found ${urls.length} URLs to scrape\n`);
  
  const limit = pLimit(2); // 2 concurrent requests
  const results = [];
  
  for (const url of urls) {
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
    const project = await scrapeProject(url);
    if (project) {
      results.push(project);
    }
  }
  
  // Save to projects.json
  const outputPath = path.join(scrapeRoot, 'projects-new.json');
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf8');
  
  console.log(`\nCollected ${results.length} projects`);
  console.log(`Output: ${outputPath}`);
}

main().catch(console.error);
