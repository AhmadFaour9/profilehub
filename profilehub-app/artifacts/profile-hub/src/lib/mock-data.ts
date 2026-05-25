import { Link, Project, Service, GalleryItem, AnalyticsOverview, TimeSeriesPoint, LinkAnalytics, Profile } from "@/modules/shared";

export const mockUser: Profile = {
  id: "usr_123",
  username: "sara",
  displayName: "Sara Al-Hassan",
  profession: "Senior Brand Designer",
  bio: "Crafting quiet, deliberate identities for ambitious brands. Based in Dubai, working globally.",
  avatarUrl: "https://picsum.photos/id/64/400/400",
  coverUrl: "https://picsum.photos/id/883/1200/400",
  email: "hello@saraalhassan.design",
  location: "Dubai, UAE",
  website: "https://saraalhassan.design",
  isPublished: true,
  socialLinks: [
    { platform: "twitter", url: "https://twitter.com/sara_design" },
    { platform: "linkedin", url: "https://linkedin.com/in/saraalhassan" },
    { platform: "instagram", url: "https://instagram.com/sara.design" }
  ],
  theme: {
    id: "thm_1",
    primaryColor: "#3A4F41",
    backgroundColor: "#FAF9F6",
    fontFamily: "Outfit",
    buttonStyle: "rounded",
    layout: "centered"
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const mockLinks: Link[] = [
  {
    id: "lnk_1",
    title: "My Portfolio",
    url: "https://saraalhassan.design",
    description: "Selected works 2022-2024",
    isActive: true,
    isPinned: true,
    order: 0,
    clickCount: 1245,
    createdAt: new Date().toISOString()
  },
  {
    id: "lnk_2",
    title: "Book a consultation",
    url: "https://cal.com/sara/consultation",
    description: "30-min discovery call",
    isActive: true,
    isPinned: false,
    order: 1,
    clickCount: 342,
    createdAt: new Date().toISOString()
  }
];

export const mockProjects: Project[] = [
  {
    id: "prj_1",
    title: "Aura Skincare Identity",
    description: "Complete brand identity and packaging design for a premium organic skincare line.",
    imageUrl: "https://picsum.photos/id/111/800/600",
    url: "https://behance.net/aura",
    tags: ["Branding", "Packaging"],
    isFeatured: true,
    order: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: "prj_2",
    title: "Fintech Dashboard",
    description: "UI/UX design for a next-generation wealth management platform.",
    imageUrl: "https://picsum.photos/id/119/800/600",
    url: "https://dribbble.com/fintech",
    tags: ["UI/UX", "Product Design"],
    isFeatured: false,
    order: 1,
    createdAt: new Date().toISOString()
  }
];

export const mockServices: Service[] = [
  {
    id: "srv_1",
    title: "Brand Identity Design",
    description: "A comprehensive brand identity package including logo, typography, color palette, and brand guidelines.",
    price: "4500",
    currency: "USD",
    duration: "4 weeks",
    ctaLabel: "Inquire",
    ctaUrl: "mailto:hello@saraalhassan.design?subject=Brand Identity Inquiry",
    isActive: true,
    order: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: "srv_2",
    title: "Website UI Design",
    description: "Custom user interface design for your marketing website or web application (up to 5 pages).",
    price: "3000",
    currency: "USD",
    duration: "3 weeks",
    ctaLabel: "Inquire",
    ctaUrl: "mailto:hello@saraalhassan.design?subject=Website UI Inquiry",
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString()
  }
];

export const mockGallery: GalleryItem[] = [
  { id: "gal_1", imageUrl: "https://picsum.photos/id/42/800/800", caption: "Studio setup", order: 0, createdAt: new Date().toISOString() },
  { id: "gal_2", imageUrl: "https://picsum.photos/id/43/800/800", caption: "Print materials", order: 1, createdAt: new Date().toISOString() },
  { id: "gal_3", imageUrl: "https://picsum.photos/id/44/800/800", caption: "Moodboard", order: 2, createdAt: new Date().toISOString() },
  { id: "gal_4", imageUrl: "https://picsum.photos/id/45/800/800", caption: "Typography exploration", order: 3, createdAt: new Date().toISOString() }
];

export const mockAnalyticsOverview: AnalyticsOverview = {
  totalViews: 12450,
  totalClicks: 3240,
  uniqueVisitors: 8900,
  viewsThisWeek: 450,
  clicksThisWeek: 120,
  topCountry: "United Arab Emirates",
  growthRate: 12.5
};

export const mockPageViews: TimeSeriesPoint[] = Array.from({ length: 30 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().split('T')[0],
    value: Math.floor(Math.random() * 100) + 20
  };
});

export const mockLinkAnalytics: LinkAnalytics[] = [
  { linkId: "lnk_1", title: "My Portfolio", url: "https://saraalhassan.design", clicks: 1245, percentage: 65.4 },
  { linkId: "lnk_2", title: "Book a consultation", url: "https://cal.com/sara/consultation", clicks: 342, percentage: 34.6 }
];
