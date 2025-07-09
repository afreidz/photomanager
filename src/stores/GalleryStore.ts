import { makeAutoObservable, runInAction } from 'mobx';
import type { Gallery } from '@/lib/db/schema';
import { actions } from 'astro:actions';
import { appStore } from '@/stores/AppStore';

export interface GalleryCounts {
  total: number;
  featured: number;
  private: number;
}

export interface AppCounts {
  galleries: GalleryCounts;
  photos: number;
}

export interface GalleryFilters {
  type: 'all' | 'featured' | 'private';
  search: string;
}

export class GalleryStore {
  // Observable state
  galleries: Gallery[] = [];
  counts: GalleryCounts = { total: 0, featured: 0, private: 0 };
  isLoading = false;
  error: string | null = null;
  filters: GalleryFilters = { type: 'all', search: '' };

  constructor() {
    makeAutoObservable(this);
  }

  // Computed values
  get filteredGalleries() {
    let filtered = this.galleries;

    // Filter by type
    if (this.filters.type === 'featured') {
      filtered = filtered.filter(g => g.isFeatured);
    } else if (this.filters.type === 'private') {
      filtered = filtered.filter(g => !g.isPublic);
    }

    // Filter by search
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(search) ||
        (g.description && g.description.toLowerCase().includes(search))
      );
    }

    return filtered;
  }

  get isFilterActive() {
    return this.filters.type !== 'all' || this.filters.search !== '';
  }

  // Actions
  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  setFilters(filters: Partial<GalleryFilters>) {
    Object.assign(this.filters, filters);
  }

  clearFilters() {
    this.filters = { type: 'all', search: '' };
  }

  // Gallery CRUD operations
  async fetchGalleries() {
    this.setLoading(true);
    this.setError(null);

    try {
      // Fetch all galleries using Astro actions
      console.log('Fetching galleries...'); // Debug log
      const result = await actions.galleries.getAll({ limit: 1000, offset: 0 });
      console.log('Galleries fetched:', result); // Debug log

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch galleries');
      }

      const data = result.data?.galleries || [];

      runInAction(() => {
        this.galleries = Array.isArray(data) ? data : [];
      });
    } catch (error) {
      console.error('Error fetching galleries:', error); // Additional error log
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to fetch galleries');
      });
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  async fetchCounts() {
    try {
      const result = await actions.galleries.getCounts({});
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch counts');
      }
      
      const counts = result.data;

      runInAction(() => {
        if (counts && typeof counts === 'object' && 'total' in counts) {
          this.counts = { ...counts };
        }
      });
    } catch (error) {
      console.error('Failed to fetch gallery counts:', error);
    }
  }

  async createGallery(galleryData: {
    name: string;
    description?: string;
    isPublic: boolean;
    isFeatured: boolean;
  }) {
    this.setLoading(true);
    this.setError(null);

    try {
      const form = new FormData();
      form.append('name', galleryData.name);
      if (galleryData.description) {
        form.append('description', galleryData.description);
      }
      form.append('isPublic', galleryData.isPublic.toString());
      form.append('isFeatured', galleryData.isFeatured.toString());

      const response = await fetch('/_actions/galleries.create', {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create gallery');
      }

      const result = await response.json();
      const data = Array.isArray(result) ? result[0] : result;

      runInAction(() => {
        if (data.gallery) {
          this.galleries.push(data.gallery);
          // Fetch fresh counts from server instead of calculating locally
          this.fetchCounts();
          // Also refresh app store gallery counts
          appStore.refreshGalleryCounts();
        }
      });

      return data.gallery;
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to create gallery');
      });
      throw error;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  async updateGallery(galleryId: string, galleryData: {
    name: string;
    description?: string;
    isPublic: boolean;
    isFeatured: boolean;
  }) {
    this.setLoading(true);
    this.setError(null);

    try {
      const form = new FormData();
      form.append('id', galleryId);
      form.append('name', galleryData.name);
      if (galleryData.description) {
        form.append('description', galleryData.description);
      }
      form.append('isPublic', galleryData.isPublic.toString());
      form.append('isFeatured', galleryData.isFeatured.toString());

      const response = await fetch('/_actions/galleries.update', {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update gallery');
      }

      const result = await response.json();
      const data = Array.isArray(result) ? result[0] : result;

      runInAction(() => {
        if (data.gallery) {
          const index = this.galleries.findIndex(g => g.id === galleryId);
          if (index !== -1) {
            this.galleries[index] = data.gallery;
            // Fetch fresh counts from server instead of calculating locally
            this.fetchCounts();
            // Also refresh app store gallery counts
            appStore.refreshGalleryCounts();
          }
        }
      });

      return data.gallery;
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to update gallery');
      });
      throw error;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  async deleteGallery(galleryId: string) {
    this.setLoading(true);
    this.setError(null);

    try {
      const form = new FormData();
      form.append('id', galleryId);

      const response = await fetch('/_actions/galleries.delete', {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete gallery');
      }

      runInAction(() => {
        this.galleries = this.galleries.filter(g => g.id !== galleryId);
        // Fetch fresh counts from server instead of calculating locally
        this.fetchCounts();
        // Also refresh app store gallery counts
        appStore.refreshGalleryCounts();
      });
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to delete gallery');
      });
      throw error;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }


  // Method to manually refresh data
  async refresh() {
    await Promise.all([
      this.fetchGalleries(),
      this.fetchCounts()
    ]);
  }
}

// Create a singleton store instance
export const galleryStore = new GalleryStore();
