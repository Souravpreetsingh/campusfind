import { pageCatalog } from '@/content/pages';

export type NavItem = {
  slug: string;
  label: string;
  href: string;
};

export function toNavItem(slug: string, label: string): NavItem {
  return {
    slug,
    label,
    href: slug === 'campus-lost-found' ? '/' : `/${slug}`,
  };
}

export const moduleNav: NavItem[] = pageCatalog
  .filter((page) => page.group === 'public')
  .map((page) => toNavItem(page.slug, page.label));

export const adminNav: NavItem[] = pageCatalog
  .filter((page) => page.group === 'admin')
  .map((page) => toNavItem(page.slug, page.label));

export const platformNav: NavItem[] = pageCatalog
  .filter((page) => page.group === 'platform')
  .map((page) => toNavItem(page.slug, page.label));

export const primaryNav: NavItem[] = [...adminNav, ...platformNav];

export const allNavItems: NavItem[] = [
  toNavItem('campus-lost-found', 'Campus Lost & Found'),
  ...moduleNav,
  ...primaryNav,
  toNavItem('login', 'Staff Login'),
];
