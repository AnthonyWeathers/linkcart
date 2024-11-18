import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useLocation } from 'react-router-dom';
import AddProduct from './components/AddProduct';
import ProductList from './components/ProductList';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Community from './components/Community';
import Friends from './components/Friends';
import socket from './components/socket';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // To handle loading state
  const [hasNewRequests, setHasNewRequests] = useState(false); // Friend Request pending state
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
          setHasNewRequests(userData.hasNewRequests); // Set the initial friend request state from backend
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

  useEffect(() => {
    // Connect the socket if it's not already connected
    if (!socket.connected) {
        socket.connect();
        console.log('WebSocket connected from App.js');
    }

    socket.on('connect', () => {
        console.log('WebSocket connected', socket.id);
    });

    // Cleanup on component unmount
    return () => {
        socket.off('connect'); // Remove the connect listener
        socket.disconnect(); // Optionally disconnect on unmount
    };
}, []);

  useEffect(() => {
    // Listen for WebSocket events when a new friend request is received
    socket.on('new_friend_request', (data) => {
      // currentUser is only username
      console.log('Receiver user is: ', data.receiver_username)
      console.log('Sender user is: ', data.sender_username)
      if (data.receiver_username === currentUser) {
        setHasNewRequests(true);
      }
    });

    // Cleanup WebSocket listener on unmount
    return () => {
      socket.off('new_friend_request');
    };
  }, [currentUser]);

  // Function to update friend request state
  // const handleNewRequest = () => {
  //   setHasNewRequests(true);
  // };

  const handleRequestNotification = () => {
    setHasNewRequests(false);
  };

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
        setHasNewRequests(false); // Reset on logout

        if (socket.connected) {
          socket.disconnect();
        }
      } else {
        console.error('Error logging out:', data.message);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Check if user is on their own profile
  const isOnOwnProfile = location.pathname === `/profile/${currentUser}`;

  return (
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
            <li><Link to={`/profile/${currentUser}`}>My Profile</Link></li>
          )}
  
          {/* Logout button */}
          {currentUser && <li><button onClick={logout}>Logout</button></li>}
        </ul>
      </nav>
  
      {loading ? ( // Show loading state while fetching user
        <div>Loading...</div>
      ) : (
        <>
          <Routes>
            <Route path="/" element={currentUser ? <AddProduct user={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/saved-products" element={currentUser ? <ProductList user={currentUser} /> : <Navigate to="/login" />} />
            {/* Routes for login and register pages */}
            <Route path="/login" element={<Login onLogin={setCurrentUser} />} />
            <Route path="/register" element={<Register onRegister={setCurrentUser} />} />
            {/* <Route path="/profile/:username" element={currentUser ? <Profile currentUser={currentUser} handleNewRequest={handleNewRequest} /> : <Navigate to="/login" />} /> */}
            <Route path="/profile/:username" element={currentUser ? <Profile currentUser={currentUser} handleRequestNotification={handleRequestNotification} /> : <Navigate to="/login" />} />
            <Route path="/community" element={currentUser ? <Community currentUser={currentUser} /> : <Navigate to='/login' />} />
            <Route path="/friends" element={currentUser ? <Friends currentUser={currentUser} handleRequestNotification={handleRequestNotification} /> : <Navigate to='/login'/>} />
            {/* Dynamic route for private messaging between the current user and a friend */}
            {/* <Route path="/messages/:friendUsername" element={<PrivateMessages currentUser={currentUser} />} /> */}
          </Routes>

          {/* Secondary Navbar */}
          <nav className="footer-navbar">
            <ul>
              {/* Friends page link */}
              {currentUser && (<li><Link to="/friends" className={hasNewRequests ? "highlight" : ""}>Friends</Link></li>)}

              {/* Community page link */}
              {currentUser && (<li><Link to="/community">Community</Link></li>)}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

export default App;
