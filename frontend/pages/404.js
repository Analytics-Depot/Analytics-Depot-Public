import Link from "next/link";

export default function Custom404() {
  return (
    <div className="min-h-screen bg-[#2D1F14] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#F0E6DA] mb-4">404</h1>
        <h2 className="text-2xl text-[#D9B799] mb-6">Page Not Found</h2>
        <p className="text-[#8C6A58] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#8C6A58] text-white px-6 py-3 rounded hover:bg-[#6A4E3D] transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
