const users = [
  { identifier: 'admin@ksit.edu.kh', password: 'test123', role: 'admin' },
  { identifier: 'manager@ksit.edu.kh', password: 'test123', role: 'manager' },
  { identifier: 'sokha@ksit.edu.kh', password: 'test123', role: 'teacher' },
  { identifier: 'sophal@student.ksit.edu.kh', password: 'test123', role: 'student' }
];

async function runTests() {
  for (const user of users) {
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      const data = await res.json();
      console.log(`Login test for ${user.identifier} (${user.role}):`, data.success ? 'SUCCESS' : 'FAILED', data.error || '');
    } catch (err) {
      console.error(`Login error for ${user.identifier}:`, err.message);
    }
  }
}

runTests();
