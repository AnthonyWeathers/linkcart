import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { UserContext } from "./UserContext";
import { FriendRequestContext } from "./FriendRequestContext";
import socket from "./socket";
import { toast } from "react-toastify";

const Profile = ({ handleDeleteAccount }) => {
  const { currentUser } = useContext(UserContext);
  const { username } = useParams();
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [receivedRequest, setReceivedRequest] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [newDescription, setNewDescription] = useState("");

  const { setPendingRequest } = useContext(FriendRequestContext);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/profile/${username}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          setFavoriteProducts(userData.favoriteProducts);
          setIsFriend(userData.isFriend);
          setIsPending(userData.sentRequest);
          setReceivedRequest(userData.receivedRequest);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch user profile.");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        alert(error.message);
      }
    };

    fetchUserProfile();
    socket.on("new-friend-request", (data) => {
      if (data.receiver === currentUser && data.requester === username) {
        setReceivedRequest(true);
      }
    });

    socket.on("new-friend", (data) => {
      if (data.requester === currentUser && data.receiver === username) {
        setIsPending(false);
        setIsFriend(true);
      }
    });

    socket.on("declined-friend", (data) => {
      if (data.requester === currentUser && data.receiver === username) {
        setIsPending(false);
      }
    });

    return () => {
      socket.off("new-friend-request");
      socket.off("new-friend");
      socket.off("declined-friend");
    };
  }, [username, currentUser]);

  if (!user) {
    return <p>Loading...</p>;
  }

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://localhost:8000/profile/${username}/edit-description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ description: newDescription }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        // alert(data.message);
        setUser((prev) => ({ ...prev, description: data.description }));
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to edit description, try again later."
        );
      }
    } catch (error) {
      console.error("Error updating description:", error);
      alert(error.message);
    }
  };

  const handleCancel = () => {
    setNewDescription(user.description);
    setIsEditing(false);
  };

  const handleFriendRequest = async (friendUsername) => {
    try {
      const response = await fetch(
        "http://localhost:8000/friends/make-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ friend_username: friendUsername }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        // alert(result.message);
        setIsPending(true);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to send friend request, try again later."
        );
      }
    } catch (error) {
      console.error("Error adding friend:", error);
      alert(error.message);
    }
  };

  const handleAcceptFriend = async (friendUsername) => {
    try {
      const response = await fetch(
        "http://localhost:8000/friends/accept-friend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friend_username: friendUsername }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        // alert(result.message);
        setIsFriend(true);
        setReceivedRequest(false);
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

  const handleDeclineFriend = async (friendUsername) => {
    try {
      const response = await fetch(
        "http://localhost:8000/friends/decline-friend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friend_username: friendUsername }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        // alert(result.message);
        setReceivedRequest(false);
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

  const handleRemoveFriend = async (friendUsername) => {
    try {
      const response = await fetch(
        "http://localhost:8000/friends/remove-friend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friend_username: friendUsername }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        // alert(result.message || "Friend removed successfully!");
        setIsFriend(false);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to remove friend, try again later."
        );
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const confirmDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (!confirmDelete) return;
    handleDeleteAccount();
  };

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const Products = ({ products }) => {
    return (
      <div className={`favorited-product-container`}>
        {products
          .filter((product) => product !== "")
          .map((product) => (
            <div key={product.productId} className="favorited-product-item">
              <h2 className="product-name">{product.productName}</h2>
              <p className="product-url">
                URL:{" "}
                <a href={product.url} target="_blank" rel="noopener noreferrer">
                  {product.url}
                </a>
              </p>
              <p className="product-price">
                Price: {formatPrice(product.price)}
              </p>
              <p className="product-category">Category: {product.category}</p>
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className="profile">
      <div>
        <p className="username">{user.username}</p>
        {user.username !== currentUser &&
          (isFriend ? (
            <button onClick={() => handleRemoveFriend(user.username)}>
              Remove as Friend
            </button>
          ) : isPending ? (
            <div>Request pending</div>
          ) : receivedRequest ? (
            <div>
              <button
                className="request-btns"
                onClick={() => handleAcceptFriend(user.username)}
              >
                Accept Request
              </button>
              <button
                className="request-btns"
                onClick={() => handleDeclineFriend(user.username)}
              >
                Decline Request
              </button>
            </div>
          ) : (
            <button onClick={() => handleFriendRequest(user.username)}>
              Send Friend Request
            </button>
          ))}
      </div>

      <div className="description">
        <div className="description-header">
          <h4>Description</h4>
          {currentUser === username && (
            <div className="profile-btns">
              <button
                className="edit-description-btn"
                onClick={handleEditClick}
              >
                Edit Description
              </button>
              <button
                className="delete-account-btn"
                onClick={confirmDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows="4"
              cols="50"
            />
            <br />
            <div className="edit-description-form-btns">
              <button type="submit">Submit</button>
              <button type="button" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="description-text">
            {user.description || "This is the description/bio of user"}
          </p>
        )}
      </div>

      <div className="favorited-products">
        <h4 className="favorited-products-header">Favorited Products</h4>
        <Products products={favoriteProducts} />
      </div>
    </div>
  );
};

export default Profile;
