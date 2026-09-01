'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

export function ClarityScript() {
  const pathname = usePathname();
  const clarityId = process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID;

  // Não carregar se não houver ID configurado
  if (!clarityId) {
    return null;
  }

  // Não gravar painel administrativo ou rotas com dados confidenciais
  if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/api'))) {
    return null;
  }

  // Em desenvolvimento, só carregar se explicitamente ativado via flag de debug
  const isDev = process.env.NODE_ENV === 'development';
  const enableInDev = process.env.NEXT_PUBLIC_CLARITY_DEV === 'true';
  if (isDev && !enableInDev) {
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
          })(window, document, "clarity", "script", "${clarityId}");
        `,
      }}
    />
  );
}
