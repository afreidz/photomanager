export function reorderPhotos(photos: any[], newOrder: string[]): any[] {
  return newOrder.map((index: string) => photos.find((photo: any) => photo.id === index));
}
