// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./LoginPage";
import RegisterPage from "./registerPage";
import CurrentUser from "./currentUser";
import { Link } from "react-router-dom";
import "./App.css";
import LoginForm from "./loginForm";
import Wallet from "./wallet"
import KeyTransactions from "./keyTransactions";

function App() {
  return (
    <Router>
      <div>
        <Link to="/currentUser">Current user</Link>
        <br />
        <Link to="/register">Register</Link>
        <br />
        <Link to="/login">Login</Link>
        <br />
        <Link to="/dashboard">Dashboard</Link>
        <br />
        <Link to="/loginNew">Login New</Link>
        <br />
        <Link to="/wallet">Wallet</Link>
        <br />
        <Link to="/keyTransactions">KeyTransactions</Link>
        <Routes>
          <Route path="/currentUser" element={<CurrentUser />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/loginNew" element={<LoginForm />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/keyTransactions" element={<KeyTransactions />} />
          
          {/* Default route */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
