import { useContext, createContext } from 'react';
import { galleryStore, GalleryStore } from '@/stores/GalleryStore';

// Create context for the store (useful for testing)
const GalleryStoreContext = createContext<GalleryStore>(galleryStore);

// Hook to use the gallery store
export const useGalleryStore = () => {
  return useContext(GalleryStoreContext);
};

// Provider component (optional, for testing or if you need multiple store instances)
export const GalleryStoreProvider = GalleryStoreContext.Provider;

// For convenience, also export the store directly
export { galleryStore };
