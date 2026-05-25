export type SocialLink = {
  platform: string;
  url: string;
};

export type ProfileTheme = {
  id?: string;
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  buttonStyle?: "rounded" | "pill" | "sharp";
  layout?: "centered" | "left" | string;
};

export type Profile = {
  id: string;
  userId?: string;
  username: string;
  displayName: string;
  title?: string | null;
  profession?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  email?: string | null;
  location?: string | null;
  website?: string | null;
  themeId?: string | null;
  theme?: ProfileTheme;
  socialLinks?: SocialLink[];
  isPublished: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Link = {
  id: string;
  profileId?: string;
  title: string;
  url: string;
  description?: string | null;
  icon?: string | null;
  thumbnailUrl?: string | null;
  type?: string | null;
  position?: number;
  order?: number;
  isActive: boolean;
  isPinned?: boolean;
  clickCount: number;
  createdAt: string;
  updatedAt?: string;
};

export type Project = {
  id: string;
  profileId?: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  projectUrl?: string | null;
  repoUrl?: string | null;
  url?: string | null;
  tags: string[];
  position?: number;
  order?: number;
  isFeatured: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type Service = {
  id: string;
  profileId?: string;
  title: string;
  description?: string | null;
  priceLabel?: string | null;
  price?: string | null;
  currency?: string | null;
  duration?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  position?: number;
  order?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type GalleryItem = {
  id: string;
  profileId?: string;
  url?: string;
  imageUrl?: string;
  alt?: string | null;
  caption?: string | null;
  type?: string | null;
  position?: number;
  order?: number;
  createdAt: string;
};

export type PublicProfile = Profile & {
  links: Link[];
  projects: Project[];
  services: Service[];
  gallery: GalleryItem[];
};

export type AnalyticsOverview = {
  totalViews: number;
  totalClicks: number;
  uniqueVisitors: number;
  viewsThisWeek: number;
  clicksThisWeek: number;
  topCountry?: string | null;
  growthRate: number;
  conversionRate?: number;
};

export type TimeSeriesPoint = {
  date: string;
  value: number;
};

export type LinkAnalytics = {
  linkId: string;
  title: string;
  url: string;
  clicks: number;
  percentage: number;
};
