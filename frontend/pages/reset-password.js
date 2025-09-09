import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import supabase from "../lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Handle Supabase auth session from password reset email
    const handleAuthSession = async () => {
      try {
        // Get the current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setError(
            "Invalid reset session. Please request a new password reset."
          );
          return;
        }

        if (session && session.access_token) {
          setToken(session.access_token);
          if (session.user?.email) {
            setEmail(session.user.email);
          }
        } else {
          // Fallback: Extract token and email from URL hash fragment (old method)
          if (typeof window !== "undefined") {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);

            const accessToken = params.get("access_token");
            const userEmail = params.get("email") || params.get("user_email");

            if (accessToken) {
              setToken(accessToken);
              // Clear the hash from URL for security
              window.history.replaceState(null, "", window.location.pathname);
            }

            if (userEmail) {
              setEmail(userEmail);
            } else if (accessToken) {
              // Try to extract email from JWT token
              try {
                const tokenParts = accessToken.split(".");
                if (tokenParts.length === 3) {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  const emailFromToken = payload.email;
                  if (emailFromToken) {
                    setEmail(emailFromToken);
                  }
                }
              } catch (error) {
                // Error extracting email from token
              }
            }
          }
        }
      } catch (error) {
        console.error("Auth session error:", error);
        setError(
          "Failed to validate reset session. Please request a new password reset."
        );
      }
    };

    handleAuthSession();
  }, []);

  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push(
        'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)'
      );
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setError(
        "Invalid or missing reset token. Please request a new password reset."
      );
      return;
    }

    if (!email) {
      setError("Email address not found. Please request a new password reset.");
      return;
    }

    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join(". "));
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Use Supabase to update the password
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(
          error.message || "Failed to reset password. Please try again."
        );
      } else {
        setSuccess("Password reset successfully! Redirecting to login...");
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-[#2D1F14]/90 backdrop-blur-md p-8 rounded-lg border border-[#3D2F24]">
              <h2 className="text-2xl font-bold text-[#F0E6DA] mb-6 text-center">
                Invalid Reset Link
              </h2>
              <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-md">
                <p className="text-red-300 text-sm">
                  This password reset link is invalid or has expired. Please
                  request a new password reset.
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full py-3 rounded-md font-medium text-center transition-colors bg-[#D9B799] text-[#2D1F14] hover:bg-[#C0A080]"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
      <nav className="bg-[#1A140D]/80 backdrop-blur-sm border-b border-[#3D2F24] py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link href={"/"} className="text-2xl font-bold text-[#F0E6DA]">
              Analytics Depot
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-8 rounded-lg border border-[#3D2F24]">
            <h2 className="text-2xl font-bold text-[#F0E6DA] mb-6 text-center">
              Reset Password
            </h2>

            {email && (
              <div className="mb-4 p-3 bg-blue-900/50 border border-blue-600 rounded-md">
                <p className="text-blue-300 text-sm">
                  Resetting password for: <strong>{email}</strong>
                </p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-900/50 border border-green-600 rounded-md">
                <p className="text-green-300 text-sm">{success}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-md">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[#D9B799] mb-2" htmlFor="password">
                  New Password
                </label>
                <div className="relative">
                  <svg
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8C6A58] w-5 h-5"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1A140D] text-white pl-10 pr-4 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div className="mt-2 text-xs text-[#8C6A58]">
                  Password must be at least 8 characters with uppercase,
                  lowercase, number, and special character.
                </div>
              </div>

              <div>
                <label
                  className="block text-[#D9B799] mb-2"
                  htmlFor="confirmPassword"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <svg
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8C6A58] w-5 h-5"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#1A140D] text-white pl-10 pr-4 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="block w-full py-3 rounded-md font-medium text-center transition-colors bg-[#D9B799] text-[#2D1F14] hover:bg-[#C0A080] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-[#D9B799] hover:text-white text-sm transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-[#1A140D] border-t border-[#3D2F24] py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-[#8C6A58] mb-4 md:mb-0">
              © 2025 Analytics Depot. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
