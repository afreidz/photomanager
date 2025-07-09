import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { GalleryForm } from './GalleryForm';
import { useGalleryStore } from '@/hooks/useGalleryStore';
import type { Gallery } from '@/lib/db/schema';

interface GalleryPageManagerProps {
  gallery: Gallery;
  onGalleryUpdated?: () => void;
}

export const GalleryPageManager = observer(function GalleryPageManager({ gallery, onGalleryUpdated }: GalleryPageManagerProps) {
  const galleryStore = useGalleryStore();
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingGallery, setEditingGallery] = useState<Gallery | undefined>(undefined);

  useEffect(() => {
    // Set up edit button event listener
    const editButton = document.getElementById('edit-gallery-btn');
    if (editButton) {
      const handleEditClick = () => {
        setEditingGallery(gallery);
        setShowEditForm(true);
      };
      
      editButton.addEventListener('click', handleEditClick);
      
      // Cleanup event listener on unmount
      return () => {
        editButton.removeEventListener('click', handleEditClick);
      };
    }
  }, [gallery]);

  const handleEditSuccess = () => {
    galleryStore.refresh();
    onGalleryUpdated?.();
    // Refresh the page to show updated gallery details
    window.location.reload();
  };

  return (
    <GalleryForm
      open={showEditForm}
      onOpenChange={setShowEditForm}
      gallery={editingGallery}
      onSuccess={handleEditSuccess}
    />
  );
});
