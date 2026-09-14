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

const compressImage = async (file: File, maxDimension = 1600, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

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
    try {
      const compressedDataUrl = await compressImage(file);
      const timestamp = Date.now();
      const key = `${folderId}_${timestamp}`;
      await imagesStore.setItem(key, compressedDataUrl);
    } catch {
      // Fallback to uncompressed if canvas compression fails
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
        reader.readAsDataURL(file);
      });
    }
  },

  deleteImage: async (key: string): Promise<void> => {
    await imagesStore.removeItem(key);
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    const keys = await imagesStore.keys();
    const folderKeys = keys.filter(k => k.startsWith(`${folderId}_`));
    for (const k of folderKeys) {
      await imagesStore.removeItem(k);
    }
  }
};
