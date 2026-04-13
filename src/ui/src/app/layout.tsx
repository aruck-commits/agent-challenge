import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Orion - Solana DeFi Risk Officer',
  description: 'Orion monitors Solana DeFi portfolio risk with alerts and AI chat.',
  icons: {
    icon: '/orion-logo.png',
    shortcut: '/orion-logo.png',
    apple: '/orion-logo.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
