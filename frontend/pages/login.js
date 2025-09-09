import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import supabase from "../lib/supabase";
import customAxios from "../lib/api";
import Footer from "../components/footer/Footer";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for email confirmation success message
    if (router.query.confirmed === "true") {
      setSuccess("Email confirmed successfully! You can now log in.");
    }

    // Check if user is already logged in and redirect
    const checkExistingAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          // User is already logged in, redirect to appropriate dashboard
          const token = localStorage.getItem("supabase_token");
          if (token) {
            try {
              const roleResponse = await customAxios.get("/auth/role");
              const userRole = roleResponse.data.role;

              if (userRole === "admin") {
                router.replace("/admin/dashboard");
              } else if (userRole === "expert") {
                router.replace("/expert/dashboard");
              } else {
                router.replace("/chat");
              }
              return;
            } catch (roleError) {
              console.error("Role check failed:", roleError);
            }
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkExistingAuth();

    // Check for auth callback errors
    if (router.query.error) {
      switch (router.query.error) {
        case "expired-link":
          setError(
            "The email confirmation link has expired. Please request a new one."
          );
          break;
        case "auth-failed":
          setError("Authentication failed. Please try logging in again.");
          break;
        case "callback-failed":
          setError(
            "There was an issue processing your authentication. Please try again."
          );
          break;
        case "verification-failed":
          setError(
            "Email verification failed. Please try again or contact support."
          );
          break;
        default:
          setError("An authentication error occurred. Please try again.");
      }
    }
  }, [router.query, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Use your Supabase auth client
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        setError(error.message || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      try {
        const syncPayload = {
          user_id: data.user.id,
          email: data.user.email,
          access_token: data.session.access_token,
          full_name: data.user.user_metadata?.full_name || "",
        };

        const syncResponse = await customAxios.post(
          "/auth/sync-user",
          syncPayload
        );

        if (syncResponse.status === 200) {
          const backendUser = syncResponse.data.user || {};
          setSuccess("Login successful! Redirecting...");

          // Store the access token for API calls
          localStorage.setItem("supabase_token", data.session.access_token);
          localStorage.setItem("isLoggedIn", "true");

          // Redirect based on user role
          setTimeout(() => {
            if (backendUser.role === "admin") {
              router.push("/admin/dashboard");
            } else if (backendUser.role === "expert") {
              router.push("/expert/dashboard");
            } else {
              router.push("/chat");
            }
          }, 1000);
        } else {
          setError("User synchronization failed. Please try again.");
          setLoading(false);
          return;
        }
      } catch (syncError) {
        console.error("Sync error:", syncError);
        if (syncError.response?.status === 404) {
          setError("User not found in our system. Please register first.");
        } else {
          setError("Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }
    } catch (authError) {
      console.error("Auth error:", authError);
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setForgotPasswordLoading(true);
    setError("");
    setSuccess("");

    try {
      // Use Supabase password reset functionality
      const { data, error } = await supabase.auth.resetPassword(email);

      if (error) {
        setError(
          error.message ||
            "Failed to send password reset email. Please try again."
        );
      } else {
        setSuccess(
          "Password reset email sent! Please check your inbox and follow the instructions to reset your password."
        );
        setShowForgotPassword(false);
      }
    } catch (err) {
      setError("Failed to send password reset email. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const { error } = await supabase.auth.resendConfirmation(email);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Confirmation email sent! Please check your inbox.");
      }
    } catch (err) {
      setError("Failed to resend confirmation email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExpiredLink = () => {
    setError(
      "The confirmation link has expired. Please register again with a new email address."
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
      <nav className="bg-[#1A140D]/80 backdrop-blur-sm border-b border-[#3D2F24] py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-2xl font-bold text-[#F0E6DA] hover:text-[#D9B799] transition-colors"
            >
              Analytics Depot
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-8 rounded-lg border border-[#3D2F24]">
            <h2 className="text-2xl font-bold text-[#F0E6DA] mb-6 text-center">
              Sign In
            </h2>

            {success && (
              <div className="mb-4 p-3 bg-green-900/50 border border-green-600 rounded-md">
                <p className="text-green-300 text-sm">{success}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-md">
                <p className="text-red-300 text-sm">{error}</p>
                {error?.includes("Email not confirmed") && (
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={handleResendConfirmation}
                      className="block w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      Resend confirmation email
                    </button>
                    <button
                      onClick={handleExpiredLink}
                      className="block w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                    >
                      Handle expired link
                    </button>
                  </div>
                )}
              </div>
            )}

            {!showForgotPassword ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-[#D9B799] mb-2" htmlFor="email">
                    Email
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
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#1A140D] text-white pl-10 pr-4 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[#D9B799] mb-2"
                    htmlFor="password"
                  >
                    Password
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
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="block w-full py-3 rounded-md font-medium text-center transition-colors bg-[#D9B799] text-[#2D1F14] hover:bg-[#C0A080] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label
                    className="block text-[#D9B799] mb-2"
                    htmlFor="forgot-email"
                  >
                    Email
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
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#1A140D] text-white pl-10 pr-4 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="block w-full py-3 rounded-md font-medium text-center transition-colors bg-[#D9B799] text-[#2D1F14] hover:bg-[#C0A080] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotPasswordLoading ? "Sending..." : "Send Reset Email"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="block w-full py-2 text-center text-[#D9B799] hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              </form>
            )}

            <div className="mt-6 text-center space-y-3">
              {!showForgotPassword && (
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="block w-full text-[#D9B799] hover:text-white text-sm transition-colors"
                >
                  Forgot password?
                </button>
              )}
              <p className="text-sm text-[#8C6A58]">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-[#D9B799] hover:text-white"
                >
                  Register here
                </Link>
              </p>
              <p className="text-sm text-[#8C6A58]">
                <Link
                  href="/"
                  className="font-medium text-[#D9B799] hover:text-white"
                >
                  Back to home
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
