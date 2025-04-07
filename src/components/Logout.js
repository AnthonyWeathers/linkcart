import { useContext } from "react";
import { UserContext } from "./UserContext";
import socket from "./socket";
import { toast } from "react-toastify";

const Logout = () => {
  const { setCurrentUser } = useContext(UserContext);
  const logout = async () => {
    try {
      const response = await fetch("http://localhost:8000/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setCurrentUser(null);

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

  return <button onClick={logout}>Logout</button>;
};

export default Logout;
