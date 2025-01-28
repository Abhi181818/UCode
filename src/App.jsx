import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Auth from './components/Auth';
import Home from './pages/Home';
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider } from './context/AuthContext';

const App = () => {

  return (
    // <Router>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </AuthProvider>
    // </Router>
  );
};

export default App;