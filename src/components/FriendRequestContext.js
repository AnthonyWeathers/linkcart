import { createContext, useState, useEffect, useContext } from "react";
import socket from "./socket";
import { UserContext } from "./UserContext";

export const FriendRequestContext = createContext();

export const FriendRequestProvider = ({ children }) => {
  const [pendingRequest, setPendingRequest] = useState(false);
  const { currentUser } = useContext(UserContext);

  useEffect(() => {
    socket.on("new-friend-request", (data) => {
      if (data.receiver === currentUser) {
        setPendingRequest(true);
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
