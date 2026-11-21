import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'صحتي — Sahty',
    short_name: 'صحتي',
    description: 'Votre santé, dans votre poche.',
    start_url: '/ar/login',
    display: 'standalone',
    background_color: '#F1EEF9',
    theme_color: '#6F63B5',
    orientation: 'portrait',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
