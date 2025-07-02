// src/LogoutButton.jsx
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "./config/firebase";

const LogoutButton = ({ onLogout }) => {
  const handleLogout = async () => {
    await signOut(auth);
    // only empty the user and not remove the key
    localStorage.setItem("user", JSON.stringify({}));
    localStorage.removeItem("token");
    if (onLogout) onLogout();
    window.location.reload(); // Optionally refresh the page or redirect
  };

  return (
    <button onClick={handleLogout} style={{ margin: 10 }} disabled={!auth.currentUser}>
      Logout
    </button>
  );
};

export default LogoutButton;