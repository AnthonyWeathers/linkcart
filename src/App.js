import React, { useState, useEffect, useContext } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import AddProduct from "./components/AddProduct";
import ProductList from "./components/ProductList";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Community from "./components/Community";
import Friends from "./components/Friends";
import socket from "./components/socket";
import StatusToggle from "./components/StatusToggle";
import UserDeleted from "./components/UserDeleted";
import ForgotUsername from "./components/ForgotUsername";
import ForgotPassword from "./components/ForgotPassword";
import { UserStatusContext } from "./components/UserStatusContext";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasNewRequests, setHasNewRequests] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { isOnline, syncStatus } = useContext(UserStatusContext);

  // Fetch the current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("http://localhost:8000/current-user", {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          setHasNewRequests(data.hasNewRequests);
        } else {
          const errorData = await response.json();
          alert(errorData.error || "An unexpected error occurred");
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Handle socket event listeners
  useEffect(() => {
    const handleStatusUpdate = (data) => {
      if (data.username === currentUser) {
        console.log(
          "currentUser online status becomes: ",
          currentUser,
          isOnline
        );
      }
    };

    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("disconnect", (reason) =>
      console.log("Socket disconnected:", reason)
    );
    socket.on("status_update", handleStatusUpdate);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("status_update", handleStatusUpdate);
    };
  }, [currentUser]);

  useEffect(() => {
    const handleReconnection = () => {
      console.log("Attempting to reconnect...");
    };

    const handleReconnect = () => {
      console.log("Reconnected successfully");
    };

    const handleReconnectError = (error) => {
      console.error("Reconnection failed:", error);
    };

    socket.on("reconnect_attempt", handleReconnection);
    socket.on("reconnect", handleReconnect);
    socket.on("reconnect_error", handleReconnectError);

    return () => {
      socket.off("disconnect");
      socket.off("reconnect_attempt", handleReconnection);
      socket.off("reconnect", handleReconnect);
      socket.off("reconnect_error", handleReconnectError);
    };
  }, []);

  useEffect(() => {
    // Listen for WebSocket events when a new friend request is received
    socket.on("new_friend_request", (data) => {
      console.log("Receiver user is: ", data.receiver_username);
      console.log("Sender user is: ", data.sender_username);
      if (data.receiver_username === currentUser) {
        setHasNewRequests(true);
      }
    });

    return () => {
      socket.off("new_friend_request");
    };
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch {
        console.error(
          "Failed to refresh token. User may need to log in again."
        );
      }
    }, 15 * 60 * 1000); // 15-minute interval

    return () => clearInterval(interval); // Clean up on unmount
  }, []);

  const refreshToken = async () => {
    try {
      const response = await fetch("http://localhost:8000/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        console.log("Token refreshed successfully");
        return true;
      } else {
        const errorData = await response.json();
        console.error(
          "Failed to refresh token:",
          errorData.error || "Unknown error"
        );
        return false;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      return false;
    }
  };

  const handleRequestNotification = () => {
    setHasNewRequests(false);
  };

  const handleSetCurrentUser = (user, onlineStatus) => {
    console.log("Logged in user is: ", user);
    setCurrentUser(user); // Set the logged-in user
  };

  useEffect(() => {
    console.log("attempting to sync status on user login");
    if (currentUser) {
      syncStatus(); // Sync online status after user logs in
    }
    // }, [currentUser, syncStatus]);
  }, [currentUser]);

  const logout = async () => {
    try {
      const response = await fetch("http://localhost:8000/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setCurrentUser(null);
        setHasNewRequests(false);

        if (socket.connected) {
          socket.disconnect();
        }
      } else {
        const errorData = await response.json();
        console.error("Error logging out:" || errorData.error);
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleDeleteAccount = async () => {
    // const confirmDelete = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
    // if (!confirmDelete) return;

    try {
      const response = await fetch("http://localhost:8000/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);

        setCurrentUser(null);
        setHasNewRequests(false);

        if (socket.connected) {
          socket.disconnect();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete account.");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert(error.message);
    }
  };

  // Helper Component: Ensures User is Logged In
  const ProtectedRoute = ({ element }) => {
    return currentUser ? element : <Navigate to="/login" />;
  };

  // Helper Component: Ensures User is Logged In AND Online
  const ProtectedOnlineRoute = ({ element }) => {
    // useEffect(() => {
    //   if (currentUser && isOnline) {
    //     navigate(window.location.pathname); // Refresh current route when switching online
    //   }
    // }, [isOnline]); // Runs when `isOnline` changes

    if (!currentUser) return <Navigate to="/login" />;
    if (!isOnline)
      return (
        <div>
          You are currently offline. Switch to online to access this feature!
        </div>
      );
    return element;
  };

  // Check if user is on their own profile
  const isOnOwnProfile = location.pathname === `/profile/${currentUser}`;

  return (
    <div className="block-container">
      <nav className="navbar">
        <ul>
          {/* Hide "Add Product" link if on Add Product page */}
          {currentUser && location.pathname !== "/" && (
            <li>
              <Link to="/">Add Product</Link>
            </li>
          )}

          {/* Hide "Saved Products" link if on Saved Products page */}
          {currentUser && location.pathname !== "/saved-products" && (
            <li>
              <Link to="/saved-products">Saved Products</Link>
            </li>
          )}

          {/* Show "My Profile" if user is not on their own profile */}
          {currentUser && isOnline && !isOnOwnProfile && (
            <li>
              <Link to={`/profile/${currentUser}`}>My Profile</Link>
            </li>
          )}

          {/* Checkbox to toggle online mode */}
          {currentUser && <StatusToggle currentUser={currentUser} />}

          {/* Logout button */}
          {currentUser && (
            <li>
              <button onClick={logout}>Logout</button>
            </li>
          )}
        </ul>
      </nav>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={<Login onLogin={handleSetCurrentUser} />}
            />
            <Route
              path="/register"
              element={<Register onRegister={handleSetCurrentUser} />}
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/forgot-username" element={<ForgotUsername />} />

            {/* Protected Routes (Requires Login) */}
            <Route
              path="/"
              element={
                <ProtectedRoute element={<AddProduct user={currentUser} />} />
              }
            />
            <Route
              path="/saved-products"
              element={
                <ProtectedRoute element={<ProductList user={currentUser} />} />
              }
            />

            {/* Protected + Online-Only Routes */}
            <Route
              path="/profile/:username"
              element={
                <ProtectedOnlineRoute
                  element={
                    <Profile
                      currentUser={currentUser}
                      handleRequestNotification={handleRequestNotification}
                      handleDeleteAccount={handleDeleteAccount}
                    />
                  }
                />
              }
            />
            <Route
              path="/community"
              element={
                <ProtectedOnlineRoute
                  element={<Community currentUser={currentUser} />}
                />
              }
            />
            <Route
              path="/friends"
              element={
                <ProtectedOnlineRoute
                  element={
                    <Friends
                      currentUser={currentUser}
                      handleRequestNotification={handleRequestNotification}
                    />
                  }
                />
              }
            />
            <Route
              path="/user-deleted"
              element={<ProtectedOnlineRoute element={<UserDeleted />} />}
            />
          </Routes>

          {/* Secondary Navbar */}
          <nav className="footer-navbar">
            <ul>
              {/* Friends page link */}
              {currentUser && isOnline && (
                <li>
                  <Link
                    to="/friends"
                    className={hasNewRequests ? "highlight" : ""}
                  >
                    Friends
                  </Link>
                </li>
              )}

              {/* Community page link */}
              {currentUser && isOnline && (
                <li>
                  <Link to="/community">Community</Link>
                </li>
              )}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

export default App;
