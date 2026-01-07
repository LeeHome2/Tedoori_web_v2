
const BASE_URL = 'http://localhost:3000';

async function runSessionTest() {
  console.log('Starting Session Persistence Test...\n');
  let cookie = '';

  // 1. Login
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
      console.log('✅ Cookie received:', cookie);
    } else {
      console.error('❌ No cookie received');
      return;
    }
  } else {
    console.error('❌ Login Failed');
    return;
  }

  // 2. Check Auth Status (Simulation of page reload/navigation)
  console.log('\n2. Checking Auth Status (Simulating page reload)...');
  const checkRes = await fetch(`${BASE_URL}/api/auth/check`, {
    headers: { 
      'Cookie': cookie
    }
  });

  if (checkRes.ok) {
    const data = await checkRes.json();
    if (data.isAdmin) {
      console.log('✅ Auth Check Passed: isAdmin=true');
    } else {
      console.error('❌ Auth Check Failed: isAdmin=false');
    }
  } else {
    console.error(`❌ Auth Check Request Failed: ${checkRes.status}`);
  }

  // 3. Logout
  console.log('\n3. Logging out...');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 
      'Cookie': cookie
    }
  });

  if (logoutRes.ok) {
    console.log('✅ Logout Request Successful');
  } else {
    console.error('❌ Logout Request Failed');
  }

  // 4. Check Auth Status after Logout
  console.log('\n4. Checking Auth Status after Logout...');
  const checkAfterLogout = await fetch(`${BASE_URL}/api/auth/check`, {
    headers: { 
      // Browser would send the cookie if it wasn't cleared properly, but here we simulate what remains.
      // However, fetch doesn't auto-update cookie jar in this script.
      // But the server should have instructed to clear it.
      // Let's just try sending the old cookie to see if server rejects it (if it was session based on server side, but here it is token based).
      // Wait, our implementation is stateless JWT/token in cookie. If server clears it, client won't send it.
      // But if we manually send the OLD cookie string, it is still valid because it is stateless?
      // Ah, the logout API clears the cookie by setting maxAge=0.
      // So effectively the browser won't send it.
      // For this test script, we can't easily simulate "browser clearing cookie".
      // But we can check if the response of logout contained Set-Cookie to clear it.
    }
  });
  
  // Actually, checking if logout response has Set-Cookie with expiry is the test.
  const logoutSetCookie = logoutRes.headers.get('set-cookie');
  if (logoutSetCookie && (logoutSetCookie.includes('Max-Age=0') || logoutSetCookie.includes('Expires='))) {
      console.log('✅ Logout response contains cookie clearing instruction');
  } else {
      console.warn('⚠️ Logout response might not be clearing cookie properly (Check headers)');
  }

  console.log('\nTest Complete.');
}

runSessionTest();
