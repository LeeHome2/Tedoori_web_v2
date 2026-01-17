
const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('Starting Delete Functionality Test...\n');
  let cookie = '';
  let testProjectId = 'test-delete-' + Date.now();

  // 1. Login as Admin
  console.log('1. Testing Admin Login...');
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    
    if (loginRes.ok) {
      console.log('✅ Login Successful');
      const setCookie = loginRes.headers.get('set-cookie');
      if (setCookie) {
        cookie = setCookie.split(';')[0];
        console.log('✅ Cookie received:', cookie);
      } else {
        console.error('❌ No cookie received');
        return;
      }
    } else {
      console.error('❌ Login Failed:', await loginRes.text());
      return;
    }
  } catch (e) {
    console.error('❌ Login Error:', e.message);
    return;
  }

  // 2. Create Test Project
  console.log('\n2. Creating Test Project...');
  try {
    const createRes = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        id: testProjectId,
        title: 'Delete Test Project',
        imageUrl: 'https://placehold.co/100x100',
        slug: testProjectId,
        link: '#'
      }),
    });

    if (createRes.ok) {
      console.log('✅ Project Created:', testProjectId);
    } else {
      console.error('❌ Create Failed:', await createRes.text());
      return;
    }
  } catch (e) {
    console.error('❌ Create Error:', e.message);
    return;
  }

  // 3. Verify Creation
  console.log('\n3. Verifying Creation...');
  try {
    const listRes = await fetch(`${BASE_URL}/api/projects`);
    const projects = await listRes.json();
    const exists = projects.find(p => p.id === testProjectId);
    if (exists) {
      console.log('✅ Project found in list');
    } else {
      console.error('❌ Project NOT found in list');
      return;
    }
  } catch (e) {
    console.error('❌ List Error:', e.message);
    return;
  }

  // 4. Test Delete (Success Case)
  console.log('\n4. Testing Delete (Authorized)...');
  try {
    const deleteRes = await fetch(`${BASE_URL}/api/projects?id=${testProjectId}`, {
      method: 'DELETE',
      headers: { 
        'Cookie': cookie
      }
    });

    if (deleteRes.ok) {
      console.log('✅ Delete Request Successful (200 OK)');
    } else {
      console.error('❌ Delete Request Failed:', await deleteRes.text());
    }
  } catch (e) {
    console.error('❌ Delete Error:', e.message);
  }

  // 5. Verify Deletion
  console.log('\n5. Verifying Deletion...');
  try {
    const listRes = await fetch(`${BASE_URL}/api/projects`);
    const projects = await listRes.json();
    const exists = projects.find(p => p.id === testProjectId);
    if (!exists) {
      console.log('✅ Project successfully removed from list');
    } else {
      console.error('❌ Project STILL found in list');
    }
  } catch (e) {
    console.error('❌ List Error:', e.message);
  }

  // 6. Test Delete (Non-existent ID)
  console.log('\n6. Testing Delete Non-existent ID...');
  try {
    const deleteRes = await fetch(`${BASE_URL}/api/projects?id=${testProjectId}`, {
      method: 'DELETE',
      headers: { 
        'Cookie': cookie
      }
    });

    if (deleteRes.status === 404) {
      console.log('✅ Correctly returned 404 for non-existent ID');
    } else {
      console.error(`❌ Expected 404, got ${deleteRes.status}`);
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  // 7. Test Delete (Unauthorized)
  console.log('\n7. Testing Delete Without Auth...');
  try {
    const deleteRes = await fetch(`${BASE_URL}/api/projects?id=320`, { // Try to delete existing one
      method: 'DELETE'
      // No cookie
    });

    if (deleteRes.status === 401) {
      console.log('✅ Correctly returned 401 Unauthorized');
    } else {
      console.error(`❌ Expected 401, got ${deleteRes.status}`);
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  console.log('\nTest Complete.');
}

runTest();
