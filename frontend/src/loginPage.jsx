import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Firebase Auth login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Send ID token to backend
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();
      if (data.success) {
        // Save user info/token as needed
        //  (localStorage, context, etc.)
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", idToken);
        alert("Login successful!");
        navigate('/currentUser');
        // Redirect or update UI as needed
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ marginTop: 20 }}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
