import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiCheckCircle, FiArrowRight } from "react-icons/fi";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { plan, session_id } = router.query;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("supabase_token");
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        const userData = localStorage.getItem("userData");

        if (token && isLoggedIn && userData) {
          const user = JSON.parse(userData);
          setUser(user);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const getDashboardUrl = () => {
    if (!user) return "/chat";

    if (user.role === "admin") {
      return "/admin/dashboard";
    } else if (user.role === "expert") {
      return "/expert/dashboard";
    }
    return "/chat";
  };

  const formatPlanName = (planName) => {
    if (!planName) return "Premium Plan";
    return (
      planName.charAt(0).toUpperCase() + planName.slice(1).replace("_", " ")
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
        <div className="text-[#F0E6DA]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A140D] to-[#2D1F14] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-[#2D1F14]/90 backdrop-blur-md p-8 rounded-lg border border-[#3D2F24] shadow-lg text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <FiCheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-[#F0E6DA] mb-3">
            Payment Successful!
          </h1>

          <p className="text-[#8C6A58] mb-6">
            Thank you for your subscription. Your payment has been processed
            successfully.
          </p>

          {/* Plan Details */}
          {plan && (
            <div className="bg-[#1A140D] rounded-lg p-4 mb-6">
              <h3 className="text-[#D9B799] font-semibold mb-2">
                Subscription Details
              </h3>
              <div className="text-sm text-[#F0E6DA] space-y-1">
                <p>
                  <span className="text-[#8C6A58]">Plan:</span>{" "}
                  {formatPlanName(plan)}
                </p>
                <p>
                  <span className="text-[#8C6A58]">Status:</span> Active
                </p>
                {session_id && (
                  <p>
                    <span className="text-[#8C6A58]">Session ID:</span>{" "}
                    {session_id}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="mb-6">
            <h4 className="text-[#D9B799] font-medium mb-3">
              What&apos;s Next?
            </h4>
            <ul className="text-sm text-[#8C6A58] space-y-2 text-left">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                Your account has been upgraded with premium features
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                You&apos;ll receive a confirmation email shortly
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                Start using your new features immediately
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href={getDashboardUrl()}
              className="w-full bg-[#D9B799] text-[#2D1F14] py-3 px-6 rounded-lg font-medium hover:bg-[#C0A080] transition-colors flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <FiArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex gap-3">
              <Link
                href="/settings"
                className="flex-1 text-center py-2 px-4 border border-[#D9B799] text-[#D9B799] rounded-md hover:bg-[#D9B799] hover:text-[#2D1F14] transition-colors text-sm"
              >
                View Settings
              </Link>
              <Link
                href="/contact-support"
                className="flex-1 text-center py-2 px-4 border border-[#8C6A58] text-[#8C6A58] rounded-md hover:bg-[#8C6A58] hover:text-[#F0E6DA] transition-colors text-sm"
              >
                Get Support
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#8C6A58]">
            Need help?{" "}
            <Link
              href="/contact-support"
              className="text-[#D9B799] hover:underline"
            >
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
