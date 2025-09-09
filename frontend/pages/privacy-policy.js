import Link from "next/link";
import Footer from "../components/footer/Footer";

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p>
            At <span className="text-[#D9B799]">Analytics Depot</span>, your
            privacy is important to us. This policy explains how we handle your
            data and protect your personal information.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">
            1. Data Collection
          </h2>
          <p>
            We collect limited data to provide and improve our services,
            including account details, subscription status, and usage
            statistics.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">
            3. Payment Information
          </h2>
          <p>
            We use Stripe to process payments securely. Your payment information
            is encrypted and handled according to PCI DSS standards. We do not
            store your complete credit card information on our servers.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">
            4. Subscription Management
          </h2>
          <p>
            Your subscription data, including plan type, billing cycle, and
            usage metrics, is stored to provide our services and manage your
            account. You can cancel your subscription at any time through your
            account dashboard.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">
            5. Expert Consultations
          </h2>
          <p>
            For users booking expert sessions, we collect consultation
            preferences and session notes to improve service quality. Session
            recordings are not stored unless explicitly requested and consented
            to.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">
            6. Data Security
          </h2>
          <p>
            We implement industry-standard security measures including
            encryption at rest and in transit, regular security audits, and
            access controls to protect your data from unauthorized access.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">
            7. Your Rights
          </h2>
          <p>
            You have the right to access, update, or delete your personal data.
            Contact our support team to exercise these rights or if you have any
            privacy concerns.
          </p>
          <h2 className="text-xl font-semibold text-[#D9B799]">
            3. Data Protection
          </h2>
          <p>
            We implement industry-standard security measures to safeguard your
            data. Your personal details will never be sold to third parties.
          </p>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
