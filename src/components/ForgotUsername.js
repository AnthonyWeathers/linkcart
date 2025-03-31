import { useState } from "react";
import { Link } from "react-router-dom";

const ForgotUsername = () => {
  const [newUsername, setNewUsername] = useState("");
  const [requestedUsername, setRequestedUsername] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const requestUsername = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/request-username`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Acquiring username failed. Please try again."
        );
      }

      const data = await response.json();

      setError(false);

      alert(data.message);

      setRequestedUsername(true);
    } catch (error) {
      console.error("Error sending user username to email:", error);
      setError(
        error.message ||
          "An error occurred while attempting acquire your username. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setRequestedUsername(false);
    setError("");
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Forgot Username</h2>

      {!requestedUsername ? (
        <form onSubmit={requestUsername} className="form">
          <input
            type="text"
            className="form-input"
            required
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="form-button" disabled={isLoading}>
            Request Username Reminder
          </button>
        </form>
      ) : (
        <div className="request">
          <p>Your username has been sent in an email.</p>
          <button className="resend-button" onClick={resetForm}>
            Didn't get the email? Re-enter email.
          </button>
        </div>
      )}

      {isLoading && <p className="loading-text">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      <p className="form-navigation">
        <Link to="/login" className="form-link">
          Back to Login
        </Link>
      </p>
    </div>
  );
};

export default ForgotUsername;
