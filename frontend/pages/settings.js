// pages/settings.js
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import customAxios from "../lib/api";
import supabase from "../lib/supabase";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    role: "user",
    plan: "free",
    created_at: null,
    usage_count: 0,
    monthly_limit: 20,
    subscription_status: "inactive",
    can_make_request: true,
  });

  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const router = useRouter();

  // Load user profile function
  const loadUserProfile = async () => {
    try {
      setDataLoading(true);
      setError(null);

      // Fetch user profile from backend using new auth system
      const response = await customAxios.get("/auth/profile");

      if (response.status === 200 && response.data) {
        const userData = response.data;

        setUserProfile({
          name: userData.full_name || "",
          email: userData.email || "",
          role: userData.role || "user",
          plan: userData.plan || userData.subscription_level || "free",
          created_at: userData.created_at,
          usage_count: userData.usage_count || 0,
          monthly_limit: userData.monthly_limit || 20,
          subscription_status: userData.subscription_status || "inactive",
          can_make_request: userData.can_make_request || true,
        });
      } else {
        throw new Error("Failed to load profile data");
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
      setError("Failed to load profile data. Please refresh the page.");

      // Fallback: try to get user data from Supabase session
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserProfile({
            name: user.user_metadata?.full_name || user.email.split("@")[0],
            email: user.email,
            role: "user",
            plan: "free",
            created_at: user.created_at,
            usage_count: 0,
            monthly_limit: 20,
            subscription_status: "inactive",
            can_make_request: true,
          });
        }
      } catch (fallbackError) {
        console.error("Fallback profile load failed:", fallbackError);
      }
    } finally {
      setDataLoading(false);
    }
  };

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a token from login
        const token = localStorage.getItem("supabase_token");
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

        if (!token || !isLoggedIn) {
          router.push("/login");
          return;
        }

        // Load user profile data
        await loadUserProfile();
      } catch (err) {
        console.error("Auth check error:", err);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Update user profile through backend (local database)
      const response = await customAxios.put("/auth/profile", {
        full_name: userProfile.name,
      });

      if (response.status === 200) {
        // Also update Supabase user metadata
        try {
          const {
            data: { user },
            error: supabaseError,
          } = await supabase.auth.updateUser({
            data: {
              full_name: userProfile.name,
              name: userProfile.name, // Some apps use 'name' field
            },
          });

          if (supabaseError) {
            console.warn("Failed to update Supabase metadata:", supabaseError);
            setSuccess(
              "Profile updated in local database! (Supabase sync failed)"
            );
          } else {
            setSuccess("Profile updated successfully!");
            console.log(
              "Successfully updated both local DB and Supabase metadata"
            );
          }
        } catch (supabaseErr) {
          console.warn("Supabase update error:", supabaseErr);
          setSuccess(
            "Profile updated in local database! (Supabase sync failed)"
          );
        }

        // Reload profile data
        await loadUserProfile();
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      setError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPasswordLoading(true);

    // Validate passwords
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords don't match");
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      setPasswordLoading(false);
      return;
    }

    try {
      // Use Supabase to update password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) {
        throw error;
      }

      setSuccess("Password changed successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    } catch (error) {
      console.error("Password change error:", error);
      setError(error.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordFormChange = (field, value) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "plan", label: "Subscription Plan", icon: "💳" },
    { id: "security", label: "Security", icon: "🔒" },
  ];

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "expert":
        return "Expert";
      case "user":
      default:
        return "User";
    }
  };

  const getPlanDisplayName = (plan) => {
    switch (plan?.toLowerCase()) {
      case "basic":
        return "Basic Plan";
      case "pro":
        return "Pro Plan";
      case "expert_sessions":
        return "Expert Sessions";
      case "premium":
        return "Premium Plan";
      case "free":
      default:
        return "Free Plan";
    }
  };

  return (
    <>
      <Head>
        <title>Settings - Analytics Depot</title>
        <meta
          name="description"
          content="Manage your account settings and preferences"
        />
      </Head>

      <div className="min-h-screen bg-[#1A140D] text-[#F0E6DA]">
        {/* Header */}
        <div className="bg-[#2D1F14] border-b border-[#4A3222] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#F0E6DA]">Settings</h1>
              <p className="text-[#8C6A58] mt-1">
                Manage your account, preferences, and report settings
              </p>
            </div>
            <button
              onClick={() => router.push("/chat")}
              className="bg-[#D9B799] hover:bg-[#C4A085] text-[#2D1F14] px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Back to Chat
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#2D1F14] border-b border-[#4A3222] px-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-t-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#4A3222] text-[#F0E6DA] border-b-2 border-[#D9B799]"
                    : "text-[#8C6A58] hover:text-[#D9B799] hover:bg-[#3A2A1A]"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6">
          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg">
              <p className="flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-red-300 hover:text-red-100 text-sm underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-900/50 border border-green-700 text-green-200 p-4 rounded-lg">
              <p className="flex items-center">
                <span className="mr-2">✅</span>
                {success}
              </p>
              <button
                onClick={() => setSuccess(null)}
                className="mt-2 text-green-300 hover:text-green-100 text-sm underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tab Content */}
          {dataLoading ? (
            // Loading State
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#2D1F14] rounded-lg p-6">
                <div className="animate-pulse space-y-6">
                  <div className="h-6 bg-[#4A3222] rounded w-1/3"></div>
                  {activeTab === "profile" && (
                    <div className="space-y-4">
                      <div>
                        <div className="h-4 bg-[#4A3222] rounded w-1/4 mb-2"></div>
                        <div className="h-10 bg-[#4A3222] rounded"></div>
                      </div>
                      <div>
                        <div className="h-4 bg-[#4A3222] rounded w-1/4 mb-2"></div>
                        <div className="h-10 bg-[#4A3222] rounded"></div>
                      </div>
                      <div>
                        <div className="h-4 bg-[#4A3222] rounded w-1/4 mb-2"></div>
                        <div className="h-10 bg-[#4A3222] rounded"></div>
                      </div>
                      <div>
                        <div className="h-4 bg-[#4A3222] rounded w-1/4 mb-2"></div>
                        <div className="h-10 bg-[#4A3222] rounded"></div>
                      </div>
                      <div className="h-12 bg-[#4A3222] rounded"></div>
                    </div>
                  )}
                  {activeTab === "plan" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#1A140D] rounded-lg border border-[#4A3222]">
                        <div className="h-4 bg-[#4A3222] rounded w-1/3 mb-3"></div>
                        <div className="h-6 bg-[#4A3222] rounded w-2/3 mb-2"></div>
                        <div className="h-2 bg-[#4A3222] rounded mb-2"></div>
                        <div className="h-3 bg-[#4A3222] rounded w-1/2"></div>
                      </div>
                      <div className="p-4 bg-[#1A140D] rounded-lg border border-[#4A3222]">
                        <div className="h-4 bg-[#4A3222] rounded w-1/4 mb-2"></div>
                        <div className="h-8 bg-[#4A3222] rounded w-1/3"></div>
                      </div>
                      <div className="p-4 bg-[#1A140D] rounded-lg">
                        <div className="h-4 bg-[#4A3222] rounded w-1/3 mb-3"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-[#4A3222] rounded w-3/4"></div>
                          <div className="h-3 bg-[#4A3222] rounded w-2/3"></div>
                          <div className="h-3 bg-[#4A3222] rounded w-1/2"></div>
                          <div className="h-3 bg-[#4A3222] rounded w-3/5"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === "security" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#1A140D] rounded-lg">
                        <div className="h-4 bg-[#4A3222] rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-[#4A3222] rounded w-3/4 mb-3"></div>
                        <div className="h-10 bg-[#4A3222] rounded w-1/3"></div>
                      </div>
                      <div className="p-4 bg-[#1A140D] rounded-lg">
                        <div className="h-4 bg-[#4A3222] rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-[#4A3222] rounded w-2/3 mb-3"></div>
                        <div className="h-10 bg-[#4A3222] rounded w-1/4"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Content */}
              {activeTab === "profile" && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-[#2D1F14] rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-[#F0E6DA] mb-6">
                      Profile Information
                    </h2>

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div>
                        <label className="block text-[#D9B799] font-medium mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={userProfile.name}
                          onChange={(e) =>
                            setUserProfile((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="w-full bg-[#1A140D] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[#D9B799] font-medium mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={userProfile.email}
                          className="w-full bg-[#1A140D] border border-[#4A3222] rounded px-3 py-2 text-[#8C6A58] cursor-not-allowed"
                          disabled
                          readOnly
                        />
                        <p className="text-[#8C6A58] text-sm mt-1">
                          Email cannot be changed
                        </p>
                      </div>

                      <div>
                        <label className="block text-[#D9B799] font-medium mb-2">
                          Role
                        </label>
                        <div className="w-full bg-[#1A140D] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA]">
                          <span
                            className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                              userProfile.role === "admin"
                                ? "bg-red-900/50 text-red-300"
                                : userProfile.role === "expert"
                                ? "bg-blue-900/50 text-blue-300"
                                : "bg-green-900/50 text-green-300"
                            }`}
                          >
                            {getRoleDisplayName(userProfile.role)}
                          </span>
                        </div>
                      </div>

                      {userProfile.created_at && (
                        <div>
                          <label className="block text-[#D9B799] font-medium mb-2">
                            Member Since
                          </label>
                          <div className="w-full bg-[#1A140D] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA]">
                            {new Date(
                              userProfile.created_at
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      )}

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                            loading
                              ? "bg-[#4A3222] text-[#8C6A58] cursor-not-allowed"
                              : "bg-[#D9B799] hover:bg-[#C4A085] text-[#2D1F14]"
                          }`}
                        >
                          {loading ? "Updating..." : "Update Profile"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === "plan" && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-[#2D1F14] rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-[#F0E6DA] mb-6">
                      Subscription Plan
                    </h2>

                    <div className="space-y-6">
                      {/* Usage Summary */}
                      <div className="p-4 bg-[#1A140D] rounded-lg border border-[#4A3222]">
                        <h3 className="text-[#D9B799] font-medium mb-3">
                          Usage This Month
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[#F0E6DA] text-sm">
                              Queries Used
                            </span>
                            <span className="text-[#D9B799] font-medium">
                              {userProfile.usage_count || 0} /{" "}
                              {userProfile.monthly_limit || 20}
                            </span>
                          </div>
                          <div className="w-full bg-[#4A3222] rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                userProfile.usage_count /
                                  userProfile.monthly_limit >
                                0.8
                                  ? "bg-red-500"
                                  : userProfile.usage_count /
                                      userProfile.monthly_limit >
                                    0.6
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (userProfile.usage_count /
                                    userProfile.monthly_limit) *
                                    100
                                )}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-[#8C6A58] text-xs">
                            {userProfile.monthly_limit -
                              userProfile.usage_count >
                            0
                              ? `${
                                  userProfile.monthly_limit -
                                  userProfile.usage_count
                                } queries remaining`
                              : "Monthly limit reached"}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-[#1A140D] rounded-lg border border-[#4A3222]">
                        <h3 className="text-[#D9B799] font-medium mb-2">
                          Current Plan
                        </h3>
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                              userProfile.plan === "pro"
                                ? "bg-yellow-900/50 text-yellow-300"
                                : userProfile.plan === "basic"
                                ? "bg-blue-900/50 text-blue-300"
                                : userProfile.plan === "premium"
                                ? "bg-purple-900/50 text-purple-300"
                                : "bg-gray-900/50 text-gray-300"
                            }`}
                          >
                            {getPlanDisplayName(userProfile.plan)}
                          </span>
                          <button
                            onClick={() => router.push("/pricing")}
                            className="bg-[#D9B799] hover:bg-[#C4A085] text-[#2D1F14] px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            {userProfile.plan === "free"
                              ? "Upgrade Plan"
                              : "Change Plan"}
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-[#1A140D] rounded-lg">
                        <h3 className="text-[#D9B799] font-medium mb-3">
                          Plan Features
                        </h3>
                        {userProfile.plan === "Free" && (
                          <ul className="space-y-2 text-[#8C6A58] text-sm">
                            <li className="flex items-center">
                              <span className="mr-2">✅</span>
                              20 queries per month
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">✅</span>
                              Basic analytics
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">❌</span>
                              Advanced visualizations
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">❌</span>
                              Priority support
                            </li>
                          </ul>
                        )}
                        {userProfile.plan === "Pro" && (
                          <ul className="space-y-2 text-[#8C6A58] text-sm">
                            <li className="flex items-center">
                              <span className="mr-2">✅</span>
                              Unlimited queries
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">✅</span>
                              Advanced analytics
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">✅</span>
                              Advanced visualizations
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">✅</span>
                              Priority support
                            </li>
                          </ul>
                        )}
                      </div>

                      {userProfile.plan !== "Free" && (
                        <div className="p-4 bg-[#1A140D] rounded-lg">
                          <h3 className="text-[#D9B799] font-medium mb-2">
                            Manage Subscription
                          </h3>
                          <p className="text-[#8C6A58] text-sm mb-3">
                            View billing history or cancel your subscription.
                          </p>
                          <button className="bg-[#4A3222] hover:bg-[#5C3E2E] text-[#D9B799] px-4 py-2 rounded transition-colors">
                            Manage Billing
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-[#2D1F14] rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-[#F0E6DA] mb-6">
                      Security Settings
                    </h2>

                    <div className="space-y-4">
                      <div className="p-4 bg-[#1A140D] rounded-lg">
                        <h3 className="text-[#D9B799] font-medium mb-2">
                          Password
                        </h3>
                        <p className="text-[#8C6A58] text-sm mb-3">
                          Change your password to keep your account secure.
                        </p>

                        {!showPasswordForm ? (
                          <button
                            onClick={() => setShowPasswordForm(true)}
                            className="bg-[#4A3222] hover:bg-[#5C3E2E] text-[#D9B799] px-4 py-2 rounded transition-colors"
                          >
                            Change Password
                          </button>
                        ) : (
                          <form
                            onSubmit={handlePasswordChange}
                            className="space-y-4"
                          >
                            <div>
                              <label className="block text-[#D9B799] mb-2">
                                Current Password
                              </label>
                              <input
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={(e) =>
                                  handlePasswordFormChange(
                                    "currentPassword",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-[#2D1F14] text-white px-3 py-2 rounded border border-[#3D2F24] focus:border-[#D9B799] focus:outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[#D9B799] mb-2">
                                New Password
                              </label>
                              <input
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) =>
                                  handlePasswordFormChange(
                                    "newPassword",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-[#2D1F14] text-white px-3 py-2 rounded border border-[#3D2F24] focus:border-[#D9B799] focus:outline-none"
                                minLength={6}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[#D9B799] mb-2">
                                Confirm New Password
                              </label>
                              <input
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) =>
                                  handlePasswordFormChange(
                                    "confirmPassword",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-[#2D1F14] text-white px-3 py-2 rounded border border-[#3D2F24] focus:border-[#D9B799] focus:outline-none"
                                minLength={6}
                                required
                              />
                            </div>

                            <div className="flex space-x-3">
                              <button
                                type="submit"
                                disabled={passwordLoading}
                                className="bg-[#D9B799] hover:bg-[#C0A080] text-[#2D1F14] px-4 py-2 rounded transition-colors disabled:opacity-50"
                              >
                                {passwordLoading
                                  ? "Changing..."
                                  : "Change Password"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPasswordForm(false);
                                  setPasswordForm({
                                    currentPassword: "",
                                    newPassword: "",
                                    confirmPassword: "",
                                  });
                                  setError(null);
                                }}
                                className="bg-[#4A3222] hover:bg-[#5C3E2E] text-[#D9B799] px-4 py-2 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
