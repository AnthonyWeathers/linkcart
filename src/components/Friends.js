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

        if (response.ok) {
          const result = await response.json();
          setFriends(result.friends);
        } else {
          const result = await response.json();
          alert(result.error);
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

        if (response.ok) {
          const result = await response.json();
          setFriendRequests(result.sender_usernames);
        } else {
          const result = await response.json();
          alert(result.error);
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
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            setFriendRequests((prev) => prev.filter((username) => username !== requester));
            setFriends((prev) => [...prev, result.friend]);
            handleRequestNotification();
        } else {
            const result = await response.json();
            alert(result.error);
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
        
        if (response.ok) {
            const result = await response.json();
            setFriendRequests((prev) => prev.filter((username) => username !== requester));
            alert(result.message)
            handleRequestNotification();
        } else {
            const result = await response.json();
            alert(result.error);
        }
    } catch (error) {
        console.error('Error declining friend request:', error);
    }
};

  return (
    <div className='friends-page'>
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
                  <button className='request-btns' onClick={() => handleAcceptFriend(requester)}>Accept Request</button>
                  <button className='request-btns' onClick={() => handleDeclineFriend(requester)}>Decline Request</button>
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