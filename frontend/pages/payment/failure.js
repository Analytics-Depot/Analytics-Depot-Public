import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiXCircle, FiRefreshCw, FiArrowLeft } from "react-icons/fi";

export default function PaymentFailurePage() {
  const router = useRouter();
  const { error, plan, error_code, declined_code } = router.query;
  const [retryLoading, setRetryLoading] = useState(false);

  const formatPlanName = (planName) => {
    if (!planName) return "Selected Plan";
    return (
      planName.charAt(0).toUpperCase() + planName.slice(1).replace("_", " ")
    );
  };

  const getErrorMessage = (errorCode, declinedCode) => {
    if (declinedCode) {
      switch (declinedCode) {
        case "insufficient_funds":
          return "Your card has insufficient funds. Please try a different payment method.";
        case "card_declined":
          return "Your card was declined. Please contact your bank or try a different card.";
        case "expired_card":
          return "Your card has expired. Please use a different payment method.";
        case "incorrect_cvc":
          return "The security code is incorrect. Please check and try again.";
        case "processing_error":
          return "There was a processing error. Please try again in a few minutes.";
        default:
          return "Your payment was declined. Please try a different payment method.";
      }
    }

    if (errorCode) {
      switch (errorCode) {
        case "authentication_required":
          return "Additional authentication is required. Please contact your bank.";
        case "card_not_supported":
          return "This card type is not supported. Please try a different card.";
        case "expired_card":
          return "Your card has expired. Please use a different payment method.";
        case "incorrect_number":
          return "The card number is incorrect. Please check and try again.";
        case "invalid_expiry_month":
        case "invalid_expiry_year":
          return "The expiration date is invalid. Please check and try again.";
        case "invalid_cvc":
          return "The security code is invalid. Please check and try again.";
        default:
          return "There was an error processing your payment. Please try again.";
      }
    }

    return error || "Your payment could not be processed. Please try again.";
  };

  const handleRetry = async () => {
    setRetryLoading(true);
    // Redirect back to pricing to restart the payment process
    router.push(`/pricing${plan ? `?plan=${plan}` : ""}`);
  };

  const getCommonSolutions = () => [
    "Double-check your card information (number, expiry, CVC)",
    "Ensure you have sufficient funds available",
    "Try a different payment method or card",
    "Contact your bank if the issue persists",
    "Use a card that supports international transactions",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A140D] to-[#2D1F14] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Failure Card */}
        <div className="bg-[#2D1F14]/90 backdrop-blur-md p-8 rounded-lg border border-[#3D2F24] shadow-lg text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <FiXCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-[#F0E6DA] mb-3">
            Payment Failed
          </h1>

          <p className="text-[#8C6A58] mb-6">
            {getErrorMessage(error_code, declined_code)}
          </p>

          {/* Plan Details */}
          {plan && (
            <div className="bg-[#1A140D] rounded-lg p-4 mb-6">
              <h3 className="text-[#D9B799] font-semibold mb-2">
                Attempted Purchase
              </h3>
              <p className="text-sm text-[#F0E6DA]">
                <span className="text-[#8C6A58]">Plan:</span>{" "}
                {formatPlanName(plan)}
              </p>
            </div>
          )}

          {/* Troubleshooting */}
          <div className="mb-6 text-left">
            <h4 className="text-[#D9B799] font-medium mb-3 text-center">
              Common Solutions:
            </h4>
            <ul className="text-sm text-[#8C6A58] space-y-2">
              {getCommonSolutions().map((solution, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-[#D9B799] mr-2">•</span>
                  {solution}
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={retryLoading}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                retryLoading
                  ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                  : "bg-[#D9B799] text-[#2D1F14] hover:bg-[#C0A080]"
              }`}
            >
              {retryLoading ? (
                <>
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <FiRefreshCw className="w-4 h-4" />
                  Try Again
                </>
              )}
            </button>

            <div className="flex gap-3">
              <Link
                href="/pricing"
                className="flex-1 text-center py-2 px-4 border border-[#D9B799] text-[#D9B799] rounded-md hover:bg-[#D9B799] hover:text-[#2D1F14] transition-colors text-sm flex items-center justify-center gap-1"
              >
                <FiArrowLeft className="w-3 h-3" />
                Back to Pricing
              </Link>
              <Link
                href="/contact-support"
                className="flex-1 text-center py-2 px-4 border border-[#8C6A58] text-[#8C6A58] rounded-md hover:bg-[#8C6A58] hover:text-[#F0E6DA] transition-colors text-sm"
              >
                Get Help
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#8C6A58] mb-2">
            Having trouble? Our support team is here to help.
          </p>
          <Link
            href="/contact-support"
            className="text-xs text-[#D9B799] hover:underline"
          >
            Contact Support →
          </Link>
        </div>

        {/* Error Details for Debugging */}
        {(error_code || declined_code) && (
          <div className="mt-4 p-3 bg-[#1A140D]/50 rounded border border-[#3D2F24]">
            <p className="text-xs text-[#8C6A58] text-center">
              Error Details: {error_code || declined_code}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
