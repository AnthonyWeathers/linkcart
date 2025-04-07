import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

const ForgotPassword = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const navigate = useNavigate();

  const requestResetCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/auth/request-reset-code`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed. Please try again.");
      }

      const data = await response.json();

      toast.info(data.message);

      setResettingPassword(true);
    } catch (error) {
      console.error("Error sending reset code to email:", error);
      setError(
        error.message ||
          "An error occurred while attempting send reset code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/auth/reset-password`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            resetCode,
            newPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reset password.");
      }

      toast.success("Password reset successful! You can now log in.");
      navigate("/login");
    } catch (error) {
      console.error("Error resetting password:", error);
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const newCode = () => {
    setResettingPassword(false);
    setError("");
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Forgot Password</h2>

      {!resettingPassword ? (
        <form onSubmit={requestResetCode} className="form">
          <input
            type="text"
            className="form-input"
            required
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            required
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="form-button" disabled={isLoading}>
            Request Reset Code
          </button>
        </form>
      ) : (
        <div className="request">
          <form onSubmit={resetPassword} className="form">
            <input
              type="text"
              className="form-input"
              required
              placeholder="Enter reset code"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
            />
            <input
              type="password"
              className="form-input"
              required
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button type="submit" className="form-button" disabled={isLoading}>
              Confirm
            </button>
          </form>

          <button className="resend-button" onClick={newCode}>
            Didn't get a code? Reset form here to double check details.
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

export default ForgotPassword;
