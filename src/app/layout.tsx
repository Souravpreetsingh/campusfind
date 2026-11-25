import type { Metadata } from 'next';
import CanonicalActions from '@/components/canonical-actions';
import ReportAssistant from '@/components/report-assistant';
import SiteBackground from '@/components/site-background';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CampusFind Lost & Found',
    template: '%s | CampusFind',
  },
  description: 'CampusFind institutional lost & found management platform',
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SiteBackground />
        <div className="site-content">
          {children}
          <CanonicalActions />
        </div>
        <ReportAssistant />
      </body>
    </html>
  );
}
