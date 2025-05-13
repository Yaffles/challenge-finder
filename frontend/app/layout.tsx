import { Metadata } from 'next';
import './globals.css'; // Example global styles
import Script from 'next/script';

// --- METADATA IS EXPORTED FROM THE LAYOUT (SERVER COMPONENT) ---
export const metadata: Metadata = {
  // Set the base URL for resolving relative paths (like icons/og:image)
  // Replace with your actual production domain
  metadataBase: new URL('https://geochallenges.me'),

  // Converted from <title>
  title: 'GeoGuessr Challenges',

  // Converted from <meta name="description">
  description: 'Explore and play millions of free GeoGuessr challenges with Challenge Finder, Geochallenges. Discover a vast collection of challenges created by paid users, available to play for free. Start your adventure now!',
  keywords: 'GeoGuessr, free challenges, play GeoGuessr, GeoGuessr challenges, geography game',

  openGraph: {
    title: 'Free GeoGuessr Challenges - Play Thousands of Challenges on Geochallenges',
    description: 'Explore and play millions of free GeoGuessr challenges with geoChallenges. Discover a vast collection of challenges created by paid users, available to play for free. Start your adventure now!',
    siteName: 'Challenge Finder',
    images: [
      {
        url: '/favicon.ico',       }
    ],    url: '/',
    type: 'website',
  },
  verification: {
    other: {
       'msvalidate.01': 'FD5AC4FC134FA5EA1D579D8F43EB90A6',
    },
  },

  alternates: {
     canonical: '/',
  },

   icons: {
    icon: '/favicon.ico', // Path relative to /public
    apple: '/favicon.ico', // Path relative to /public (or ideally '/apple-touch-icon.png')
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NQ3J0JT1NM"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-NQ3J0JT1NM');
          `}
        </Script>
      </head>
      <body>
        {/* Layout structure (e.g., header, footer) can go here */}
        {children} {/* Your page component will be rendered here */}
      </body>
    </html>
  )
}
