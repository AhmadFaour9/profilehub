import { mockGallery, mockLinks, mockProjects, mockServices, mockUser } from "@/lib/mock-data";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SmartLinkCard } from "@/components/profile/SmartLinkCard";
import { ProjectCard } from "@/components/profile/ProjectCard";
import { ServiceCard } from "@/components/profile/ServiceCard";
import { GalleryGrid } from "@/components/profile/GalleryGrid";

export function MobilePreview({ username }: { username: string }) {
  const profile = { ...mockUser, username };

  return (
    <div className="hidden lg:block sticky top-8" data-testid="mobile-preview">
      <div className="w-[320px] h-[680px] rounded-[3rem] border-8 border-black overflow-hidden shadow-2xl relative bg-background">
        <div className="absolute top-0 inset-x-0 h-6 bg-black z-20 rounded-b-3xl mx-16"></div>
        <div className="absolute inset-0 overflow-y-auto no-scrollbar pt-6">
           <div className="pointer-events-none origin-top scale-[0.85] w-[117%] -ml-[8.5%]">
             <div className="min-h-screen bg-background text-foreground pb-20">
               <ProfileHeader profile={profile} />
               <div className="px-4 mt-8 space-y-10">
                 <div className="space-y-3">
                   {mockLinks.map((link) => (
                     <SmartLinkCard key={link.id} link={link} theme={profile.theme} />
                   ))}
                 </div>
                 <div className="grid gap-6">
                   {mockProjects.slice(0, 1).map((project) => (
                     <ProjectCard key={project.id} project={project} theme={profile.theme} />
                   ))}
                 </div>
                 <div className="grid gap-4">
                   {mockServices.slice(0, 1).map((service) => (
                     <ServiceCard key={service.id} service={service} theme={profile.theme} />
                   ))}
                 </div>
                 <GalleryGrid items={mockGallery.slice(0, 4)} />
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
