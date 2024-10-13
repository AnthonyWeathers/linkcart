import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import AddProduct from './components/AddProduct';
import ProductList from './components/ProductList';
import Login from './components/Login';
import Register from './components/Register';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // To handle loading state

  // Fetch the current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('http://localhost:8000/current-user', {
          method: 'GET',
          credentials: 'include', // Include credentials for session management
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData.user); // Assuming the response includes user data
        } else {
          // Handle error or no user
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false); // Set loading to false once fetch is complete
      }
    };

    fetchCurrentUser();
  }, []);

  return (
    <Router>
      <div className='block-container'>
        {/* Navbar */}
        <nav className="navbar">
          <ul>
            {currentUser && <li><Link to="/">Add Product</Link></li>}
            {currentUser && <li><Link to="/saved-products">Saved Products</Link></li>}
            {currentUser && <li><Link to={`/profile/${currentUser.username}`}>My Profile</Link></li>}
            {!currentUser && <li><Link to={`/login`}>Login</Link></li>}
          </ul>
        </nav>

        {loading ? ( // Show loading state while fetching user
          <div>Loading...</div>
        ) : (
          <Routes>
            <Route path="/" element={currentUser ? <AddProduct user={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/saved-products" element={currentUser ? <ProductList user={currentUser} /> : <Navigate to="/login" />} />
            {/* Routes for login and register pages */}
            <Route path="/login" element={<Login onLogin={setCurrentUser} />} />
            <Route path="/register" element={<Register onRegister={setCurrentUser} />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
