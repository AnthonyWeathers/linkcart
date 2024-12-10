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

  const [isOnline, setIsOnline] = useState(false); // Track online/offline mode

  // Fetch the current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('http://localhost:8000/current-user', {
          method: 'GET',
          credentials: 'include', // Include credentials for session management
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user); // User info
          setHasNewRequests(data.hasNewRequests); // Set the initial friend request state from backend
        } else {
          // Parse JSON for error responses
          const errorData = await response.json();
          alert(errorData.error || "An unexpected error occurred");
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
    const handleConnection = async () => {
      if (isOnline && !socket.connected) {
        try {
          const response = await fetch('http://localhost:8000/current-user', {
            method: 'GET',
            credentials: 'include',
          });
          // const data = await response.json();
          if (response.ok) {
              const userData = await response.json();
              setCurrentUser(userData.user); // Assuming the response includes user data
              setHasNewRequests(userData.hasNewRequests); // Set the initial friend request state from backend
              socket.connect(); // HttpOnly cookie will handle auth automatically
          } else {
              setCurrentUser(null); // Assuming the response includes user data
              console.error('Unable to connect socket due to failed authentication');
          }
        } catch (error) {
            console.error('Error authenticating socket connection:', error);
        }
      } else if (!isOnline && socket.connected) {
        socket.disconnect(); // Disconnect the socket if going offline
      }
    };
  
    handleConnection();
  
    // Log socket connection
    socket.on('connect', () => {
      console.log('WebSocket connected', socket.id);
    });

    // Log socket disconnection
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  
    // Cleanup on component unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      if (socket.connected) {
        socket.disconnect(); // Ensure socket is disconnected
      }
      setIsOnline(false); // Ensure frontend state is consistent
    };
  }, [isOnline]);

  useEffect(() => {
    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Attempt reconnect if disconnected due to token issues
        socket.connect();
      }
    });

    const handleReconnection = () => {
        console.log('Attempting to reconnect...');
    };

    const handleReconnect = () => {
        console.log('Reconnected successfully');
    };

    const handleReconnectError = (error) => {
        console.error('Reconnection failed:', error);
    };

    socket.on('reconnect_attempt', handleReconnection);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_error', handleReconnectError);
  
    return () => {
      socket.off('disconnect');
      socket.off('reconnect_attempt', handleReconnection);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_error', handleReconnectError);
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

  const refreshToken = async () => {
    try {
      const response = await fetch('/refresh', {
        method: 'POST',
        credentials: 'include', // Include credentials for session management
        // headers: { 'Content-Type': 'application/json' },
      });
    
      if (response.ok) {
        console.log('Token refreshed successfully');
        return true; // Indicate token refresh success
      } else {
        const errorData = await response.json(); // Parse JSON for the error messages
        console.error('Failed to refresh token:', errorData.error || 'Unknown error');
        return false; // Indicate token refresh failure
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  };

  const handleRequestNotification = () => {
    setHasNewRequests(false);
  };

  const handleSetCurrentUser = (user, onlineStatus) => {
    setCurrentUser(user); // Set the logged-in user
    setIsOnline(onlineStatus); // Set the initial mode
    // if (onlineStatus && !socket.connected) {
    //   socket.connect();
    // }
  }

  const logout = async () => {
    try {
      const response = await fetch('http://localhost:8000/logout', {
        method: 'POST',
        credentials: 'include', // Include credentials for session management
      });
      // const data = await response.json();

      if (response.ok) {
        const data = await response.json();
        alert(data.message); // Optional: show a message to the user
        setCurrentUser(null); // Clear current user state
        setHasNewRequests(false); // Reset on logout
        setIsOnline(false); // sets status to offline for logged out user

        if (socket.connected) {
          socket.disconnect();
        }
      } else {
        const errorData = await response.json();
        console.error('Error logging out:' || errorData.error);
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
          {currentUser && isOnline && !isOnOwnProfile && (
            <li><Link to={`/profile/${currentUser}`}>My Profile</Link></li>
          )}

          {/* Checkbox to toggle online mode */}
          {currentUser && (
            <li>
              <label>
                <input type="checkbox" checked={isOnline} disabled={loading} />
                Online
              </label>
            </li>
          )
          // <StatusToggle currentUser={currentUser} isOnline={isOnline} setIsOnline={setIsOnline} />
          }
  
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
            <Route path="/login" element={<Login onLogin={handleSetCurrentUser} />} />
            <Route path="/register" element={<Register onRegister={handleSetCurrentUser} />} />

            {/* Routes for online community */}
            <Route path="/profile/:username" 
              element={
                isOnline
                ? currentUser 
                  ? <Profile currentUser={currentUser} handleRequestNotification={handleRequestNotification} /> 
                  : <Navigate to="/login" state={{ message: 'You must be online to access this page.' }} />
                : null
              } 
            />
            <Route
              path="/community"
              element={
                isOnline
                ? currentUser
                  ? <Community currentUser={currentUser} /> 
                  : <Navigate to="/login" state={{ message: 'You must be online to access this page.' }} />
                :null
              }
            />
            <Route
              path="/friends"
              element={
                isOnline 
                  ? currentUser 
                    ? <Friends currentUser={currentUser} handleRequestNotification={handleRequestNotification} /> 
                    : <Navigate to="/login" state={{ message: 'You must be online to access this page.' }} />
                  : null
              }              
            />
            {/* Dynamic route for private messaging between the current user and a friend */}
            {/* <Route path="/messages/:friendUsername" element={<PrivateMessages currentUser={currentUser} />} /> */}
          </Routes>

          {/* Secondary Navbar */}
          <nav className="footer-navbar">
            <ul>
              {/* Friends page link */}
              {currentUser && isOnline && (<li><Link to="/friends" className={hasNewRequests ? "highlight" : ""}>Friends</Link></li>)}

              {/* Community page link */}
              {currentUser & isOnline && (<li><Link to="/community">Community</Link></li>)}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

export default App;
