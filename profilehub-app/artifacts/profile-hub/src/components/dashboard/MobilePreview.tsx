import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SmartLinkCard } from "@/components/profile/SmartLinkCard";
import { ProjectCard } from "@/components/profile/ProjectCard";
import { ServiceCard } from "@/components/profile/ServiceCard";
import { GalleryGrid } from "@/components/profile/GalleryGrid";
import type { Profile, Link, Project, Service, GalleryItem } from "@/modules/shared";

interface MobilePreviewProps {
  profile: Profile;
  links?: Link[];
  projects?: Project[];
  services?: Service[];
  gallery?: GalleryItem[];
}

export function MobilePreview({ profile, links = [], projects = [], services = [], gallery = [] }: MobilePreviewProps) {
  const visibleLinks = links.filter((link) => link.isActive && link.type !== "social");

  return (
    <div className="hidden lg:block sticky top-8" data-testid="mobile-preview">
      <div className="w-[320px] h-[680px] rounded-[3rem] border-8 border-black overflow-hidden shadow-2xl relative bg-background" style={profile.theme?.backgroundColor ? { backgroundColor: profile.theme.backgroundColor } : undefined}>
        <div className="absolute top-0 inset-x-0 h-6 bg-black z-20 rounded-b-3xl mx-16"></div>
        <div className="absolute inset-0 overflow-y-auto no-scrollbar pt-6">
           <div className="pointer-events-none origin-top scale-[0.85] w-[117%] -ml-[8.5%]">
             <div className="min-h-screen text-foreground pb-20">
               <ProfileHeader profile={profile} />
               <div className="px-4 mt-8 space-y-10">
                 
                 <div className="space-y-3">
                   {visibleLinks.length > 0 ? (
                     visibleLinks.map((link) => (
                       <SmartLinkCard key={link.id} link={link} theme={profile.theme} />
                     ))
                   ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground border rounded-xl border-dashed">No links yet</div>
                   )}
                 </div>
                 
                 <div className="grid gap-6">
                   {projects.length > 0 ? (
                     projects.slice(0, 3).map((project) => (
                       <ProjectCard key={project.id} project={project} theme={profile.theme} />
                     ))
                   ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground border rounded-xl border-dashed">No projects yet</div>
                   )}
                 </div>
                 
                 <div className="grid gap-4">
                   {services.length > 0 ? (
                     services.slice(0, 3).map((service) => (
                       <ServiceCard key={service.id} service={service} theme={profile.theme} />
                     ))
                   ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground border rounded-xl border-dashed">Add your first service</div>
                   )}
                 </div>
                 
                 {gallery.length > 0 ? (
                   <GalleryGrid items={gallery.slice(0, 6)} />
                 ) : (
                   <div className="p-4 text-center text-sm text-muted-foreground border rounded-xl border-dashed mx-4">No media yet</div>
                 )}
                 
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
