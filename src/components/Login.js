import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Track loading state
    const navigate = useNavigate();

    const location = useLocation();
    const alertMessage = location.state?.message;

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Set loading to true
        setError(''); // Clear previous errors

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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error|| 'Login failed. Please try again.');
            }

            const data = await response.json();
            alert(data.message);
            onLogin(data.username, data.isOnline);

            navigate('/'); // Redirect to the home page

        } catch (error) {
            console.error('Error logging in:', error);
            setError(error.message);
        } finally {
            setIsLoading(false); // Reset loading state
        }
    };

    return (
        <div className="form-container">
            {alertMessage && <div className="alert">{alertMessage}</div>}
            <h2 className="form-title">Login</h2>
            <form onSubmit={handleLogin} className="form">
                <input 
                    type='text' 
                    className="form-input"
                    required 
                    placeholder='Enter username' 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                />
                <input 
                    type='password' 
                    className="form-input"
                    required 
                    placeholder='Enter password' 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                />
                <button type="submit" className="form-button" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
                {/* {isLoading && <p className="loading-text">Loading...</p>} */}
                {error && <p className="error-text">{error}</p>}
            </form>
            <p className="form-navigation">New here? <Link to="/register" className="form-link">Register here</Link></p>
        </div>
    );
};

export default Login;
