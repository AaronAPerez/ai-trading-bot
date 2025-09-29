
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/settings/', '/auth/'],
    },
    sitemap: 'https://your-domain.com/sitemap.xml',
  }
}