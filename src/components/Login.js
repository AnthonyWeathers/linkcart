import { useState, useContext } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { UserContext } from "./UserContext";
import { toast } from "react-toastify";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { setCurrentUser } = useContext(UserContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`http://localhost:8000/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed. Please try again.");
      }

      const data = await response.json();
      toast.success(data.message);
      setCurrentUser(data.username);

      navigate("/");
    } catch (error) {
      console.error("Error logging in:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-navigation">
        <p>New here?</p>{" "}
        <Link to="/register" className="form-link">
          Register here
        </Link>
      </div>
      {error && <p className="error-text">{error}</p>}
      <h2 className="form-title">Login</h2>
      <form onSubmit={handleLogin} className="form">
        <input
          type="text"
          className="form-input"
          required
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
        />
        <Link to="/forgot-username" className="form-link">
          Forgot Username? Click here
        </Link>
        <input
          type="password"
          className="form-input"
          required
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        <Link to="/forgot-password" className="form-link">
          Forgot Password? Reset it here
        </Link>
        <button type="submit" className="form-button" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
