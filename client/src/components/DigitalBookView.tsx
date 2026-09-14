import React, { useState, useEffect, useRef } from 'react';
import { localBookService, LocalFolder, LocalImage } from '../services/localBookService';
import { 
  Folder, 
  Image as ImageIcon, 
  Camera, 
  Upload, 
  ArrowLeft, 
  Loader2, 
  Trash2, 
  X, 
  Plus,
  ZoomIn,
  Edit3
} from 'lucide-react';

export const DigitalBookView: React.FC = () => {
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<LocalFolder | null>(null);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<LocalImage | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'folder' | 'image', id: string, currentName: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Dedicated inputs for Camera and Gallery to ensure 100% reliability on mobile Android & iOS
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        await handleOpenFolder(currentFolder);
      } else {
        await loadFolders();
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      alert('Failed to save photo. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset inputs so selecting the same file again triggers onChange
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageKey: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await localBookService.deleteImage(imageKey);
      setImages(prev => prev.filter(img => img.id !== imageKey));
      if (previewImage?.id === imageKey) setPreviewImage(null);
    } catch (err) {
      alert('Failed to delete image.');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm(`Delete folder ${folderId} and all photos inside it?`)) return;
    try {
      await localBookService.deleteFolder(folderId);
      setCurrentFolder(null);
      await loadFolders();
    } catch (err) {
      alert('Failed to delete folder.');
    }
  };

  const openRenameFolder = (folder: LocalFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRenameTarget({ type: 'folder', id: folder.id, currentName: folder.name });
    setRenameValue(folder.name);
  };

  const openRenameImage = (image: LocalImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const initialName = image.name === image.id ? '' : image.name;
    setRenameTarget({ type: 'image', id: image.id, currentName: initialName });
    setRenameValue(initialName);
  };

  const handleSaveRename = async () => {
    if (!renameTarget) return;
    try {
      if (renameTarget.type === 'folder') {
        await localBookService.renameFolder(renameTarget.id, renameValue);
        if (currentFolder && currentFolder.id === renameTarget.id) {
          setCurrentFolder({ ...currentFolder, name: renameValue.trim() || currentFolder.id });
        }
        await loadFolders();
      } else {
        await localBookService.renameImage(renameTarget.id, renameValue);
        if (currentFolder) {
          await handleOpenFolder(currentFolder);
        }
      }
      setRenameTarget(null);
    } catch (err) {
      alert('Failed to rename item.');
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 100px', width: '100%' }}>
      {/* Hidden dedicated inputs */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={cameraInputRef}
        style={{ display: 'none' }}
        onChange={handleFilesSelected}
      />
      <input 
        type="file" 
        accept="image/*" 
        multiple
        ref={galleryInputRef}
        style={{ display: 'none' }}
        onChange={handleFilesSelected}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            {currentFolder ? `Folder: ${currentFolder.name}` : 'Digital Chiti Book'}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            {currentFolder ? `${images.length} saved page(s)` : 'Capture & archive physical register pages on this phone'}
          </p>
        </div>
        {currentFolder && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => openRenameFolder(currentFolder)}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
              title="Rename folder"
            >
              <Edit3 size={15} color="#7C3AED" /> Rename
            </button>
            <button 
              onClick={() => handleDeleteFolder(currentFolder.id)}
              className="btn btn-secondary btn-sm"
              style={{ color: '#EF4444', borderColor: '#FCA5A5' }}
              title="Delete folder"
            >
              <Trash2 size={16} />
            </button>
            <button 
              onClick={() => setCurrentFolder(null)}
              className="btn btn-secondary btn-sm"
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={36} className="spin" color="#7C3AED" />
        </div>
      ) : currentFolder ? (
        /* Image Grid inside Folder */
        <div>
          {images.length === 0 ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B', borderRadius: '16px' }}>
              <ImageIcon size={48} color="#94A3B8" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                No photos in this folder
              </h3>
              <p style={{ fontSize: '13px', marginBottom: '20px' }}>
                Take a photo with your camera or pick an image from your gallery.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn btn-primary"
                  style={{ gap: '8px' }}
                >
                  <Camera size={18} /> Take Photo
                </button>
                <button 
                  onClick={() => galleryInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{ gap: '8px' }}
                >
                  <Upload size={18} /> Upload from Gallery
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Camera size={16} /> Add Photo
                </button>
                <button 
                  onClick={() => galleryInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Upload size={16} /> Upload
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '14px' }}>
                {images.map(img => (
                  <div 
                    key={img.id} 
                    style={{ 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      border: '1px solid #E2E8F0', 
                      background: '#FFFFFF',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      position: 'relative'
                    }}
                  >
                    <div 
                      onClick={() => setPreviewImage(img)}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      <img 
                        src={img.dataUrl} 
                        alt={img.name} 
                        style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{
                        position: 'absolute',
                        right: '6px',
                        bottom: '6px',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#FFF',
                        borderRadius: '6px',
                        padding: '3px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px'
                      }}>
                        <ZoomIn size={12} /> View
                      </div>
                    </div>

                    <div style={{ 
                      padding: '8px 10px', 
                      fontSize: '11px', 
                      color: '#64748B', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      borderTop: '1px solid #E2E8F0',
                      gap: '4px'
                    }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75px', fontWeight: 600, color: '#334155' }}>
                        {img.name !== img.id ? img.name : new Date(img.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button 
                          onClick={(e) => openRenameImage(img, e)}
                          style={{ background: 'none', border: 'none', color: '#7C3AED', cursor: 'pointer', padding: '4px' }}
                          title="Rename page"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteImage(img.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                          title="Delete photo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Folder Grid / Empty State */
        <div>
          {folders.length === 0 ? (
            <div 
              className="card" 
              style={{ 
                padding: '48px 24px', 
                textAlign: 'center', 
                borderRadius: '24px',
                border: '2px dashed #CBD5E1',
                background: '#FFFFFF',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(124, 58, 237, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Camera size={36} color="#7C3AED" />
              </div>
              
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                Digital Chiti Book
              </h2>
              <p style={{ color: '#64748B', fontSize: '14px', maxWidth: '340px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                Take photos of your physical paper register, daily notes, or receipts to keep a digital record organized by date.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn btn-primary"
                  style={{ gap: '10px', fontSize: '15px', padding: '12px 20px', width: '100%' }}
                >
                  <Camera size={20} /> Take Photo with Camera
                </button>
                <button 
                  onClick={() => galleryInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{ gap: '10px', fontSize: '15px', padding: '12px 20px', width: '100%' }}
                >
                  <Upload size={20} /> Pick from Phone Gallery
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                  Date Folders ({folders.length})
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => cameraInputRef.current?.click()}
                    className="btn btn-primary btn-sm"
                    style={{ gap: '6px' }}
                  >
                    <Camera size={16} /> New Photo
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
                {folders.map(folder => (
                  <div 
                    key={folder.id}
                    onClick={() => handleOpenFolder(folder)}
                    style={{ 
                      background: '#FFFFFF', 
                      border: '1px solid #E2E8F0', 
                      borderRadius: '16px', 
                      padding: '16px', 
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                    className="hover-lift"
                  >
                    <div>
                      <Folder size={42} color="#7C3AED" fill="rgba(124, 58, 237, 0.12)" style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '15px', wordBreak: 'break-word' }}>{folder.name}</div>
                      {folder.name !== folder.id && (
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{folder.id}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={(e) => openRenameFolder(folder, e)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px', minHeight: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Rename Book"
                      >
                        <Edit3 size={12} color="#7C3AED" /> Rename
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 7px', fontSize: '11px', minHeight: '28px', color: '#EF4444', borderColor: '#FECACA' }}
                        title="Delete Book"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Buttons for quick Camera/Upload */}
      <div style={{ position: 'fixed', bottom: '85px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40 }}>
        {isUploading ? (
          <div style={{ 
            width: '56px', 
            height: '56px', 
            background: '#10B981', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#FFF', 
            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)' 
          }}>
            <Loader2 size={26} className="spin" />
          </div>
        ) : (
          <>
            <button 
              onClick={() => galleryInputRef.current?.click()}
              style={{ 
                width: '46px', 
                height: '46px', 
                background: '#FFFFFF', 
                border: '1px solid #CBD5E1', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#475569', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)', 
                cursor: 'pointer' 
              }}
              aria-label="Upload from Gallery"
              title="Upload from Gallery"
            >
              <Upload size={18} />
            </button>
            <button 
              onClick={() => cameraInputRef.current?.click()}
              style={{ 
                width: '56px', 
                height: '56px', 
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', 
                border: 'none', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#FFFFFF', 
                boxShadow: '0 6px 20px rgba(124, 58, 237, 0.5)', 
                cursor: 'pointer' 
              }}
              aria-label="Take Photo with Camera"
              title="Take Photo with Camera"
            >
              <Camera size={26} />
            </button>
          </>
        )}
      </div>

      {/* Fullscreen Photo Viewer Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px'
          }}
        >
          <div style={{ 
            position: 'absolute', 
            top: '20px', 
            right: '20px', 
            display: 'flex', 
            gap: '12px', 
            zIndex: 101 
          }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteImage(previewImage.id);
              }}
              className="btn btn-secondary btn-sm"
              style={{ background: 'rgba(239, 68, 68, 0.8)', color: '#FFF', border: 'none', borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={() => setPreviewImage(null)}
              className="btn btn-secondary btn-sm"
              style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#FFF', border: 'none', borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
            >
              <X size={22} />
            </button>
          </div>

          <img 
            src={previewImage.dataUrl} 
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '85vh', 
              objectFit: 'contain', 
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
            }} 
          />
        </div>
      )}

      {/* Rename Modal for Folders & Pages */}
      {renameTarget && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setRenameTarget(null)}
        >
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '400px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              color: '#0F172A'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px' }}>
              {renameTarget.type === 'folder' ? 'Rename Digital Book' : 'Rename Page Photo'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
              {renameTarget.type === 'folder' ? 'Give this physical register or folder a custom name.' : 'Give this captured page a custom title.'}
            </p>

            <input 
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              placeholder={renameTarget.type === 'folder' ? 'e.g. Sri Krishna Chiti 2025 Book' : 'e.g. Page 1 - October Cash Entries'}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '20px'
              }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(); }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => setRenameTarget(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveRename}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 700, background: '#7C3AED' }}
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
