import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config/firebase';
import axios from 'axios';

const LoginForm = () => {
  useEffect(() => {
    const unregister = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        await axios.post('http://localhost:3000/api/auth/sessionLogin', { idToken: token });
      }
    });
  
    return () => unregister();
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 🔐 Sign in via Firebase
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken(); // valid for 1hr
      localStorage.clear();
      localStorage.setItem('New Token', idToken);

      // 🍪 Send to backend to create session cookie
      await axios.post('http://localhost:3000/api/auth/sessionLogin', { idToken }, { withCredentials: true }); // upto 14 days (5days in this case)

      // ✅ Login success – you can redirect or load dashboard
      window.location.reload();
      
    } catch (err) {
      console.error('Login failed:', err);
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>Login</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <input
        type="email"
        value={email}
        placeholder="Email"
        onChange={e => setEmail(e.target.value)}
        required
      />
      <br />
      <input
        type="password"
        value={password}
        placeholder="Password"
        onChange={e => setPassword(e.target.value)}
        required
      />
      <br />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;