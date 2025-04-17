import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import socket from "./socket";
import { UserContext } from "./UserContext";
import { FriendRequestContext } from "./FriendRequestContext";
import { toast } from "react-toastify";

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const { currentUser } = useContext(UserContext);
  const { setPendingRequest } = useContext(FriendRequestContext);

  useEffect(() => {
    const fetchFriendsAndFriendRequests = async () => {
      try {
        const response = await fetch("http://localhost:8000/friends/", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (response.ok) {
          const result = await response.json();
          setFriends(result.friends);
          setFriendRequests(result.friend_requests);
        } else {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to retrieve friends and friend requests."
          );
        }
      } catch (error) {
        console.error(
          "Error fetching pending friends and friend requests",
          error
        );
        alert(error.message);
      }
    };

    fetchFriendsAndFriendRequests();
  }, []);

  useEffect(() => {
    socket.on("new-friend-request", (data) => {
      console.log("Entered new-friend-request socket handler in profile page");
      if (data.receiver === currentUser) {
        setFriendRequests((prev) => {
          if (!prev.includes(data.requester)) {
            return [...prev, data.requester];
          }
          return prev;
        });
        setPendingRequest(true);
      }
    });
    socket.on("new-friend", (data) => {
      if (data.requester === currentUser) {
        setFriends((prev) => [...prev, data.receiver]);
      }
    });
    socket.on("removed-friend", (data) => {
      if (data.removed === currentUser) {
        setFriends((prev) => [...prev, data.remover]);
      }
    });

    return () => {
      socket.off("new-friend");
      socket.off("new-friend-request");
      socket.off("removed-friend");
    };
  }, [currentUser, friendRequests]);

  const handleAcceptFriend = async (requester) => {
    try {
      const response = await fetch(
        "http://localhost:8000/friends/accept-friend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friend_username: requester }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setFriendRequests((prev) =>
          prev.filter((username) => username !== requester)
        );
        setFriends((prev) => [...prev, result.friend]);
        setPendingRequest(false);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to accept friend request, try again later."
        );
      }
    } catch (error) {
      console.error("Error accepting friend:", error);
      alert(error.message);
    }
  };

  const handleDeclineFriend = async (requester) => {
    try {
      const response = await fetch(
        "http://localhost:8000/friends/decline-friend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friend_username: requester }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        setFriendRequests((prev) =>
          prev.filter((username) => username !== requester)
        );
        toast.success(result.message);
        setPendingRequest(false);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "Failed to decline friend request, try again later."
        );
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="friends-page">
      {friendRequests.length > 0 && (
        <div>
          <h2>Pending Friend Requests</h2>
          <ul>
            {friendRequests.map((requester) => (
              <li key={requester}>
                <Link className="username" to={`/profile/${requester}`}>
                  {requester}
                </Link>
                <div>
                  <button
                    className="request-btns"
                    onClick={() => handleAcceptFriend(requester)}
                  >
                    Accept Request
                  </button>
                  <button
                    className="request-btns"
                    onClick={() => handleDeclineFriend(requester)}
                  >
                    Decline Request
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>My Friends</h2>
      <ul>
        {friends && friends.length > 0 ? (
          friends.map((friend) => (
            <Link
              className="username"
              to={`/profile/${friend.username}`}
              key={friend.id}
            >
              <li className="friend-item">{friend.username}</li>
            </Link>
          ))
        ) : (
          <li>You have no friends currently</li>
        )}
      </ul>
    </div>
  );
};

export default Friends;
