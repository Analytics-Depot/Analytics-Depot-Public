import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-[#1A140D] border-t border-[#3D2F24] py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-[#8C6A58] mb-4 md:mb-0">
            © {new Date().getFullYear()} Analytics Depot. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm">
            <Link
              href="/pricing"
              className="text-[#8C6A58] hover:text-[#D9B799] transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/privacy-policy"
              className="text-[#8C6A58] hover:text-[#D9B799] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="text-[#8C6A58] hover:text-[#D9B799] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact-support"
              className="text-[#8C6A58] hover:text-[#D9B799] transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
