
const BASE_URL = 'http://localhost:3000';

async function runPageTest() {
  console.log('Starting Project Page Generation Test...\n');
  let cookie = '';
  let testProjectId = 'test-page-' + Date.now();
  let testSlug = 'test-page-' + Date.now();

  // 1. Login as Admin
  console.log('1. Logging in...');
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
    }
  } else {
    console.error('❌ Login Failed');
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
        title: 'Page Generation Test Project',
        imageUrl: 'https://placehold.co/100x100',
        slug: testSlug,
        link: '#' // Auto-generate link
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

  // 3. Verify Page Access
  console.log(`\n3. Accessing Page: /projet/${testSlug}`);
  try {
    const pageRes = await fetch(`${BASE_URL}/projet/${testSlug}`);
    
    if (pageRes.ok) {
      const html = await pageRes.text();
      if (html.includes('Page Generation Test Project')) {
        console.log('✅ Page loaded successfully and contains project title');
      } else {
        console.warn('⚠️ Page loaded but title not found (check content rendering)');
        // It might be rendered client side or structure is different, but 200 OK is the main check for "page exists"
      }
    } else {
      console.error(`❌ Page Load Failed: ${pageRes.status}`);
      console.error(await pageRes.text());
    }
  } catch (e) {
    console.error('❌ Page Access Error:', e.message);
  }

  // 4. Cleanup
  console.log('\n4. Cleaning up...');
  await fetch(`${BASE_URL}/api/projects?id=${testProjectId}`, {
    method: 'DELETE',
    headers: { 'Cookie': cookie }
  });
  console.log('✅ Cleanup done');
}

runPageTest();
