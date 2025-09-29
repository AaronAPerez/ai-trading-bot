
import { Metadata } from 'next'

export const siteConfig = {
  name: 'AI Trading Bot',
  description: 'Advanced AI-powered trading bot using Alpaca API for automated stock trading, machine learning predictions, and real-time market analysis.',
  url: 'https://your-domain.com',
  ogImage: 'https://your-domain.com/og-image.jpg',
  keywords: [
    'AI trading bot',
    'automated trading',
    'algorithmic trading',
    'stock trading bot',
    'machine learning trading',
    'Alpaca API',
    'paper trading',
    'real-time trading',
    'AI stock analysis',
    'trading automation'
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [
    {
      name: 'Your Name',
      url: 'https://your-website.com',
    },
  ],
  creator: 'Your Name',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@your_twitter',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}
