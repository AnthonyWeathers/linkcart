import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import socket from './socket';

const Register = ({ onRegister }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
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
                    email,
                    password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error|| 'Login failed. Please try again.');
            }

            const data = await response.json(); // Wait for response JSON

            alert(data.message);
            onRegister(data.user, data.isOnline); // Call the onRegister function with user data

            navigate('/'); // Redirect to the Add Product route

        } catch (error) {
            console.error('Error registering new user:', error);
            setError(error.message || 'An error occurred while registering. Please try again.'); // Set a general error message
        } finally {
            setIsLoading(false); // Set loading to false once fetch is complete
        }
    };

    return (
        <div className="form-container">
            <h2 className="form-title">Register</h2>
            <form onSubmit={handleRegister} className="form">
                <input 
                    type='text' 
                    className="form-input"
                    required 
                    placeholder='Enter username' 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input 
                    type='text' 
                    className="form-input"
                    required 
                    placeholder='Enter email' 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input 
                    type='password' 
                    className="form-input"
                    required
                    placeholder='Enter password' 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" className="form-button" disabled={isLoading}>Register</button>
                {isLoading && <p className="loading-text">Loading...</p>}
                {error && <p className="error-text">{error}</p>}
            </form>
            <p className="form-navigation">Already have an account? <Link to="/login" className="form-link">Login here</Link></p>
        </div>
    );
};

export default Register;
