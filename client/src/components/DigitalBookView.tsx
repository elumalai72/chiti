import React, { useState, useEffect, useRef } from 'react';
import { localBookService, LocalFolder, LocalImage } from '../services/localBookService';
import { Folder, Image as ImageIcon, Camera, Upload, ArrowLeft, Loader2 } from 'lucide-react';

export const DigitalBookView: React.FC = () => {
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<LocalFolder | null>(null);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      const dateFolders = await localBookService.getDateFolders();
      setFolders(dateFolders);
    } catch (err) {
      console.error('Failed to load folders', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFolder = async (folder: LocalFolder) => {
    setCurrentFolder(folder);
    setIsLoading(true);
    try {
      const folderImages = await localBookService.getImagesInFolder(folder.id);
      setImages(folderImages);
    } catch (err) {
      console.error('Failed to load images', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const targetFolderId = (currentFolder && currentFolder.id === today) ? currentFolder.id : today;

      for (let i = 0; i < files.length; i++) {
        await localBookService.uploadImage(files[i], targetFolderId);
      }

      // Refresh view
      if (currentFolder && currentFolder.id === targetFolderId) {
        handleOpenFolder(currentFolder);
      } else {
        loadFolders();
      }

      // Show a temporary success message
      const btn = document.getElementById('camera-btn');
      if (btn) {
        const ogBg = btn.style.background;
        btn.style.background = '#10B981'; // Green
        setTimeout(() => { btn.style.background = ogBg; }, 1500);
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 80px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
            {currentFolder ? currentFolder.name : 'Digital Chiti Book'}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B' }}>
            {currentFolder ? 'Images inside this folder' : 'Local Device Storage'}
          </p>
        </div>
        {currentFolder && (
          <button 
            onClick={() => setCurrentFolder(null)}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={16} /> Back to Folders
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 size={32} className="spin" color="#7C3AED" />
        </div>
      ) : currentFolder ? (
        /* Image Grid */
        <div>
          {images.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
              <ImageIcon size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>No images found in this folder.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {images.map(img => (
                <div 
                  key={img.id} 
                  style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0', background: '#F8FAFC' }}
                >
                  <img 
                    src={img.dataUrl} 
                    alt={img.name} 
                    style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '8px', fontSize: '11px', color: '#64748B', textAlign: 'center', borderTop: '1px solid #E2E8F0' }}>
                    {new Date(img.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Folder Grid */
        <div>
          {folders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
              <Folder size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>No date folders found. Take a picture to create one!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
              {folders.map(folder => (
                <div 
                  key={folder.id}
                  onClick={() => handleOpenFolder(folder)}
                  style={{ 
                    background: '#FFFFFF', 
                    border: '1px solid #E2E8F0', 
                    borderRadius: '16px', 
                    padding: '20px', 
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                  className="hover-lift"
                >
                  <Folder size={40} color="#7C3AED" fill="rgba(124, 58, 237, 0.1)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{folder.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Action Buttons for Camera/Upload */}
      <div style={{ position: 'fixed', bottom: '80px', right: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
          multiple
        />
        
        {isUploading ? (
          <div style={{ width: '56px', height: '56px', background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}>
            <Loader2 size={24} className="spin" />
          </div>
        ) : (
          <>
            <button 
              onClick={() => {
                fileInputRef.current?.removeAttribute('capture');
                fileInputRef.current?.click();
              }}
              style={{ width: '48px', height: '48px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', cursor: 'pointer' }}
              aria-label="Upload Image"
            >
              <Upload size={20} />
            </button>
            <button 
              id="camera-btn"
              onClick={() => {
                fileInputRef.current?.setAttribute('capture', 'environment');
                fileInputRef.current?.click();
              }}
              style={{ width: '56px', height: '56px', background: '#7C3AED', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)', cursor: 'pointer', transition: 'background 0.3s ease' }}
              aria-label="Take Photo"
            >
              <Camera size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
