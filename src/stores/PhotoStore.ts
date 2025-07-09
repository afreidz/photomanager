import { makeAutoObservable, runInAction } from 'mobx';
import type { Photo } from '@/lib/db/schema';
import { actions } from 'astro:actions';
import { appStore } from '@/stores/AppStore';

export interface PhotoFilters {
  search: string;
  tags: string[];
  galleryId?: string;
}

export class PhotoStore {
  // Observable state
  photos: Photo[] = [];
  isLoading = false;
  error: string | null = null;
  filters: PhotoFilters = { search: '', tags: [] };
  pagination = {
    limit: 20,
    offset: 0,
    hasMore: true,
  };

  constructor() {
    makeAutoObservable(this);
  }

  // Actions
  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  setFilters(filters: Partial<PhotoFilters>) {
    Object.assign(this.filters, filters);
    // Reset pagination when filters change
    this.pagination.offset = 0;
    this.pagination.hasMore = true;
  }

  clearFilters() {
    this.filters = { search: '', tags: [] };
    this.pagination.offset = 0;
    this.pagination.hasMore = true;
  }

  // Fetch photos with current filters
  async fetchPhotos(append = false) {
    if (!append) {
      this.setLoading(true);
    }
    this.setError(null);

    try {
      const result = await actions.photos.list({
        search: this.filters.search || undefined,
        galleryId: this.filters.galleryId,
        limit: this.pagination.limit,
        offset: append ? this.pagination.offset : 0,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      runInAction(() => {
        if (result.data) {
          // Parse tags from JSON strings
          const formattedPhotos = result.data.photos.map(photo => ({
            ...photo,
            tags: photo.tags ? JSON.parse(photo.tags) : []
          }));

          if (append) {
            this.photos = [...this.photos, ...formattedPhotos];
          } else {
            this.photos = formattedPhotos;
            this.pagination.offset = 0;
          }

          // Update pagination
          this.pagination.offset += formattedPhotos.length;
          this.pagination.hasMore = formattedPhotos.length === this.pagination.limit;
        }
      });
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to fetch photos');
      });
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  // Load more photos (for pagination)
  async loadMore() {
    if (this.pagination.hasMore && !this.isLoading) {
      await this.fetchPhotos(true);
    }
  }

  // Search photos
  async searchPhotos(searchTerm: string) {
    this.setFilters({ search: searchTerm });
    await this.fetchPhotos();
  }

  // Filter by tags
  async filterByTags(tags: string[]) {
    this.setFilters({ tags });
    await this.fetchPhotos();
  }

  // Filter by gallery
  async filterByGallery(galleryId?: string) {
    this.setFilters({ galleryId });
    await this.fetchPhotos();
  }

  // Create new photo
  async createPhoto(photoData: {
    title: string;
    description?: string;
    galleryId?: string;
    tags: string[];
    file: File;
  }) {
    this.setLoading(true);
    this.setError(null);

    try {
      const formData = new FormData();
      formData.append('title', photoData.title);
      if (photoData.description) formData.append('description', photoData.description);
      if (photoData.galleryId) formData.append('galleryId', photoData.galleryId);
      formData.append('tags', JSON.stringify(photoData.tags));
      formData.append('file', photoData.file);
      
      const result = await actions.photos.upload(formData);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.data) {
        runInAction(() => {
          // Add new photo to the beginning of the list
          const newPhoto = {
            ...result.data.photo,
            tags: result.data.photo.tags ? JSON.parse(result.data.photo.tags) : []
          };
          this.photos = [newPhoto, ...this.photos];
        });
        
        // Refresh photo count in app store
        appStore.refreshPhotoCounts();
      }

      return result.data?.photo;
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to create photo');
      });
      throw error;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  // Update photo
  async updatePhoto(photoId: string, photoData: {
    title: string;
    description?: string;
    tags: string[];
  }) {
    this.setLoading(true);
    this.setError(null);

    try {
      const result = await actions.photos.update({
        id: photoId,
        ...photoData,
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.data) {
        runInAction(() => {
          const index = this.photos.findIndex(p => p.id === photoId);
          if (index !== -1) {
            this.photos[index] = {
              ...result.data.photo,
              tags: result.data.photo.tags ? JSON.parse(result.data.photo.tags) : []
            };
          }
        });
      }

      return result.data?.photo;
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to update photo');
      });
      throw error;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  // Delete photo
  async deletePhoto(photoId: string) {
    this.setLoading(true);
    this.setError(null);

    try {
      const result = await actions.photos.delete({ id: photoId });
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      runInAction(() => {
        this.photos = this.photos.filter(p => p.id !== photoId);
      });
      
      // Refresh photo count in app store
      appStore.refreshPhotoCounts();
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to delete photo');
      });
      throw error;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  // Method to manually refresh photos
  async refresh() {
    await this.fetchPhotos();
  }
}

// Create a singleton store instance
export const photoStore = new PhotoStore();
