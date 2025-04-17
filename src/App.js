import { useState, useEffect, useContext } from "react";
import { Route, Routes, Link, useLocation } from "react-router-dom";
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
import Logout from "./components/Logout";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedOnlineRoute from "./components/ProtectedOnlineRoute";
import { UserStatusContext } from "./components/UserStatusContext";
import { UserContext } from "./components/UserContext";
import { FriendRequestContext } from "./components/FriendRequestContext";

import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const { isOnline, syncStatus } = useContext(UserStatusContext);
  const { currentUser, setCurrentUser } = useContext(UserContext);
  const { pendingRequest, setPendingRequest } =
    useContext(FriendRequestContext);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/user/current-user",
          {
            method: "GET",
            credentials: "include",
          }
        );
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          setPendingRequest(data.hasNewRequests);
        } else {
          if (location.pathname !== "/login") {
            const errorData = await response.json();
            toast.error(errorData.error || "An unexpected error occurred");
            setCurrentUser(null);
          }
        }
      } catch (error) {
        toast.error("Error fetching current user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // useEffect(() => {
  //   socket.on("connect", () => console.log("Socket connected:", socket.id));
  //   socket.on("disconnect", (reason) =>
  //     console.log("Socket disconnected:", reason)
  //   );
  //   socket.on("manual-disconnect", (reason) => {
  //     console.log("Socket manual disconnected: ", reason);
  //   });
  //   socket.on("status_update", (data) => {
  //     console.log("Received status update:", data);
  //   });

  //   return () => {
  //     socket.off("connect");
  //     socket.off("disconnect");
  //     socket.off("manual-disconnect");
  //     socket.off("status_update");
  //   };
  // });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch {
        console.error(
          "Failed to refresh token. User may need to log in again."
        );
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const refreshToken = async () => {
    try {
      const response = await fetch("http://localhost:8000/token/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
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

  useEffect(() => {
    if (currentUser) {
      syncStatus();
    }
  }, [currentUser, syncStatus]);

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch("http://localhost:8000/profile/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        toast.info(data.message);

        setCurrentUser(null);
        setPendingRequest(false);

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

  const isOnOwnProfile = location.pathname === `/profile/${currentUser}`;

  return (
    <div className="block-container">
      <nav className="navbar">
        {currentUser && (
          <ul>
            {location.pathname !== "/" && (
              <li>
                <Link to="/">Add Product</Link>
              </li>
            )}

            {location.pathname !== "/saved-products" && (
              <li>
                <Link to="/saved-products">Saved Products</Link>
              </li>
            )}

            {isOnline && !isOnOwnProfile && (
              <li>
                <Link to={`/profile/${currentUser}`}>My Profile</Link>
              </li>
            )}

            {<StatusToggle />}

            {
              <li>
                <Logout />
              </li>
            }
          </ul>
        )}
      </nav>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/forgot-username" element={<ForgotUsername />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AddProduct />} />
              <Route path="/saved-products" element={<ProductList />} />

              {/* Protected + Online-Only Routes */}
              <Route element={<ProtectedOnlineRoute />}>
                <Route
                  path="/profile/:username"
                  element={
                    <Profile handleDeleteAccount={handleDeleteAccount} />
                  }
                />
                <Route path="/community" element={<Community />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/user-deleted" element={<UserDeleted />} />
              </Route>
            </Route>
          </Routes>

          <nav className="footer-navbar">
            <ul>
              {currentUser && isOnline && (
                <li>
                  <Link
                    to="/friends"
                    className={pendingRequest ? "highlight" : ""}
                  >
                    Friends
                  </Link>
                </li>
              )}

              {currentUser && isOnline && (
                <li>
                  <Link to="/community">Community</Link>
                </li>
              )}
            </ul>
          </nav>
        </>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
