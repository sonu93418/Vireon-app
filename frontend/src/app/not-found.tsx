import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4FAF6] p-4 text-center">
      <div className="max-w-md w-full clay-card p-8 bg-white border border-emerald-500/20 shadow-clay-lg">
        <div className="w-16 h-16 rounded-3xl bg-white border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 p-2 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Vireon Safety Logo" className="w-full h-full object-contain object-center" />
        </div>
        <h1 className="font-heading text-4xl font-extrabold text-slate-900 mb-2">404</h1>
        <h2 className="font-heading text-lg font-bold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-xs text-slate-500 font-medium mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="clay-btn-primary inline-flex items-center justify-center px-6 py-2.5 text-xs font-bold"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
