import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useGalleryStore } from '@/hooks/useGalleryStore';

export const StoreInitializer = observer(function StoreInitializer() {
  const galleryStore = useGalleryStore();

  useEffect(() => {
    // Initialize the store when the app loads
    galleryStore.fetchCounts();
  }, [galleryStore]);

  return null; // This component doesn't render anything
});
