import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'Banquate Booking System',
    template: '%s | Banquate Booking System',
  },
  description: 'Banquate Booking System — end-to-end banquet operations and booking platform.',
  applicationName: 'bbs',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'bbs',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
    shortcut: '/icon.png',
  },
  openGraph: {
    title: 'Banquate Booking System',
    description: 'End-to-end banquet operations and booking platform.',
    siteName: 'Banquate Booking System',
    images: [{ url: '/logo.png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#f6ad1c',
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Capture beforeinstallprompt before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaInstallPrompt = e;
          });
        ` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
