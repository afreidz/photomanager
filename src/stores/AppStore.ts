import { makeAutoObservable, runInAction } from 'mobx';
import { actions } from 'astro:actions';

export interface AppCounts {
  galleries: {
    total: number;
    featured: number;
    private: number;
  };
  photos: number;
}

export class AppStore {
  // Observable state
  counts: AppCounts = {
    galleries: { total: 0, featured: 0, private: 0 },
    photos: 0
  };
  isLoading = false;
  error: string | null = null;

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

  async fetchCounts() {
    this.setLoading(true);
    this.setError(null);

    try {
      // Fetch both gallery and photo counts in parallel
      const [galleryResult, photoResult] = await Promise.all([
        actions.galleries.getCounts({}),
        actions.photos.getCount({})
      ]);

      if (galleryResult.error) {
        throw new Error(galleryResult.error.message || 'Failed to fetch gallery counts');
      }

      if (photoResult.error) {
        throw new Error(photoResult.error.message || 'Failed to fetch photo count');
      }

      runInAction(() => {
        this.counts = {
          galleries: galleryResult.data || { total: 0, featured: 0, private: 0 },
          photos: photoResult.data?.count || 0
        };
      });
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to fetch counts');
      });
      console.error('Failed to fetch app counts:', error);
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  // Method to update specific counts after operations
  async refreshGalleryCounts() {
    try {
      const result = await actions.galleries.getCounts({});
      if (result.data) {
        runInAction(() => {
          this.counts.galleries = result.data;
        });
      }
    } catch (error) {
      console.error('Failed to refresh gallery counts:', error);
    }
  }

  async refreshPhotoCounts() {
    try {
      const result = await actions.photos.getCount({});
      if (result.data) {
        runInAction(() => {
          this.counts.photos = result.data.count;
        });
      }
    } catch (error) {
      console.error('Failed to refresh photo counts:', error);
    }
  }

  // Method to manually refresh all data
  async refresh() {
    await this.fetchCounts();
  }
}

// Create a singleton store instance
export const appStore = new AppStore();
