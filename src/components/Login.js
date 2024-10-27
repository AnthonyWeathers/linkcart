import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import socket from './socket';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Track loading state
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Set loading to true
        try {
            const response = await fetch(`http://localhost:8000/login`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username,
                    password,
                }),
            });

            const data = await response.json();
            if (data.success) {
                alert(data.message);
                onLogin(data.user);

                if (!socket.connected) {
                    socket.connect();
                }

                navigate('/');
            } else {
                alert(data.message);
                setError(data.message);
            }
        } catch (error) {
            console.error('Error logging in:', error);
            setError('An error occurred while logging in. Please try again.');
        } finally {
            setIsLoading(false); // Reset loading state
        }
    };

    return (
        <div>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
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
                <button type="submit" disabled={isLoading}>Login</button> {/* Disable button while loading */}
                {isLoading && <p>Loading...</p>} {/* Show loading message */}
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>

            {/* Navigation link to the Register page */}
            <p>New here? <Link to="/register">Register here</Link></p>
        </div>
    );
};

export default Login;
