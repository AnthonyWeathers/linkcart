import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useLocation } from 'react-router-dom';
import AddProduct from './components/AddProduct';
import ProductList from './components/ProductList';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // To handle loading state
  const location = useLocation(); // Hook to get current route path

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

  const logout = async () => {
    try {
      const response = await fetch('http://localhost:8000/logout', {
        method: 'POST',
        credentials: 'include', // Include credentials for session management
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message); // Optional: show a message to the user
        setCurrentUser(null); // Clear current user state
      } else {
        console.error('Error logging out:', data.message);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <Router>
      <div className='block-container'>
        {/* Navbar */}
        <nav className="navbar">
        <ul>
            {/* Hide "Add Product" link if on Add Product page */}
            {currentUser && location.pathname !== '/' && (
              <li><Link to="/">Add Product</Link></li>
            )}

            {/* Hide "Saved Products" link if on Saved Products page */}
            {currentUser && location.pathname !== '/saved-products' && (
              <li><Link to="/saved-products">Saved Products</Link></li>
            )}

            {/* Show "My Profile" if user is not on their own profile */}
            {currentUser && !isOnOwnProfile && (
              <li><Link to={`/profile/${currentUser.username}`}>My Profile</Link></li>
            )}

            {/* Logout button */}
            {currentUser && <li><button onClick={logout}>Logout</button></li>}
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
            <Route path="/profile/:username" element={currentUser ? <Profile currentUser={currentUser} /> : <Navigate to="/login" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
