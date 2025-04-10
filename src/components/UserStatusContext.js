import { createContext, useState, useEffect } from "react";
import socket from "./socket";

export const UserStatusContext = createContext();

export const UserStatusProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(false);

  const syncStatus = async () => {
    try {
      const response = await fetch("http://localhost:8000/auth/sync-status", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setIsOnline(data.isOnline);

        if (data.isOnline && !socket.connected) {
          socket.connect();
        } else if (!data.isOnline && socket.connected) {
          socket.emit("manual-disconnect");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Error syncing status:", error);
    }
  };

  const toggleStatus = async () => {
    try {
      if (!isOnline) {
        socket.connect();

        socket.once("connect", async () => {
          const response = await fetch(
            "http://localhost:8000/auth/sync-status",
            {
              method: "GET",
              credentials: "include",
            }
          );

          if (response.ok) {
            const data = await response.json();
            setIsOnline(data.isOnline);
          } else {
            console.error("Failed to sync status");
          }
        });
      } else {
        socket.emit("manual-disconnect");
        socket.disconnect();

        const response = await fetch("http://localhost:8000/auth/sync-status", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setIsOnline(data.isOnline);
        } else {
          console.error("Failed to sync status");
        }
      }
    } catch (error) {
      console.error("Error syncing status:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <UserStatusContext.Provider value={{ isOnline, toggleStatus, syncStatus }}>
      {children}
    </UserStatusContext.Provider>
  );
};
