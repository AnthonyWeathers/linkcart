import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Friends = ({ currentUser }) => {
  const [friends, setFriends] = useState([]);

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

  return (
    <div>
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