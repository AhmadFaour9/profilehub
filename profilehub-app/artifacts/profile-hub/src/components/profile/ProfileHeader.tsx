import type { CSSProperties } from "react";
import type { Profile, Skill } from "@/modules/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, MapPin, Globe } from "lucide-react";
import { QRButton } from "./QRButton";
import { SiBehance, SiTiktok, SiWhatsapp, SiX, SiInstagram, SiDribbble, SiGithub, SiYoutube } from "react-icons/si";
import { Linkedin, Facebook, Link2 } from "lucide-react";
import { getCategoryTone, getSkillIcon } from "@/lib/skill-icons";
import { ProfileAppearanceControls } from "@/components/LanguageToggle";
import type { Translate } from "@/lib/i18n";

const PROFILE_SKILL_LIMIT = 3;

function highlightedSkills(skills: Skill[]): Skill[] {
  const seenCategories = new Set<string>();
  const highlighted: Skill[] = [];

  for (const skill of skills) {
    if (skill.isActive === false || seenCategories.has(skill.category)) continue;
    highlighted.push(skill);
    seenCategories.add(skill.category);
    if (highlighted.length === PROFILE_SKILL_LIMIT) break;
  }

  return highlighted;
}

function ProfileAvatar({ profile }: { profile: Profile }) {
  return (
    <div className="profile-avatar-frame h-32 w-32 md:h-40 md:w-40" data-testid="profile-avatar-frame">
      <Avatar className="relative z-10 h-32 w-32 border-4 border-background bg-background shadow-xl md:h-40 md:w-40">
        <AvatarImage src={profile.avatarUrl || ""} alt={profile.displayName} />
        <AvatarFallback className="text-4xl">{profile.displayName.charAt(0)}</AvatarFallback>
      </Avatar>
    </div>
  );
}

function ProfileSkillRibbon({ skills, t }: { skills: Skill[]; t: Translate }) {
  const highlighted = highlightedSkills(skills);
  if (!highlighted.length) return null;

  return (
    <ul className="profile-skill-ribbon" aria-label={t("public.skills")} data-testid="profile-skill-ribbon">
      {highlighted.map((skill, index) => {
        const Icon = getSkillIcon(skill.name);
        const tone = getCategoryTone(skill.category);

        return (
          <li
            key={skill.id}
            className="profile-skill-ribbon__item"
            style={{ "--skill-index": index } as CSSProperties}
            title={skill.category}
          >
            {Icon ? <Icon className={`h-3.5 w-3.5 shrink-0 ${tone}`} aria-hidden /> : null}
            <span className="truncate">{skill.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ProfileHeader({ profile, profileUrl, skills = [], t }: { profile: Profile; profileUrl?: string; skills?: Skill[]; t: Translate }) {
  const activeSocialLinks = (profile.socialLinks || []).filter((social) => social.isActive !== false && social.url);
  const websiteHost = getSafeHostname(profile.website);
  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': return <SiX className="w-5 h-5" />;
      case 'linkedin': return <Linkedin className="w-5 h-5" />;
      case 'instagram': return <SiInstagram className="w-5 h-5" />;
      case 'dribbble': return <SiDribbble className="w-5 h-5" />;
      case 'github': return <SiGithub className="w-5 h-5" />;
      case 'youtube': return <SiYoutube className="w-5 h-5" />;
      case 'behance': return <SiBehance className="w-5 h-5" />;
      case 'tiktok': return <SiTiktok className="w-5 h-5" />;
      case 'whatsapp': return <SiWhatsapp className="w-5 h-5" />;
      case 'facebook': return <Facebook className="w-5 h-5" />;
      case 'email': return <Mail className="w-5 h-5" />;
      default: return <Link2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="relative">
      <ProfileAppearanceControls />
      {profile.coverUrl ? (
        <div className="h-48 md:h-64 w-full relative">
          <img 
            src={profile.coverUrl} 
            alt={`${profile.displayName} cover`}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            sizes="100vw"
          />
        </div>
      ) : (
        <div className="h-32 bg-muted w-full" />
      )}
      
      <div className="px-4 pb-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-end -mt-16 md:-mt-20 mb-4 relative z-10">
          <ProfileAvatar profile={profile} />
          
          <div className="pb-2">
            <QRButton username={profile.username} url={profileUrl} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">{profile.displayName}</h1>
            {profile.profession && (
              <p className="text-lg text-muted-foreground mt-1">{profile.profession}</p>
            )}
            <ProfileSkillRibbon skills={skills} t={t} />
          </div>
          
          {profile.bio && (
            <p className="text-foreground/90 max-w-xl leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {profile.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  {websiteHost || profile.website}
                </a>
              </div>
            )}
          </div>

          {activeSocialLinks.length > 0 && (
            <div className="flex items-center gap-4 pt-2">
              {activeSocialLinks.map((social) => (
                <a 
                  key={`${social.platform}-${social.url}`}
                  href={social.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={social.platform}
                >
                  {getSocialIcon(social.platform)}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSafeHostname(value: string | null | undefined): string {
  if (!value) return "";

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
