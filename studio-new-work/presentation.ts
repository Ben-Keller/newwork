import {defineLocations, type PresentationPluginOptions} from 'sanity/presentation'

export const presentationResolve: PresentationPluginOptions['resolve'] = {
  locations: {
    workPage: defineLocations({
      locations: [{title: 'Work page', href: '/'}],
      message: 'Open the Work page preview',
      tone: 'positive',
    }),
    aboutPage: defineLocations({
      locations: [{title: 'About page', href: '/about'}],
      message: 'Open the About page preview',
      tone: 'positive',
    }),
    contactPage: defineLocations({
      locations: [{title: 'Contact page', href: '/contact'}],
    }),
    footerSettings: defineLocations({
      locations: [
        {title: 'Work page footer', href: '/'},
        {title: 'About page footer', href: '/about'},
        {title: 'Contact page footer', href: '/contact'},
      ],
    }),
    siteSettings: defineLocations({
      locations: [
        {title: 'Work page', href: '/'},
        {title: 'About page', href: '/about'},
        {title: 'Contact page', href: '/contact'},
      ],
    }),
    work: defineLocations({
      select: {title: 'title', slug: 'slug.current'},
      resolve: (document) => ({
        locations: document?.slug
          ? [
              {title: document.title || 'Work page', href: `/work/${document.slug}`},
              {title: 'Work page gallery', href: '/'},
            ]
          : [{title: 'Work page gallery', href: '/'}],
      }),
    }),
  },
}
