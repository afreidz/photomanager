import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { GalleryForm } from './GalleryForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useGalleryStore } from '@/hooks/useGalleryStore';
import { GalleryCard } from './GalleryCard';

export const GalleryManagement = observer(function GalleryManagement() {
  const galleryStore = useGalleryStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingGallery, setEditingGallery] = useState(undefined);

  // Ensure galleries is always an array
  const galleries = Array.isArray(galleryStore.galleries) ? galleryStore.galleries : [];

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
  }, [galleries]);

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
  if (galleryStore.isLoading && galleries.length === 0) {
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
              Galleries
            </h1>
            <p className="text-muted-foreground mt-1">
              {galleries.length} galleries
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
        {galleries.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No galleries yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first gallery to start organizing your photos. You can set galleries as public or private, and feature them on your site.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {galleries.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} showManageButton={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

