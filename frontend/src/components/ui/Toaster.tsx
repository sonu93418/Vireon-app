'use client';

export function Toaster() {
  // Lightweight toast notification container
  // In production integrate with sonner or react-hot-toast
  return <div id="vireon-toaster" className="fixed bottom-4 right-4 z-[9999] space-y-2 pointer-events-none" />;
}
