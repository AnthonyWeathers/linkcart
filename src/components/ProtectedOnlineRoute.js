import { Outlet } from "react-router-dom";
import { useContext } from "react";

import { UserStatusContext } from "./UserStatusContext";

const ProtectedOnlineRoute = () => {
  const { isOnline } = useContext(UserStatusContext);
  // useEffect(() => {
  //   if (currentUser && isOnline) {
  //     navigate(window.location.pathname); // Refresh current route when switching online
  //   }
  // }, [isOnline]); // Runs when `isOnline` changes

  return isOnline ? (
    <Outlet />
  ) : (
    <div>
      You are currently offline. Switch to online to access this feature!
    </div>
  );
};
export default ProtectedOnlineRoute;
