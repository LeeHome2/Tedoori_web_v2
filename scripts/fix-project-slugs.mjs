import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fixProjectSlugs() {
  // Get all projects ordered by display_order
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  console.log(`Found ${projects.length} projects\n`);

  // Step 1: Change all slugs to temporary values
  console.log('Step 1: Changing to temporary slugs...');
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const tempSlug = `temp_slug_${i}`;
    
    console.log(`  ${project.id}: "${project.slug}" -> "${tempSlug}"`);

    const { error: updateError } = await supabase
      .from('projects')
      .update({ slug: tempSlug })
      .eq('id', project.id);

    if (updateError) {
      console.error(`Error updating:`, updateError);
    }
  }

  // Step 2: Change temporary slugs to final ID-based slugs
  console.log('\nStep 2: Changing to final slugs...');
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const tempSlug = `temp_slug_${i}`;
    const finalSlug = project.id;
    
    console.log(`  ${project.id}: "${tempSlug}" -> "${finalSlug}"`);

    const { error: updateError } = await supabase
      .from('projects')
      .update({ slug: finalSlug })
      .eq('id', project.id);

    if (updateError) {
      console.error(`Error updating:`, updateError);
    }
  }

  console.log('\nDone!');
}

fixProjectSlugs().catch(console.error);
