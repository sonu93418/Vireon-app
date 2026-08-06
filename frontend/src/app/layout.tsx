import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: {
    default: 'Vireon Safety Institute — Admin Panel',
    template: '%s | Vireon Admin',
  },
  description:
    'Enterprise Education Management Platform — Admin Dashboard for Vireon Safety Institute (Govt. Registered & ISO Certified)',
  keywords: ['industrial safety', 'education management', 'admin panel', 'vireon'],
  robots: { index: false, follow: false },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} antialiased bg-[#030712] text-[#F1F5F9] min-h-screen selection:bg-green-500/30 selection:text-green-400`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
