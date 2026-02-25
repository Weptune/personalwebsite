import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'Weptune',
  description:
    "Weptune's Website",
  href: '/',
  author: 'Abhinav',
  locale: 'en-US',
  featuredPostCount: 2,
  postsPerPage: 3,
}

export const NAV_LINKS: SocialLink[] = [
  { href: '/albums', label: 'album reviews' },
  { href: '/movies', label: 'movie reviews' },
  { href: '/thoughts', label: 'thoughts' },
  { href: '/projects', label: 'projects' },
  { href: '/guestbook', label: 'guestbook' },
  { href: '/about', label: 'about me' },
];

export const SOCIAL_LINKS: SocialLink[] = [
  { href: 'https://github.com/Weptune', label: 'GitHub' },
  { href: 'https://www.youtube.com/@Weptune', label: 'YouTube' },
  { href: 'https://discord.gg/dcjKwMvs', label: 'Discord' },
  { href: 'https://www.instagram.com/abhinavityy/', label: 'Instagram' },
];

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  YouTube: 'lucide:youtube',
  Discord: 'lucide:message-circle',
  Instagram: 'lucide:instagram',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
