import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // Hook to access URL params

const Profile = ({ currentUser }) => {
    const { username } = useParams(); // Get the username from the URL
    const [favoriteProducts, setFavoriteProducts] = useState([]);
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false); // State for editing mode
    const [newDescription, setNewDescription] = useState(''); // State for new description

    // Fetch the user profile and favorite products based on the username
    useEffect(() => {
        // Simulate a fetch call to get the user's profile
        const fetchUserProfile = async () => {
            try {
                const response = await fetch(`http://localhost:8000/user/${username}`);
                const userData = await response.json();
                setUser(userData.user);
                setFavoriteProducts(userData.favoriteProducts);
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

    const Products = ({ products }) => {
        return (
            <div>
                {products
                    .filter(product => product !== '') // Exclude empty spots
                    .map(product => ( // add a line here to show the favorited status of each product, start as just a line, later maybe a star
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
            </div>

            <div>
                <h4>Description</h4>

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
                    <>
                        <p className='description'>{user.description || "This is the description/bio of user"}</p>
                        {/* Show the "Edit Description" button only if viewing own profile */}
                        {currentUser === username && (
                            <button onClick={handleEditClick}>Edit Description</button>
                        )}
                    </>
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