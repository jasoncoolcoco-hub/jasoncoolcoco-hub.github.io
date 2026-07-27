export const siteContent = {
  meta: {
    title: 'Jason Li',
    description: 'Jason Li — personal website.',
  },
  chapters: [
    { number: '01', name: 'HOME', id: 'home', status: 'current' },
    { number: '02', name: 'FOOTPRINTS', id: 'footprints', status: 'soon' },
    { number: '03', name: 'LAB', id: 'lab', status: 'soon' },
    { number: '04', name: 'THANKS', id: 'thanks', status: 'soon' },
  ],
  home: {
    title: 'JASON LI',
    hero: {
      alt: 'Jason Li standing beneath a dramatic sunset sky',
      desktopSrc: '/images/hero/jason-li-hero-2400.jpg',
      mobileSrc: '/images/hero/jason-li-hero-1440.jpg',
      enableHeroParallax: true,
    },
    scrollLabel: 'SCROLL TO DISCOVER',
  },
  navigation: {
    label: 'Website chapters',
    menuOpen: 'CHAPTERS',
    menuClose: 'CLOSE',
    soonLabel: 'SOON',
  },
  profile: {
    title: 'JASON LI',
    openLabel: 'Open profile',
    closeLabel: 'Close profile',
    dialogLabel: 'Jason Li contact information',
    wechat: {
      label: 'WECHAT',
      value: '15766951424',
      revealLabel: 'CLICK TO REVEAL',
      copyLabel: 'Copy WeChat ID',
      copiedLabel: 'COPIED',
    },
    contacts: [
      {
        label: 'PHONE',
        display: '+60 17-220 4519',
        href: 'tel:+60172204519',
      },
      {
        label: 'EMAIL',
        display: 'jasoncoolcoco@gmail.com',
        href: 'mailto:jasoncoolcoco@gmail.com',
      },
      {
        label: 'GITHUB',
        display: 'jasoncoolcoco-hub',
        href: 'https://github.com/jasoncoolcoco-hub',
        external: true,
      },
      {
        label: 'INSTAGRAM',
        display: 'lixinyu____',
        href: 'https://www.instagram.com/lixinyu____/',
        external: true,
      },
      {
        label: 'LINKEDIN',
        display: 'Xin-Yu Li',
        href: 'https://www.linkedin.com/in/xin-yu-li-907204264',
        external: true,
      },
      {
        label: 'CV',
        display: 'COMING SOON',
        href: null,
      },
    ],
  },
}
