const fetch = globalThis.fetch || require('node-fetch');

(async () => {
  const email = `testuser_${Math.random().toString(36).slice(2, 10)}@example.com`;
  const signupBody = {
    name: 'Test User',
    email,
    password: 'Test@1234'
  };

  try {
    const signupRes = await fetch('http://127.0.0.1:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupBody)
    });
    const signupText = await signupRes.text();
    console.log('SIGNUP STATUS', signupRes.status);
    console.log('SIGNUP BODY', signupText);

    if (!signupRes.ok) {
      process.exit(1);
    }

    const loginBody = {
      email,
      password: 'Test@1234'
    };
    const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody)
    });
    const loginText = await loginRes.text();
    console.log('LOGIN STATUS', loginRes.status);
    console.log('LOGIN BODY', loginText);

    if (!loginRes.ok) {
      process.exit(1);
    }
  } catch (error) {
    console.error('ERROR', error.message || error);
    process.exit(1);
  }
})();
