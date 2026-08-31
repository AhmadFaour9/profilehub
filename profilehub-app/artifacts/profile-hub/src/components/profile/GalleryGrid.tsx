import { GalleryItem } from "@/modules/shared";

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  return (
    <div className="@container grid grid-cols-2 @md:grid-cols-3 gap-2 @md:gap-4" data-testid="gallery-grid">
      {items.map((item, idx) => (
        <div 
          key={item.id} 
          className="aspect-square w-full rounded-md overflow-hidden bg-muted group relative"
        >
          <img 
            src={item.imageUrl} 
            alt={item.caption || ""} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading={idx < 3 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={idx < 3 ? "high" : "low"}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {item.caption && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
              <span className="text-white text-sm truncate">{item.caption}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
