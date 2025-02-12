import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ForgotUsername = () => {
    const [newUsername, setNewUsername] = useState('');
    const [requestedUsername, setRequestedUsername] = useState(false);
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Track loading state
    const navigate = useNavigate();
    
    const requestUsername = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Set loading to true
        try {
            const response = await fetch(`http://localhost:8000/request-username`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json', // Set the Content-Type header
                },
                body: JSON.stringify({
                    email
                }),
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error|| 'Login failed. Please try again.');
            }
    
            const data = await response.json(); // Wait for response JSON
    
            alert(data.message);

            setRequestedUsername(true);
    
        } catch (error) {
            console.error('Error sending reset code to email:', error);
            setError(error.message || 'An error occurred while attempting send reset code. Please try again.'); // Set a general error message
        } finally {
            setIsLoading(false); // Set loading to false once fetch is complete
        }
    };

    return (
        <div className="form-container">
            <h2 className="form-title">Forgot Username</h2>

            {!requestedUsername ? (
                <form onSubmit={requestUsername} className="form">
                    <input 
                        type='text' 
                        className="form-input"
                        required 
                        placeholder='Enter email' 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button type="submit" className="form-button" disabled={isLoading}>
                        Request Username Reminder
                    </button>
                </form>
            ) : (
                // Form to enter reset code and new password
                <div>
                    <p>
                        Your username has been sent in an email.
                    </p>
                    
                    {/* "Resend Reset Code" button, placed outside the form */}
                    <button className="resend-button" onClick={newCode}>
                        Didn't get the email? Re-enter email.
                    </button>
                </div>
            )}

            {isLoading && <p className="loading-text">Loading...</p>}
            {error && <p className="error-text">{error}</p>}
            <p className="form-navigation">
                <Link to="/login" className="form-link">Back to Login</Link>
            </p>
        </div>
    );
}

export default ForgotUsername;