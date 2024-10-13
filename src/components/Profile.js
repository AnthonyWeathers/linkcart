import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // Hook to access URL params

const Profile = () => {
    const { username } = useParams(); // Get the username from the URL
    const [favoriteProducts, setFavoriteProducts] = useState([]);
    const [user, setUser] = useState(null);

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
            {/* would use user.username and user.description */}
            <p className='username'>This is where the username goes</p>
            <p className='description'>This is the description/bio of user</p>

            <div>
                <Products products={favoriteProducts}/>
            </div>
        </div>
    );
}

export default Profile;