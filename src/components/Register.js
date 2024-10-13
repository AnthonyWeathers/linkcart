import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = ({ onRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Track loading state
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Set loading to true
        try {
            const response = await fetch(`http://localhost:8000/register`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json', // Set the Content-Type header
                },
                body: JSON.stringify({ 
                    username,
                    password,
                }),
            });

            const data = await response.json(); // Wait for response JSON

            if (response.ok) { // Check if response was successful
                alert(data.message);
                onRegister(data.user); // Call the onRegister function with user data
                navigate('/'); // Redirect to the Add Product route
            } else {
                alert(data.message);
                setError(data.message); // Set error state to display the error message
            }
        } catch (error) {
            console.error('Error registering new user:', error);
            setError('An error occurred while registering. Please try again.'); // Set a general error message
        } finally {
            setIsLoading(false); // Set loading to false once fetch is complete
        }
    };

    return (
        <div>
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
                <input 
                    type='text' 
                    required 
                    placeholder='Enter username' 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input 
                    type='password' 
                    required
                    placeholder='Enter password' 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" disabled={isLoading}>Register</button> {/* Disable button while loading */}
                {isLoading && <p>Loading...</p>} {/* Show loading message */}
                {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error message */}
            </form>
        </div>
    );
};

export default Register;
