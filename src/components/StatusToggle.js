import { useContext } from "react";
import { UserStatusContext } from "./UserStatusContext";
import { UserContext } from "./UserContext";

function StatusToggle() {
  const { isOnline, toggleStatus } = useContext(UserStatusContext);
  const { currentUser } = useContext(UserContext);

  return (
    <li>
      <label>
        <input
          type="checkbox"
          checked={isOnline}
          onChange={toggleStatus}
          disabled={!currentUser}
        />
        Online
      </label>
    </li>
  );
}
export default StatusToggle;
