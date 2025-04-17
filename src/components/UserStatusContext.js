import { createContext, useState, useEffect } from "react";
import socket from "./socket";
import { toast } from "react-toastify";

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
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to sync status for user");
      }
    } catch (error) {
      toast.error("Error syncing status:", error);
    }
  };

  const toggleStatus = async () => {
    if (!isOnline) {
      socket.connect();
    } else {
      socket.emit("manual-disconnect", (response) => {
        console.log("manual-disconnect response: ", response);
        socket.disconnect();
      });
    }
  };

  const changeStatus = (data) => {
    setIsOnline(data.isOnline);
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("go-online");
    });

    socket.on("server_ready", (data) => {
      console.log("Server acknowledged connect:", data);
    });

    socket.on("server_disconnect", (data) => {
      console.log("Server is now starting to disconnect", data);
    });

    socket.on("disconnect", (reason) =>
      console.log("Socket disconnected:", reason)
    );

    socket.on("status_update", (data) => {
      console.log("Received status update:", data);
      changeStatus(data);
    });

    socket.on("connect_error", (err) => {
      console.log("Connection error:", err);
    });
    return () => {
      if (socket.connected) {
        console.log("Cleaning up socket on unmount");
        socket.disconnect();
      }
      socket.off("connect");
      socket.off("disconnect");
      socket.off("status_update");
      socket.off("connect_error");
      socket.off("server_ready");
    };
  }, []);

  return (
    <UserStatusContext.Provider value={{ isOnline, toggleStatus, syncStatus }}>
      {children}
    </UserStatusContext.Provider>
  );
};
