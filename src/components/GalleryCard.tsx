import React from 'react';
import { getImageUrls } from '@/lib/image-client';
import type { Gallery } from '@/lib/db/schema';

interface CoverImage {
  imageId: string;
}

interface GalleryWithExtras extends Gallery {
  photoCount: number;
  coverImage?: CoverImage | null;
}

interface GalleryCardProps {
  gallery: GalleryWithExtras;
  showManageButton?: boolean;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({ 
  gallery, 
  showManageButton = false 
}) => {
  return (
    <div 
      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group" 
      data-gallery-id={gallery.id}
    >
      {/* Cover Image */}
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        {gallery.coverImage ? (
          <img 
            src={getImageUrls(gallery.coverImage.imageId).medium} 
            alt={gallery.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        
        {/* Featured Badge */}
        {gallery.isFeatured && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-500 text-yellow-900 font-medium">
              Featured
            </span>
          </div>
        )}
        
        {/* Private Badge for Private Only Views */}
        {!gallery.isPublic && !gallery.isFeatured && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-500 text-white font-medium">
              Private
            </span>
          </div>
        )}
        
        {/* Additional Featured Badge for Private Featured Galleries */}
        {!gallery.isPublic && gallery.isFeatured && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-500 text-yellow-900 font-medium">
              Featured
            </span>
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-card-foreground mb-2 truncate">{gallery.name}</h3>
        
        {gallery.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{gallery.description}</p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{gallery.photoCount} photos</span>
          <span className="text-xs text-muted-foreground">
            {gallery.updatedAt ? new Date(gallery.updatedAt).toLocaleDateString() : 'Unknown'}
          </span>
        </div>
        
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                gallery.isPublic 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {gallery.isPublic ? 'Public' : 'Private'}
              </span>
              {gallery.isFeatured && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  Featured
                </span>
              )}
            </div>
            
            {/* Edit/Delete Actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <button 
                className="edit-gallery-btn p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                data-gallery={JSON.stringify(gallery)}
                title="Edit gallery"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button 
                className="delete-gallery-btn p-1.5 text-muted-foreground hover:text-destructive hover:bg-accent rounded transition-colors"
                data-gallery-id={gallery.id}
                data-gallery-name={gallery.name}
                title="Delete gallery"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Manage Photos Button */}
          {showManageButton && (
            <a 
              href={`/galleries/${gallery.id}`} 
              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Manage Photos
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
