import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FiCheck } from "react-icons/fi";
import PRICING_PLANS from "../data/pricing";
import Footer from "../components/footer/Footer";
import customAxios from "../lib/api";
import supabase from "../lib/supabase";

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setIsAuthenticated(true);

          // Store token for API calls
          localStorage.setItem("supabase_token", session.access_token);

          // Get user profile from backend
          try {
            const response = await customAxios.get("/auth/profile");
            if (response.status === 200 && response.data) {
              setUser(response.data);
            }
          } catch (error) {
            console.error("Failed to load user profile:", error);
            // Fallback to basic user data from session
            setUser({
              email: session.user.email,
              full_name:
                session.user.user_metadata?.full_name ||
                session.user.email.split("@")[0],
              role: "user",
            });
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSubscribe = async (planName) => {
    // Check authentication
    if (!isAuthenticated || !user) {
      router.push("/login?redirect=/pricing");
      return;
    }

    // Handle Free tier
    if (planName === "free" || planName === "Free") {
      try {
        alert(
          "Welcome to Analytics Depot! You already have access to 20 free queries per month."
        );

        // Redirect based on user role
        if (user.role === "admin") {
          router.push("/admin/dashboard");
        } else if (user.role === "expert") {
          router.push("/expert/dashboard");
        } else {
          router.push("/chat");
        }
        return;
      } catch (error) {
        console.error("Free tier activation error:", error);
        alert("Failed to activate free tier. Please try again.");
      }
      return;
    }

    // Handle Expert Sessions - coming soon
    if (planName === "expert_sessions") {
      alert(
        "Expert Sessions coming soon! We're working hard to bring you 1-on-1 expert consultations. Please choose Basic or Pro plan for now."
      );
      return;
    }

    setLoading(true);
    setSelectedPlan(planName);

    try {
      // Create checkout session and redirect to Stripe
      const response = await customAxios.post(
        "/payments/create-checkout-session",
        {
          plan_name: planName,
        }
      );

      if (response.data.checkout_url) {
        // Redirect to Stripe's hosted checkout page
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert(
        "Failed to create checkout session. Please try again or contact support."
      );
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const getPlanKey = (planName) => {
    const mapping = {
      Basic: "basic",
      Pro: "pro",
      "Expert Sessions": "expert_sessions",
    };
    return mapping[planName] || planName.toLowerCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
      {/* Navbar */}
      <nav className="bg-[#1A140D]/80 backdrop-blur-sm border-b border-[#3D2F24] py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-bold text-[#F0E6DA] hover:text-[#D9B799] transition-colors"
          >
            <span className="sm:inline">Analytics Depot</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {authLoading ? (
              <div className="text-[#8C6A58] text-sm">Loading...</div>
            ) : user ? (
              <>
                <span className="hidden md:inline text-[#F0E6DA] text-sm">
                  Welcome,{" "}
                  {user.name || user.full_name || user.email?.split("@")[0]}
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
                <Link
                  href="/settings"
                  className="hidden sm:inline-block px-4 py-2 border border-[#D9B799] text-[#D9B799] rounded-md hover:bg-[#D9B799] hover:text-[#2D1F14] transition-colors text-sm font-medium"
                >
                  Settings
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

      {/* Pricing Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-7xl w-full">
          <div className="text-center mb-8 sm:mb-12 px-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F0E6DA] mb-3 sm:mb-4">
              Choose Your Plan
            </h2>
            <p className="text-sm sm:text-base text-[#8C6A58] mb-6 sm:mb-10 max-w-2xl mx-auto">
              Start free or choose a premium plan for unlimited access.
              Professional-grade analytics for every need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {PRICING_PLANS.map((plan, index) => (
              <div
                key={index}
                className={`bg-[#2D1F14]/90 backdrop-blur-md p-4 sm:p-6 rounded-lg border shadow-lg flex flex-col justify-between transition-all relative min-h-[400px] sm:min-h-[450px] ${
                  plan.isPopular
                    ? "border-[#D9B799] lg:scale-105 order-first sm:order-none"
                    : plan.name === "Free"
                    ? "border-green-500/50 hover:border-green-500 order-first"
                    : "border-[#3D2F24] hover:border-[#D9B799]/50"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[#D9B799] text-[#2D1F14] px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                {plan.name === "Free" && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                      Start Here
                    </span>
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-[#D9B799] mb-2 text-center sm:text-left">
                    {plan.name}
                  </h3>
                  <div className="text-center sm:text-left mb-4 sm:mb-6">
                    <span className="text-[#F0E6DA] text-xl sm:text-2xl font-bold">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                    </span>
                    <span className="text-xs sm:text-sm font-normal text-[#8C6A58] block sm:inline">
                      {plan.price === 0 ? " / Forever" : ` / ${plan.period}`}
                    </span>
                  </div>
                  <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    {plan.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[#F0E6DA]"
                      >
                        <FiCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}

                    {/* Extra line for inherited features */}
                    {plan.name === "Pro" && (
                      <li className="flex items-start gap-2 text-[#F0E6DA] font-medium">
                        <FiCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm">
                          All features in{" "}
                          <span className="font-semibold text-[#D9B799]">
                            Basic
                          </span>
                        </span>
                      </li>
                    )}
                    {plan.name === "Expert Sessions" && (
                      <li className="flex items-start gap-2 text-[#D9B799] italic">
                        <FiCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm">
                          Requires active subscription
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscribe(getPlanKey(plan.name))}
                  disabled={
                    (loading && selectedPlan === getPlanKey(plan.name)) ||
                    plan.name === "Expert Sessions"
                  }
                  className={`mt-auto block w-full py-2.5 sm:py-3 rounded-md font-medium text-center transition-colors text-sm sm:text-base ${
                    loading && selectedPlan === getPlanKey(plan.name)
                      ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                      : plan.name === "Expert Sessions"
                      ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                      : plan.name === "Free"
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-[#D9B799] text-[#2D1F14] hover:bg-[#C0A080]"
                  }`}
                >
                  {loading && selectedPlan === getPlanKey(plan.name)
                    ? "Processing..."
                    : plan.name === "Expert Sessions"
                    ? "Coming Soon"
                    : user && user.subscription_plan === getPlanKey(plan.name)
                    ? "Current Plan"
                    : plan.name === "Free"
                    ? "Start Free"
                    : "Subscribe Now"}
                </button>
              </div>
            ))}
          </div>

          {/* Additional Information */}
          <div className="mt-8 sm:mt-12 text-center px-4">
            <p className="text-[#8C6A58] mb-3 sm:mb-4 text-sm sm:text-base">
              All plans include secure payment processing and can be cancelled
              anytime.
            </p>
            <p className="text-[#F0E6DA] text-xs sm:text-sm">
              Need help choosing?{" "}
              <Link
                href="/contact-support"
                className="text-[#D9B799] hover:underline"
              >
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
