import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'Banquate Booking System',
    template: '%s | Banquate Booking System',
  },
  description: 'Banquate Booking System — end-to-end banquet operations and booking platform.',
  applicationName: 'Banquate Booking System',
  openGraph: {
    title: 'Banquate Booking System',
    description: 'End-to-end banquet operations and booking platform.',
    siteName: 'Banquate Booking System',
    images: [{ url: '/logo.png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
