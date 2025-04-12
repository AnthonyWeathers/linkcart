import { Outlet } from "react-router-dom";
import { useContext } from "react";

import { UserStatusContext } from "./UserStatusContext";

const ProtectedOnlineRoute = () => {
  const { isOnline } = useContext(UserStatusContext);

  return isOnline ? (
    <Outlet />
  ) : (
    <div className="offline">
      You are currently offline. Go online to access this page!
    </div>
  );
};
export default ProtectedOnlineRoute;
