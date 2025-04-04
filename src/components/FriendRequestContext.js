import { createContext, useState, useEffect, useContext } from "react";
import socket from "./socket";
import { UserContext } from "./UserContext";

export const FriendRequestContext = createContext();

export const FriendRequestProvider = ({ children }) => {
  // make this a global pendingRequest where Friends will be yellow if user has a pending request to handle, until they
  // accept or decline all requests
  const [pendingRequest, setPendingRequest] = useState(false);
  const { currentUser } = useContext(UserContext);

  // Handle socket event listeners
  useEffect(() => {
    socket.on("new-friend-request", (data) => {
      if (data.receiver === currentUser) {
        setPendingRequest(true); // tells app to turn Friends link on bottom navbar to turn yellow
      }
    });

    return () => {
      socket.off("new-friend-request");
    };
  }, [currentUser]);

  return (
    <FriendRequestContext.Provider
      value={{ pendingRequest, setPendingRequest }}
    >
      {children}
    </FriendRequestContext.Provider>
  );
};
