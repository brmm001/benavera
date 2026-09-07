import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Benavera',
  robots: 'noindex, nofollow',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      {children}
    </div>
  );
}
