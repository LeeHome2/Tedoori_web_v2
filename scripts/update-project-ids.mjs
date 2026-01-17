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

async function updateProjectIds() {
  // Get all projects ordered by display_order
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  console.log(`Found ${projects.length} projects`);

  // Step 1: Change all IDs to temporary IDs
  console.log('\nStep 1: Changing to temporary IDs...');
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const tempId = `temp_${i}`;
    
    console.log(`  ${project.id} -> ${tempId}`);

    const { error: updateError } = await supabase
      .from('projects')
      .update({ id: tempId })
      .eq('id', project.id);

    if (updateError) {
      console.error(`Error updating to temp ID:`, updateError);
    }
  }

  // Step 2: Change temporary IDs to final sequential IDs
  console.log('\nStep 2: Changing to final IDs...');
  for (let i = 0; i < projects.length; i++) {
    const tempId = `temp_${i}`;
    const newId = i.toString();
    
    console.log(`  ${tempId} -> ${newId}`);

    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        id: newId,
        link: `/projet/${newId}`,
      })
      .eq('id', tempId);

    if (updateError) {
      console.error(`Error updating to final ID:`, updateError);
    }
  }

  console.log('\nDone!');
}

updateProjectIds().catch(console.error);
