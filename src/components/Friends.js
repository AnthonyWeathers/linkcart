import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Friends = ({ currentUser, handleRequestNotification }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch('http://localhost:8000/friends', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'  // This ensures cookies (like session cookies) are sent with the request
        });
        const result = await response.json();

        if (result.success) {
          setFriends(result.friends);
        } else {
          alert('Failed to load friends');
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    fetchFriends();
  }, []);

  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        const response = await fetch('http://localhost:8000/friend-requests', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'  // This ensures cookies (like session cookies) are sent with the request
        });
        const result = await response.json();

        if (result.success) {
          setFriendRequests(result.sender_usernames);
        } else {
          alert('Failed to load pending friend requests');
        }
      } catch (error) {
        console.error('Error fetching pending friend requests', error);
      }
    };

    fetchFriendRequests();
  }, []);

  const handleAcceptFriend = async (requester) => {
    try {
        const response = await fetch('http://localhost:8000/accept-friend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friend_username: requester }),
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            setFriendRequests((prev) => prev.filter((username) => username !== requester));
            setFriends((prev) => [...prev, result.friend]);
            handleRequestNotification();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error accepting friend:', error);
    }
};

const handleDeclineFriend = async (requester) => {
    try {
        const response = await fetch('http://localhost:8000/decline-friend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friend_username: requester }),
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            setFriendRequests((prev) => prev.filter((username) => username !== requester));
            handleRequestNotification();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error declining friend request:', error);
    }
};

  return (
    <div class='friends-page'>
      {friendRequests.length > 0 && (
        <div>
          <h2>Pending Friend Requests</h2>
          <ul>
            {friendRequests.map((requester) => (
              <li key={requester}>
                {/* requester would be username of each user that sent a request, as friendRequests would have been given
            a list of the usernames of the users */}
                <Link to={`/profile/${requester}`}>{requester}</Link>
                <div>
                  <button onClick={() => handleAcceptFriend(requester)}>Accept Request</button>
                  <button onClick={() => handleDeclineFriend(requester)}>Decline Request</button>
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
            <Link to={`/profile/${friend.username}`} key={friend.id}>
              <li>{friend.username}</li>
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