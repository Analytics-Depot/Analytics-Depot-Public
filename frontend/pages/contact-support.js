import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Footer from "../components/footer/Footer";
import customAxios from "../lib/api";

export default function ContactSupport() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check authentication using the consistent strategy
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("supabase_token");
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        const userData = localStorage.getItem("userData");

        if (token && isLoggedIn && userData) {
          const user = JSON.parse(userData);
          console.log("Contact Support - User authenticated:", user);
          setUser(user);
          setFormData((prev) => ({
            ...prev,
            name: user.name || "",
            email: user.email || "",
          }));
        } else {
          console.log("Contact Support - No authentication found");
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Use customAxios which handles authentication automatically
      const response = await customAxios.post("/support/create", formData);

      if (response.status === 200) {
        const data = response.data;
        setSuccess(
          `Your message has been sent successfully! ${
            data.priority === "high"
              ? "As a Pro subscriber, you'll receive priority support within 24 hours."
              : "We'll get back to you within 48-72 hours."
          }`
        );
        setFormData({
          name: user?.name || "",
          email: user?.email || "",
          subject: "",
          message: "",
        });
      }
    } catch (error) {
      console.error("Error submitting support message:", error);
      setError(
        error.response?.data?.detail ||
          "Failed to send message. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
      {/* Navbar */}
      <nav className="bg-[#1A140D]/80 backdrop-blur-sm border-b border-[#3D2F24] py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl sm:text-2xl font-bold text-[#F0E6DA] hover:text-[#D9B799] transition-colors"
            >
              <span className="hidden sm:inline">Analytics Depot</span>
              <span className="sm:hidden">AD</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {isCheckingAuth ? (
              <div className="text-[#8C6A58] text-sm">Loading...</div>
            ) : user ? (
              <>
                {user.subscription_plan === "pro" && (
                  <span className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-xs mr-2">
                    Priority Support
                  </span>
                )}
                <span className="hidden md:inline text-[#D9B799] text-sm">
                  {user.name}
                </span>
                <Link
                  href={
                    user.role === "admin"
                      ? "/admin/dashboard"
                      : user.role === "expert"
                      ? "/expert/dashboard"
                      : "/chat"
                  }
                  className="px-2 sm:px-4 py-2 bg-[#D9B799] text-[#2D1F14] rounded-md hover:bg-[#C0A080] transition-colors text-xs sm:text-sm font-medium"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 sm:px-4 py-2 bg-[#D9B799] text-[#2D1F14] rounded-md hover:bg-[#C0A080] transition-colors text-xs sm:text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Form container */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-8 rounded-lg border border-[#3D2F24]">
            <h2 className="text-2xl font-bold text-[#F0E6DA] mb-6 text-center">
              Contact Support
            </h2>

            {user?.subscription_plan === "pro" && (
              <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-md">
                <p className="text-yellow-200 text-sm font-medium">
                  ⭐ Priority Support: As a Pro subscriber, you&apos;ll receive
                  responses within 24 hours!
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
                <label className="block text-[#D9B799] mb-2" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-[#1A140D] text-white px-4 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div>
                <label className="block text-[#D9B799] mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#1A140D] text-white px-4 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-[#D9B799] mb-2" htmlFor="subject">
                  Subject (Optional)
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full bg-[#1A140D] text-white px-4 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-[#D9B799] mb-2" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-[#1A140D] text-white px-4 py-3 rounded-md border border-[#3D2F24] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none"
                  placeholder="Describe your issue in detail"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="block w-full py-3 rounded-md font-medium text-center transition-colors bg-[#D9B799] text-[#2D1F14] hover:bg-[#C0A080] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#8C6A58]">
                <Link
                  href={
                    user
                      ? user.role === "admin"
                        ? "/admin/dashboard"
                        : user.role === "expert"
                        ? "/expert/dashboard"
                        : "/chat"
                      : "/"
                  }
                  className="font-medium text-[#D9B799] hover:text-white"
                >
                  {user ? "Back to dashboard" : "Back to home"}
                </Link>
              </p>
              {!user && (
                <p className="text-xs text-[#8C6A58] mt-2">
                  <Link
                    href="/login"
                    className="text-[#D9B799] hover:underline"
                  >
                    Sign in
                  </Link>{" "}
                  for faster support and to track your requests
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
