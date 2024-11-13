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
        <div className="form-container">
            <h2 className="form-title">Login</h2>
            <form onSubmit={handleLogin} className="form">
                <input 
                    type='text' 
                    className="form-input"
                    required 
                    placeholder='Enter username' 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input 
                    type='password' 
                    className="form-input"
                    required 
                    placeholder='Enter password' 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" className="form-button" disabled={isLoading}>Login</button>
                {isLoading && <p className="loading-text">Loading...</p>}
                {error && <p className="error-text">{error}</p>}
            </form>
            <p className="form-navigation">New here? <Link to="/register" className="form-link">Register here</Link></p>
        </div>
    );
};

export default Login;
