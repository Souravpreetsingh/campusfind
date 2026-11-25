import HeroWordmarkMount from '@/components/hero-wordmark';
import { pageContent, pageTitles } from '@/content/pages';

export const metadata = {
  title: pageTitles['campus-lost-found'] ?? 'CampusFind',
};

export default function HomePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: pageContent['campus-lost-found'] ?? '' }} />
      <HeroWordmarkMount />
    </>
  );
}
