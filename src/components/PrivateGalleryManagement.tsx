import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { GalleryForm } from './GalleryForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useGalleryStore } from '@/hooks/useGalleryStore';
import { GalleryCard } from './GalleryCard';

export const PrivateGalleryManagement = observer(function PrivateGalleryManagement() {
  const galleryStore = useGalleryStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingGallery, setEditingGallery] = useState(undefined);

  // Filter for private galleries only
  const privateGalleries = Array.isArray(galleryStore.galleries) 
    ? galleryStore.galleries.filter(gallery => !gallery.isPublic)
    : [];

  useEffect(() => {
    // Initialize galleries on component mount
    galleryStore.fetchGalleries();
  }, []);

  useEffect(() => {
    // Set up edit button event listeners
    const editButtons = document.querySelectorAll('.edit-gallery-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const galleryData = JSON.parse((e.currentTarget as HTMLElement).dataset.gallery || '{}');
        setEditingGallery(galleryData);
        setShowEditForm(true);
      });
    });

    // Set up delete button event listeners
    const deleteButtons = document.querySelectorAll('.delete-gallery-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const galleryId = target.dataset.galleryId || '';
        const galleryName = target.dataset.galleryName || '';
        handleDelete(galleryId, galleryName);
      });
    });
  }, [privateGalleries]);

  const handleDelete = async (galleryId: string, galleryName: string) => {
    if (!confirm(`Are you sure you want to delete "${galleryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await galleryStore.deleteGallery(galleryId);
    } catch (error) {
      console.error('Error deleting gallery:', error);
      alert('An error occurred while deleting the gallery');
    }
  };

  const handleCreateSuccess = () => {
    galleryStore.refresh();
  };

  const handleEditSuccess = () => {
    galleryStore.refresh();
  };

  // Loading state
  if (galleryStore.isLoading && privateGalleries.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading galleries...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Private Galleries
            </h1>
            <p className="text-muted-foreground mt-1">
              {privateGalleries.length} private galleries
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Gallery
          </Button>
        </div>

        {/* Gallery Form Modals */}
        <GalleryForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onSuccess={handleCreateSuccess}
        />
        
        <GalleryForm
          open={showEditForm}
          onOpenChange={setShowEditForm}
          gallery={editingGallery}
          onSuccess={handleEditSuccess}
        />

        {/* Gallery Cards or Empty State */}
        {privateGalleries.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No private galleries yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't created any private galleries yet. Private galleries are only visible to you and won't appear on your public site.
            </p>
            <a href="/galleries" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              View All Galleries
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {privateGalleries.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} showManageButton={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
