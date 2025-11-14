"use client";

import { useEffect } from 'react';

export default function PWAHead() {
  useEffect(() => {
    // Dynamically inject PWA meta tags
    const links = [
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'apple-touch-icon', href: '/icon-192.png' },
      { rel: 'apple-touch-icon', href: '/icon-192.png', sizes: '192x192' },
      { rel: 'apple-touch-icon', href: '/icon-512.png', sizes: '512x512' },
    ];

    const metas = [
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'SideBet' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'theme-color', content: '#f97316' },
    ];

    // Add link tags
    links.forEach(({ rel, href, sizes }) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (sizes) link.setAttribute('sizes', sizes); // ✅ Use setAttribute
      document.head.appendChild(link);
    });

    // Add meta tags
    metas.forEach(({ name, content }) => {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    });
  }, []);

  return null;
}