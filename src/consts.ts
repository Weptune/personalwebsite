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
  { href: '/about', label: 'about me' },
];

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/jktrn',
    label: 'GitHub',
  },
  {
    href: 'https://twitter.com/enscry',
    label: 'Twitter',
  },
  {
    href: 'mailto:jason@enscribe.dev',
    label: 'Email',
  },
  {
    href: '/rss.xml',
    label: 'RSS',
  },
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
