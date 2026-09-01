import type { CSSProperties } from "react";
import type { Profile, Skill } from "@/modules/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, MapPin, Globe } from "lucide-react";
import { QRButton } from "./QRButton";
import { SiBehance, SiTiktok, SiWhatsapp, SiX, SiInstagram, SiDribbble, SiGithub, SiYoutube } from "react-icons/si";
import { Linkedin, Facebook, Link2 } from "lucide-react";
import { getCategoryTone, getSkillIcon } from "@/lib/skill-icons";
import { ProfileAppearanceControls } from "@/components/LanguageToggle";

const ORBIT_POSITIONS = [
  "-top-2 left-1/2 -translate-x-1/2",
  "right-0 top-1/4 translate-x-1/3",
  "bottom-0 right-1/4 translate-y-1/3",
  "bottom-1/4 left-0 -translate-x-1/3",
] as const;

function featuredSkills(skills: Skill[]): Skill[] {
  const seenCategories = new Set<string>();
  const featured: Skill[] = [];

  for (const skill of skills) {
    if (skill.isActive === false || seenCategories.has(skill.category)) continue;
    featured.push(skill);
    seenCategories.add(skill.category);
    if (featured.length === ORBIT_POSITIONS.length) break;
  }

  return featured;
}

function ProfileSkillOrbit({ profile, skills }: { profile: Profile; skills: Skill[] }) {
  const orbitSkills = featuredSkills(skills);

  return (
    <div
      className="profile-skill-orbit relative h-32 w-32 md:h-40 md:w-40"
      data-testid="profile-skill-orbit"
    >
      {orbitSkills.length > 0 && (
        <>
          <span className="profile-skill-orbit__halo" aria-hidden />
          <span className="profile-skill-orbit__ring" aria-hidden />
          {orbitSkills.map((skill, index) => {
            const Icon = getSkillIcon(skill.name);
            const tone = getCategoryTone(skill.category);

            return (
              <span
                key={skill.id}
                className={`profile-skill-orbit__satellite ${ORBIT_POSITIONS[index]}`}
                style={{ "--skill-delay": `${index * -0.7}s` } as CSSProperties}
                aria-hidden
              >
                {Icon ? <Icon className={`h-3.5 w-3.5 ${tone}`} /> : <SparkleMark className={`h-3.5 w-3.5 ${tone}`} />}
              </span>
            );
          })}
        </>
      )}

      <Avatar className="profile-skill-orbit__avatar h-32 w-32 border-4 border-background bg-background shadow-lg md:h-40 md:w-40">
        <AvatarImage src={profile.avatarUrl || ""} alt={profile.displayName} />
        <AvatarFallback className="text-4xl">{profile.displayName.charAt(0)}</AvatarFallback>
      </Avatar>
    </div>
  );
}

function SparkleMark({ className }: { className?: string }) {
  return <span className={`block rounded-full bg-current ${className || ""}`} />;
}

export function ProfileHeader({ profile, profileUrl, skills = [] }: { profile: Profile; profileUrl?: string; skills?: Skill[] }) {
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
          <ProfileSkillOrbit profile={profile} skills={skills} />
          
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
