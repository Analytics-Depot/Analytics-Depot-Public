import Link from "next/link";
import Footer from "../components/footer/Footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
      {/* Navbar */}
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

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full text-[#F0E6DA] space-y-6">
          <h1 className="text-3xl font-bold text-center mb-4">
            Terms of Service
          </h1>
          <p>
            By accessing and using{" "}
            <span className="text-[#D9B799]">Analytics Depot</span>, you agree
            to comply with our terms. These terms outline your rights and
            responsibilities when using our services.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">
            1. Use of Services
          </h2>
          <p>
            You may only use our services for lawful purposes. Unauthorized
            access, distribution, or misuse of our data and tools is strictly
            prohibited.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">
            2. Subscription Plans
          </h2>
          <p>
            Your access level depends on the subscription plan you purchase.
            Subscriptions automatically renew unless cancelled prior to the
            renewal date.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">3. Liability</h2>
          <p>
            We provide tools and analytics to support investment strategies but
            do not guarantee financial outcomes. You are responsible for your
            investment decisions.
          </p>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
