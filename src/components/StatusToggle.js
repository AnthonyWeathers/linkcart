import React, { useContext } from "react";
import { UserStatusContext } from "./UserStatusContext";

function StatusToggle({ currentUser }) {
  const { isOnline, toggleStatus } = useContext(UserStatusContext);
  
    return (
      <li>
        <label>
          <input
            type="checkbox"
            checked={isOnline}
            // onChange={handleToggle}
            onChange={toggleStatus}
            disabled={!currentUser} // Disable if no user is logged in
          />
          Online
          {/* {isOnline ? 'Online' : 'Offline'} */}
        </label>
      </li>
    );
}
export default StatusToggle  