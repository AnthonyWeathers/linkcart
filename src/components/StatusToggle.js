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
          onChange={toggleStatus}
          disabled={!currentUser} // Disable if no user is logged in
        />
        Online
      </label>
    </li>
  );
}
export default StatusToggle;
