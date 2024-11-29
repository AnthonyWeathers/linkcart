import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // Hook to access URL params

const Profile = ({ currentUser, handleNewRequest, handleRequestNotification }) => {
    const { username } = useParams(); // Get the username from the URL
    const [favoriteProducts, setFavoriteProducts] = useState([]);
    const [user, setUser] = useState(null);
    const [isFriend, setIsFriend] = useState(false); // New state for friend status
    const [isPending, setIsPending] = useState(false) // New state for pending friend request status
    const [receivedRequest, setReceivedRequest] = useState(false); // New state for received friend request

    const [isEditing, setIsEditing] = useState(false); // State for editing mode
    const [newDescription, setNewDescription] = useState(''); // State for new description

    // Fetch the user profile and favorite products based on the username
    useEffect(() => {
        // Simulate a fetch call to get the user's profile
        const fetchUserProfile = async () => {
            try {
                const response = await fetch(`http://localhost:8000/user/${username}`, {
                    method: 'GET',
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });
                const userData = await response.json();
                setUser(userData.user);
                setFavoriteProducts(userData.favoriteProducts);
                setIsFriend(userData.isFriend); // Set friend status from backend
                setIsPending(userData.sentRequest) // If current user has sent a pending friend request to other user
                setReceivedRequest(userData.receivedRequest) // If current user had received a friend request from user of profile they're viewing
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        };

        fetchUserProfile();
    }, [username]); // Re-fetch when the username changes

    if (!user) {
        return <p>Loading...</p>; // Display a loading state while fetching
    }

    // Handle edit button click
    const handleEditClick = () => {
        setIsEditing(true);
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
        const response = await fetch(`http://localhost:8000/user/${username}/edit-description`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({ description: newDescription }),
            credentials: 'include'
        });
        const data = await response.json();
        if (response.ok) {
            setUser((prev) => ({ ...prev, description: newDescription })); // Update user description locally
            setIsEditing(false); // Exit editing mode
        } else {
            console.error('Failed to update description:', data.message);
        }
        } catch (error) {
        console.error('Error updating description:', error);
        }
    };

    // Handle cancel button click
    const handleCancel = () => {
        setNewDescription(user.description); // Reset to original description
        setIsEditing(false);
    };

    const handleAddFriend = async (friendUsername) => {
        try {
          const response = await fetch('http://localhost:8000/add-friend', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ friend_username: friendUsername }),
            credentials: 'include'
          });
          const result = await response.json();
      
          if (result.success) {
            alert('Friend added successfully!');
            setIsFriend(true);
          } else {
            alert(result.message);
          }
        } catch (error) {
          console.error('Error adding friend:', error);
        }
    };

    const handleFriendRequest = async (friendUsername) => {
        try {
          const response = await fetch('http://localhost:8000/make-request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ friend_username: friendUsername }),
            credentials: 'include'
          });
          const result = await response.json();
      
          if (result.success) {
            alert(result.message);
            setIsPending(true)
          } else {
            alert(result.message);
          }
        } catch (error) {
          console.error('Error adding friend:', error);
        }
    };

    const handleAcceptFriend = async (friendUsername) => {
        try {
            const response = await fetch('http://localhost:8000/accept-friend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friend_username: friendUsername }),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message);
                setIsFriend(true);
                setReceivedRequest(false);
                handleRequestNotification();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error accepting friend:', error);
        }
    };
    
    const handleDeclineFriend = async (friendUsername) => {
        try {
            const response = await fetch('http://localhost:8000/decline-friend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friend_username: friendUsername }),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message);
                setReceivedRequest(false);
                handleRequestNotification();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error declining friend request:', error);
        }
    };    

    const handleRemoveFriend = async (friendUsername) => {
        try {
            const response = await fetch('http://localhost:8000/remove-friend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friend_username: friendUsername }),
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                alert('Friend removed successfully!');
                setIsFriend(false); // Update to reflect unfriend status
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    const Products = ({ products }) => {
        return (
            <div>
                {products
                    .filter(product => product !== '') // Exclude empty spots
                    .map(product => (
                        <div key={product.productId}>
                            <h2>{product.productName}</h2>
                            <p>URL: {product.url}</p>
                            <p>Price: {product.price}</p>
                            <p>Category: {product.category}</p>
                        </div>
                ))}
            </div>
        );
      };

    return (
        <div className='profile'>
            <div>
                <p className='username'>{user.username}</p>
                {user.username !== currentUser && (
                    isFriend ? (
                        <button onClick={() => handleRemoveFriend(user.username)}>Remove as Friend</button>
                    ) : isPending ? (
                        <div>Request pending</div>
                    ) : receivedRequest ? (
                        <div>
                            <button className='request-btns' onClick={() => handleAcceptFriend(user.username)}>Accept Request</button>
                            <button className='request-btns' onClick={() => handleDeclineFriend(user.username)}>Decline Request</button>
                        </div>
                    ) : (
                        <button onClick={() => handleFriendRequest(user.username)}>Send Friend Request</button>
                    )
                )}
            </div>

            <div>
            <div className="description-header">
                <h4>Description</h4>
                {/* Show Edit Description if current user is viewing their own profile */}
                {currentUser === username && (
                    <button className='edit-description-btn' onClick={handleEditClick}>Edit Description</button>
                )}
            </div>

                {/* Show the form if user is editing, otherwise show the description */}
                {isEditing ? (
                    <form onSubmit={handleSubmit}>
                        <textarea
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            rows="4"
                            cols="50"
                        />
                        <br />
                        <button type="submit">Submit</button>
                        <button type="button" onClick={handleCancel}>Cancel</button>
                    </form>
                ) : (
                    <p className='description'>{user.description || "This is the description/bio of user"}</p>
                )}
            </div>

            <div>
                <h4>Favorited Products</h4>
                <Products products={favoriteProducts}/>
            </div>
        </div>
    );
}

export default Profile;