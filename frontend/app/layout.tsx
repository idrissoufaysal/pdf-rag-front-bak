import './globals.css'
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react';

import Image from 'next/image';
 
function Header() {
  return (
    <header style={{ position: "absolute", display: "flex", justifyContent: "space-between", padding: 10, width: '100%' }}>
      <div className="block md:flex items-end gap-3">
        <Image src="/logo.png" alt="PDF Chat logo" width="100" height="75" />
      </div>
      <div className="flex space-x-4 justify-center items-center">
      </div>
    </header>
  );
}

export const metadata: Metadata = {
  title: 'PDF Chat',
  description: 'Chat with your PDFs using AI!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <html lang="en">
        <body>
          <Header />
          {children}
          <Analytics />
        </body>
      </html>
  )
}