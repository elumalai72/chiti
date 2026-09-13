import localforage from 'localforage';

export interface LocalFolder {
  id: string; // The date string YYYY-MM-DD
  name: string; // The date string
}

export interface LocalImage {
  id: string;
  folderId: string;
  name: string;
  dataUrl: string; // base64 string
  createdTime: number;
}

const imagesStore = localforage.createInstance({
  name: 'ChitiApp',
  storeName: 'bookImages'
});

export const localBookService = {
  getDateFolders: async (): Promise<LocalFolder[]> => {
    const keys = await imagesStore.keys();
    const folderIds = new Set<string>();
    
    for (const key of keys) {
      const folderId = key.split('_')[0];
      if (folderId) folderIds.add(folderId);
    }
    
    return Array.from(folderIds)
      .sort((a, b) => b.localeCompare(a)) // sort descending
      .map(id => ({ id, name: id }));
  },

  getImagesInFolder: async (folderId: string): Promise<LocalImage[]> => {
    const keys = await imagesStore.keys();
    const folderKeys = keys.filter(k => k.startsWith(`${folderId}_`));
    
    const images: LocalImage[] = [];
    for (const key of folderKeys) {
      const dataUrl = await imagesStore.getItem<string>(key);
      if (dataUrl) {
        images.push({
          id: key,
          folderId,
          name: key,
          dataUrl,
          createdTime: parseInt(key.split('_')[1] || '0', 10)
        });
      }
    }
    
    return images.sort((a, b) => b.createdTime - a.createdTime);
  },

  uploadImage: async (file: File, folderId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          const timestamp = Date.now();
          const key = `${folderId}_${timestamp}`;
          try {
            await imagesStore.setItem(key, e.target.result as string);
            resolve();
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file); // Store as Base64 string for easy <img> rendering
    });
  }
};
