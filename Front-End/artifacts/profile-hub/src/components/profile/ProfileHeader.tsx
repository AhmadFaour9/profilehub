import { Profile } from "@/modules/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Globe } from "lucide-react";
import { QRButton } from "./QRButton";
import { SiX, SiInstagram, SiDribbble, SiGithub, SiYoutube } from "react-icons/si";
import { Linkedin, Facebook, Link2 } from "lucide-react";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': return <SiX className="w-5 h-5" />;
      case 'linkedin': return <Linkedin className="w-5 h-5" />;
      case 'instagram': return <SiInstagram className="w-5 h-5" />;
      case 'dribbble': return <SiDribbble className="w-5 h-5" />;
      case 'github': return <SiGithub className="w-5 h-5" />;
      case 'youtube': return <SiYoutube className="w-5 h-5" />;
      case 'facebook': return <Facebook className="w-5 h-5" />;
      default: return <Link2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="relative">
      {profile.coverUrl ? (
        <div className="h-48 md:h-64 w-full relative">
          <img 
            src={profile.coverUrl} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-32 bg-muted w-full" />
      )}
      
      <div className="px-4 pb-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-end -mt-16 md:-mt-20 mb-4 relative z-10">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-sm bg-background">
            <AvatarImage src={profile.avatarUrl || ""} alt={profile.displayName} />
            <AvatarFallback className="text-4xl">{profile.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="pb-2">
            <QRButton url={`https://profilehub.app/${profile.username}`} />
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
                  {new URL(profile.website).hostname}
                </a>
              </div>
            )}
          </div>

          {profile.socialLinks && profile.socialLinks.length > 0 && (
            <div className="flex items-center gap-4 pt-2">
              {profile.socialLinks.map((social) => (
                <a 
                  key={social.platform} 
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
