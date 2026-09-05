'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// ID padrão da Benavera no Microsoft Clarity com fallback garantido
const CLARITY_ID =
  process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID || 'ybp8ugw8gf';

export function ClarityScript() {
  const pathname = usePathname();

  // Gerenciamento de privacidade em rotas de admin
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
      if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/api'))) {
        try {
          window.clarity('stop');
        } catch {
          /* silent */
        }
      }
    }
  }, [pathname]);

  // Não carregar se for rota administrativa
  if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/api'))) {
    return null;
  }

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `,
      }}
    />
  );
}
