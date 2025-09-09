import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FiBarChart,
  FiPieChart,
  FiTrendingUp,
  FiDatabase,
} from "react-icons/fi";
import Footer from "../components/footer/Footer";
import supabase from "../lib/supabase";
import customAxios from "../lib/api";

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication and redirect if logged in - fast and silent
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // First check if this is an email verification callback
        const hash = window.location.hash;
        const isPasswordReset = hash && hash.includes("type=recovery");
        const isEmailVerification =
          hash &&
          (hash.includes("access_token") ||
            hash.includes("type=email_confirmation"));

        // Handle password reset separately
        if (isPasswordReset) {
          console.log("Password reset detected, redirecting...");
          router.replace(`/reset-password${hash}`);
          return;
        }

        if (isEmailVerification) {
          console.log("Email verification detected, handling callback...");

          // Let Supabase handle the callback
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error("Email verification error:", error);
            router.push("/login?error=verification-failed");
            return;
          }

          if (data?.session) {
            console.log("Email verification successful, session created");
            localStorage.setItem("supabase_token", data.session.access_token);
            localStorage.setItem("isLoggedIn", "true");

            // Try to get user profile and redirect
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
              console.error("Role check after verification failed:", roleError);
              // If role check fails, redirect to login with success message
              router.push("/login?confirmed=true");
              return;
            }
          } else {
            console.log("Email verification callback but no session");
            router.push("/login?error=verification-failed");
            return;
          }
        }

        // Regular session check for already logged in users
        const { data: session } = await supabase.auth.getSession();
        console.log(
          "Session check:",
          session?.session ? "Has session" : "No session"
        );

        if (session?.session) {
          // Store the token for API calls
          const token = session.session.access_token;
          localStorage.setItem("supabase_token", token);
          localStorage.setItem("isLoggedIn", "true");
          console.log("Token stored, making role request...");

          try {
            const roleResponse = await customAxios.get("/auth/role");
            const userRole = roleResponse.data.role;
            console.log("User role:", userRole);

            if (userRole === "admin") {
              router.replace("/admin/dashboard");
            } else if (userRole === "expert") {
              router.replace("/expert/dashboard");
            } else if (userRole === "user") {
              console.log(userRole);
              router.replace("/chat");
            }
          } catch (roleError) {
            // If role check fails, clear tokens and continue to homepage
            console.error(
              "Role check failed:",
              roleError.response?.status,
              roleError.response?.data
            );
            localStorage.removeItem("supabase_token");
            localStorage.removeItem("supabase_session");
            localStorage.removeItem("isLoggedIn");
            // Show homepage for unauthenticated users
            setIsCheckingAuth(false);
          }
        } else {
          // No session, show homepage
          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // On error, show homepage
        setIsCheckingAuth(false);
      }
    };

    // Run immediately, no delays
    checkAuthAndRedirect();
  }, [router]);

  // Features section data
  const features = [
    {
      icon: <FiBarChart className="w-8 h-8 text-[#D9B799]" />,
      title: "Real-time Analytics",
      description:
        "Transform complex data into actionable insights with our powerful analytics engine.",
    },
    {
      icon: <FiPieChart className="w-8 h-8 text-[#D9B799]" />,
      title: "Interactive Dashboards",
      description:
        "Visualize data with customizable dashboards tailored to your industry needs.",
    },
    {
      icon: <FiTrendingUp className="w-8 h-8 text-[#D9B799]" />,
      title: "Predictive Insights",
      description:
        "Leverage AI to forecast trends and make data-driven business decisions.",
    },
    {
      icon: <FiDatabase className="w-8 h-8 text-[#D9B799]" />,
      title: "Secure Data Management",
      description:
        "Enterprise-grade security for your most sensitive analytics and documents.",
    },
  ];

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D9B799] mx-auto mb-4"></div>
          <p className="text-[#D9B799]">Loading...</p>
        </div>
      </div>
    );
  }

  // Always show the homepage immediately - no loading states
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
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
         
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col md:flex-row">
        <div className="w-full md:w-3/5 p-6 md:p-12 flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-[#F0E6DA] mb-4 leading-tight">
              Enterprise Analytics{" "}
              <span className="text-[#D9B799]">Reimagined</span>
            </h1>
            <p className="text-xl text-[#D9B799]/90 mb-8">
              Transform your data into actionable insights with our
              industry-specific AI analytics platform. Start free with 20
              queries per month.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-[#2D1F14]/50 backdrop-blur-sm p-5 rounded-lg border border-[#3D2F24] hover:border-[#D9B799]/50 transition-colors"
                >
                  <div className="mb-3">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-[#F0E6DA] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#8C6A58]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Login Form Section */}
        <div
          id="login"
          className="w-full md:w-2/5 bg-[#2D1F14]/90 backdrop-blur-md p-6 md:p-12 flex items-center justify-center border-t md:border-t-0 md:border-l border-[#3D2F24]"
        >
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-[#F0E6DA] mb-6">
              Start Free Today
            </h2>
            <p className="text-[#D9B799]/90 mb-8">
              Get started with 20 free queries per month. No credit card
              required.
            </p>

            <div className="space-y-4">
              <Link
                href="/login"
                className="block w-full py-3 rounded-md font-medium text-center transition-colors bg-[#D9B799] text-[#2D1F14] hover:bg-[#C0A080]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="block w-full py-3 rounded-md font-medium text-center transition-colors bg-green-600 text-white hover:bg-green-700"
              >
                Start Free Trial
              </Link>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#8C6A58]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[#D9B799] hover:text-white"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
