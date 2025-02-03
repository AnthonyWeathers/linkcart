import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ResetPassword = () => {
    const [username, setUsername] = useState('');
    const [passkey, setPassKey] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Track loading state
    const navigate = useNavigate();
    
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Set loading to true
        try {
            const response = await fetch(`http://localhost:8000/reset-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json', // Set the Content-Type header
                },
                body: JSON.stringify({ 
                    username,
                    passkey,
                    password,
                }),
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error|| 'Login failed. Please try again.');
            }
    
            const data = await response.json(); // Wait for response JSON
    
            alert(data.message);
    
            navigate('/login'); // Redirect to the Login page
    
        } catch (error) {
            console.error('Error resetting password:', error);
            setError(error.message || 'An error occurred while attempting to reset password. Please try again.'); // Set a general error message
        } finally {
            setIsLoading(false); // Set loading to false once fetch is complete
        }
    };

    return (
        <div className="form-container">
            <h2 className="form-title">Reset Password</h2>
            <form onSubmit={handleResetPassword} className="form">
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
                    placeholder='Enter new password' 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                />
                <input 
                    type='text' 
                    className="form-input"
                    required 
                    placeholder='Enter passkey' 
                    value={passkey}
                    onChange={(e) => setPassKey(e.target.value)}
                />
                <button type="submit" className="form-button" disabled={isLoading}>Reset Password</button>
                {isLoading && <p className="loading-text">Loading...</p>}
                {error && <p className="error-text">{error}</p>}
            </form>
            <p className="form-navigation">Already have an account? <Link to="/login" className="form-link">Login here</Link></p>
        </div>
    );
}

export default ResetPassword;