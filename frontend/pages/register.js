import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  FiUser,
  FiLock,
  FiMail,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiX,
} from "react-icons/fi";
import supabase from "../lib/supabase";
import customAxios from "../lib/api";
import Footer from "../components/footer/Footer";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
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
  }, [router]);

  // Password validation states
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Password validation function
  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    setPasswordChecks(checks);
    return Object.values(checks).every(Boolean);
  };

  // Handle password change
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Enhanced validation
    if (!fullName.trim()) {
      setError("Full name is required");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError("Password does not meet security requirements");
      setLoading(false);
      return;
    }

    // Email validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      // Sign up with Supabase with full name in user metadata
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        // Handle specific error types
        setError(error.message || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Sync user with backend database to get proper application role
      const syncPayload = {
        external_id: data.user.id,
        email: data.user.email,
        full_name: fullName,
      };

      try {
        // create user and sync it in my local database
        const response = await customAxios.post("/auth/register", syncPayload);

        if (response.status === 200) {
          setSuccess(
            "Registration successful! Please check your email and click the confirmation link before logging in."
          );
          setLoading(false);
        } else {
          setError("Registration failed during user setup. Please try again.");
          setLoading(false);
        }
      } catch (backendError) {
        console.error("Backend registration error:", backendError);
        if (
          backendError.response?.status === 400 &&
          backendError.response?.data?.detail?.includes("already exists")
        ) {
          setError(
            "An account with this email already exists. Please try logging in instead."
          );
        } else {
          setError("Registration failed during user setup. Please try again.");
        }
        setLoading(false);
      }
    } catch (supabaseError) {
      console.error("Supabase registration error:", supabaseError);
      setError("Registration failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
      <Head>
        <title>Register - Analytics Depot</title>
        <meta
          name="description"
          content="Create your Analytics Depot account"
        />
      </Head>

      {/* Navigation Bar */}
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
          <Link
            href="/login"
            className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </nav>

      {/* Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-8 rounded-lg border border-[#3D2F24]">
            <h2 className="text-2xl font-bold text-[#F0E6DA] mb-6 text-center">
              Create Your Account
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-md text-red-300 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-md text-green-300 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[#D9B799] mb-2" htmlFor="fullName">
                  Full Name
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8C6A58]" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#1A140D] text-white pl-10 pr-4 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#D9B799] mb-2" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8C6A58]" />
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
                <label className="block text-[#D9B799] mb-2" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8C6A58]" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    className="w-full bg-[#1A140D] text-white pl-10 pr-12 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8C6A58] hover:text-[#D9B799]"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>

                {/* Password requirements */}
                <div className="mt-2 space-y-1">
                  <div
                    className={`flex items-center text-xs ${
                      passwordChecks.length ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {passwordChecks.length ? (
                      <FiCheck className="mr-1" />
                    ) : (
                      <FiX className="mr-1" />
                    )}
                    At least 8 characters
                  </div>
                  <div
                    className={`flex items-center text-xs ${
                      passwordChecks.uppercase
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {passwordChecks.uppercase ? (
                      <FiCheck className="mr-1" />
                    ) : (
                      <FiX className="mr-1" />
                    )}
                    One uppercase letter
                  </div>
                  <div
                    className={`flex items-center text-xs ${
                      passwordChecks.lowercase
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {passwordChecks.lowercase ? (
                      <FiCheck className="mr-1" />
                    ) : (
                      <FiX className="mr-1" />
                    )}
                    One lowercase letter
                  </div>
                  <div
                    className={`flex items-center text-xs ${
                      passwordChecks.number ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {passwordChecks.number ? (
                      <FiCheck className="mr-1" />
                    ) : (
                      <FiX className="mr-1" />
                    )}
                    One number
                  </div>
                  <div
                    className={`flex items-center text-xs ${
                      passwordChecks.special ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {passwordChecks.special ? (
                      <FiCheck className="mr-1" />
                    ) : (
                      <FiX className="mr-1" />
                    )}
                    One special character (!@#$%^&*)
                  </div>
                </div>
              </div>

              <div>
                <label
                  className="block text-[#D9B799] mb-2"
                  htmlFor="confirmPassword"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8C6A58]" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#1A140D] text-white pl-10 pr-12 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8C6A58] hover:text-[#D9B799]"
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  !Object.values(passwordChecks).every(Boolean) ||
                  password !== confirmPassword
                }
                className="w-full bg-[#D9B799] text-[#1A140D] py-3 px-4 rounded-md font-semibold hover:bg-[#C4A085] focus:outline-none focus:ring-2 focus:ring-[#D9B799] focus:ring-offset-2 focus:ring-offset-[#1A140D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            {success && (
              <div className="mt-6 p-4 bg-green-900/30 border border-green-900/50 rounded-md">
                <p className="text-green-400">{success}</p>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-[#8C6A58]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
                >
                  Sign in here
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
