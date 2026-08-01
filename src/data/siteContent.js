export const siteContent = {
  meta: {
    title: 'Jason Li',
    description: 'Jason Li — personal website.',
  },
  chapters: [
    { number: '01', name: 'HOME', id: 'home', status: 'current' },
    {
      number: '02',
      name: 'FOOTPRINTS',
      id: 'footprints',
      status: 'available',
    },
    { number: '03', name: 'LAB', id: 'lab', status: 'soon' },
    { number: '04', name: 'THANKS', id: 'thanks', status: 'soon' },
  ],
  home: {
    siteName: 'JASON LI PERSONAL WEBSITE',
    hero: {
      alt: 'Jason Li standing beneath a dramatic sunset sky',
      desktopSrc: '/images/hero/jason-li-hero-2400.jpg',
      mobileSrc: '/images/hero/jason-li-hero-1440.jpg',
    },
    introduction:
      "Every journey begins with a destination, but it is rarely the destination we remember most. It is the conversations that change our perspective, the unexpected moments that become lasting memories, and the people who quietly leave their mark on our lives. Along the way, I have explored new cities, embraced different cultures, captured moments through my camera, and discovered new ways to think, create, and grow. This website is not just a record of where I've been. It is a reflection of the experiences that continue to shape who I am—and the journey that is still unfolding.",
  },
  footprints: {
    title: 'FOOTPRINTS',
    globeLabel: 'Interactive Footprints globe',
    globeToggleLabel: 'Toggle globe size',
    globeInstructions:
      'On desktop, double-click empty globe space or press Enter or Space when focused to enter explore mode. In enlarged explore mode, drag precisely or use arrow keys to rotate with restrained vertical tilt. Wheel and two-finger gestures scroll the page.',
  },
  navigation: {
    label: 'Website chapters',
    menuOpen: 'CHAPTERS',
    menuClose: 'CLOSE',
    soonLabel: 'SOON',
  },
  profile: {
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
