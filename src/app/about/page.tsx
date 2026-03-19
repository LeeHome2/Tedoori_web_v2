"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useAdmin } from "@/context/AdminContext";
import { useAddAction } from "@/context/AddActionContext";
import OfficeMap from '@/components/OfficeMap';
import DOMPurify from 'dompurify';
import { uploadImage, generateImageHtml } from '@/lib/utils/image';
import { generateYoutubeIframe } from '@/lib/utils/youtube';
import contentStyles from '@/styles/contentPage.module.css';

interface AboutBlock {
  id: string;
  type: 'text' | 'image' | 'map';
  content: string;
  fontFamily: 'sans' | 'serif';
  order_index: number;
}

interface GalleryImage {
  id: string;
  url: string;
  width: number;   // pixels
  height: number;  // pixels
  order_index: number;
}

const DEFAULT_BLOCKS: AboutBlock[] = [
  {
    id: 'intro-block',
    type: 'text',
    content: `Tedoori is an architectural practice based in Seoul.\n\nWe focus on the essential qualities of space and structure, exploring the relationship between form and function.`,
    fontFamily: 'sans',
    order_index: 0
  },
  {
    id: 'contact-block',
    type: 'text',
    content: `Email: info@tedoori.com\nTel: +82 2 1234 5678\nAddress: 123, Sejong-daero, Jongno-gu, Seoul, Republic of Korea`,
    fontFamily: 'sans',
    order_index: 1
  },
  {
    id: 'map-block',
    type: 'map',
    content: '',
    fontFamily: 'sans',
    order_index: 2
  }
];

export default function AboutPage() {
  const { isAdmin, adminMode } = useAdmin();
  const { setAddAction } = useAddAction();
  const [blocks, setBlocks] = useState<AboutBlock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    fontFamily: 'sans' as 'sans' | 'serif'
  });

  // Gallery state
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isEditingGallery, setIsEditingGallery] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  // Drag resize state (ProjectCard style)
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [lockedRatio, setLockedRatio] = useState(true);
  const [resizeDimensions, setResizeDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const originalImageRef = useRef<{ width: number; height: number } | null>(null);
  const aspectRatioRef = useRef<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await fetch('/api/about', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();

        if (data.length === 0) {
          await initializeDefaultBlocks();
        } else {
          const hasIntro = data.some((b: AboutBlock) => b.id === 'intro-block');
          const hasContact = data.some((b: AboutBlock) => b.id === 'contact-block');
          const hasMap = data.some((b: AboutBlock) => b.id === 'map-block');

          if (!hasIntro || !hasContact || !hasMap) {
            const missingBlocks: AboutBlock[] = [];
            if (!hasIntro) missingBlocks.push(DEFAULT_BLOCKS[0]);
            if (!hasContact) missingBlocks.push(DEFAULT_BLOCKS[1]);
            if (!hasMap) missingBlocks.push(DEFAULT_BLOCKS[2]);

            for (const block of missingBlocks) {
              await fetch('/api/about', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(block)
              });
            }

            const newRes = await fetch('/api/about', { cache: 'no-store' });
            if (newRes.ok) {
              const newData = await newRes.json();
              setBlocks(newData);
            }
          } else {
            setBlocks(data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch blocks', error);
      setBlocks(DEFAULT_BLOCKS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGalleryImages = useCallback(async () => {
    try {
      const res = await fetch('/api/about/gallery', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setGalleryImages(data);
      }
    } catch (error) {
      console.error('Failed to fetch gallery images', error);
    }
  }, []);

  useEffect(() => {
    fetchBlocks();
    fetchGalleryImages();
  }, [fetchBlocks, fetchGalleryImages]);

  const initializeDefaultBlocks = async () => {
    try {
      for (const block of DEFAULT_BLOCKS) {
        await fetch('/api/about', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(block)
        });
      }

      const res = await fetch('/api/about', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBlocks(data);
      }
    } catch (error) {
      console.error('Failed to initialize default blocks', error);
      setBlocks(DEFAULT_BLOCKS);
    }
  };

  const startAddingNew = useCallback(() => {
    setIsAddingNew(true);
    setFormData({ content: '', fontFamily: 'sans' });
  }, []);

  const cancelAddingNew = useCallback(() => {
    setIsAddingNew(false);
    setFormData({ content: '', fontFamily: 'sans' });
  }, []);

  const handleSaveNew = async () => {
    const newBlock: AboutBlock = {
      id: `block-${Date.now()}`,
      type: 'text',
      content: formData.content || 'New text block',
      fontFamily: formData.fontFamily,
      order_index: blocks.length
    };

    try {
      const res = await fetch('/api/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlock)
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to add block: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const data = await res.json();
      setBlocks(prev => [...prev, data]);
      setIsAddingNew(false);
      setFormData({ content: '', fontFamily: 'sans' });
    } catch (error) {
      console.error('Failed to add block', error);
      alert('Failed to add block');
    }
  };

  const handleSaveInline = async (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;

    try {
      const res = await fetch('/api/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...block, content: formData.content, fontFamily: formData.fontFamily })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      await fetchBlocks();
      setEditingId(null);
    } catch (error: unknown) {
      console.error('Failed to save block:', error);
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this block?')) return;

    try {
      await fetch(`/api/about?id=${id}`, {
        method: 'DELETE'
      });
      setBlocks(blocks.filter(b => b.id !== id));
    } catch (error) {
      console.error('Failed to delete block', error);
      setBlocks(blocks.filter(b => b.id !== id));
    }
  };

  const handleMoveUp = async (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index <= 0) return;

    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];

    const updatedBlocks = newBlocks.map((item, idx) => ({
      ...item,
      order_index: idx
    }));

    const updates = updatedBlocks.map(item => ({
      id: item.id,
      order_index: item.order_index
    }));

    setBlocks(updatedBlocks);

    try {
      const res = await fetch('/api/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update order');
    } catch (error) {
      console.error('Failed to update order:', error);
      alert('Failed to update order. Refreshing...');
      await fetchBlocks();
    }
  };

  const handleMoveDown = async (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index < 0 || index >= blocks.length - 1) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];

    const updatedBlocks = newBlocks.map((item, idx) => ({
      ...item,
      order_index: idx
    }));

    const updates = updatedBlocks.map(item => ({
      id: item.id,
      order_index: item.order_index
    }));

    setBlocks(updatedBlocks);

    try {
      const res = await fetch('/api/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update order');
    } catch (error) {
      console.error('Failed to update order:', error);
      alert('Failed to update order. Refreshing...');
      await fetchBlocks();
    }
  };

  const startEditing = (block: AboutBlock) => {
    setEditingId(block.id);
    setFormData({
      content: block.content,
      fontFamily: block.fontFamily || (block as any).font_family || 'sans'
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({
      content: '',
      fontFamily: 'sans'
    });
  };

  const handleAddImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setIsUploading(true);
        const url = await uploadImage(file);

        setFormData(prev => ({
          ...prev,
          content: prev.content + '\n' + generateImageHtml(url) + '\n'
        }));
      } catch (error: unknown) {
        alert(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleAddYouTube = () => {
    const url = prompt('Enter YouTube URL:');
    if (!url) return;

    const iframe = generateYoutubeIframe(url);

    if (!iframe) {
      alert('Invalid YouTube URL');
      return;
    }

    setFormData(prev => ({
      ...prev,
      content: prev.content + '\n' + iframe + '\n'
    }));
  };

  // Gallery functions
  const handleAddGalleryImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setIsUploadingGallery(true);
        const url = await uploadImage(file);

        const newImage: GalleryImage = {
          id: `img-${Date.now()}`,
          url,
          width: 400,
          height: 300,
          order_index: galleryImages.length
        };

        const res = await fetch('/api/about/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newImage)
        });

        if (res.ok) {
          const data = await res.json();
          setGalleryImages(prev => [...prev, data]);
        }
      } catch (error: unknown) {
        alert(error instanceof Error ? error.message : 'Failed to upload image');
      } finally {
        setIsUploadingGallery(false);
      }
    };
    input.click();
  };

  const handleDeleteGalleryImage = async (id: string) => {
    try {
      await fetch(`/api/about/gallery?id=${id}`, { method: 'DELETE' });
      setGalleryImages(prev => prev.filter(img => img.id !== id));
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleMoveImageUp = async (id: string) => {
    const index = galleryImages.findIndex(img => img.id === id);
    if (index <= 0) return;

    const newImages = [...galleryImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];

    const updatedImages = newImages.map((img, idx) => ({
      ...img,
      order_index: idx
    }));

    setGalleryImages(updatedImages);

    try {
      await fetch('/api/about/gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedImages)
      });
    } catch (error) {
      console.error('Failed to reorder images:', error);
    }
  };

  const handleMoveImageDown = async (id: string) => {
    const index = galleryImages.findIndex(img => img.id === id);
    if (index < 0 || index >= galleryImages.length - 1) return;

    const newImages = [...galleryImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];

    const updatedImages = newImages.map((img, idx) => ({
      ...img,
      order_index: idx
    }));

    setGalleryImages(updatedImages);

    try {
      await fetch('/api/about/gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedImages)
      });
    } catch (error) {
      console.error('Failed to reorder images:', error);
    }
  };

  // Start resize mode for an image (ProjectCard style)
  const startResizeMode = (imageId: string, currentWidth: number, currentHeight: number) => {
    setResizingId(imageId);
    setResizeDimensions({ width: currentWidth, height: currentHeight });
    aspectRatioRef.current = currentWidth / currentHeight;
    setLockedRatio(true);

    // Load original image dimensions
    const image = galleryImages.find(img => img.id === imageId);
    if (image) {
      const img = new window.Image();
      img.onload = () => {
        originalImageRef.current = { width: img.naturalWidth, height: img.naturalHeight };
      };
      img.src = image.url;
    }
  };

  // Handle width input change with aspect ratio lock
  const handleWidthChange = (newWidth: number) => {
    if (lockedRatio && newWidth > 0 && aspectRatioRef.current) {
      const newHeight = Math.round(newWidth / aspectRatioRef.current);
      setResizeDimensions({ width: newWidth, height: newHeight });
    } else {
      setResizeDimensions(prev => ({ ...prev, width: newWidth }));
    }
  };

  // Handle height input change with aspect ratio lock
  const handleHeightChange = (newHeight: number) => {
    if (lockedRatio && newHeight > 0 && aspectRatioRef.current) {
      const newWidth = Math.round(newHeight * aspectRatioRef.current);
      setResizeDimensions({ width: newWidth, height: newHeight });
    } else {
      setResizeDimensions(prev => ({ ...prev, height: newHeight }));
    }
  };

  // Reset to original image size
  const handleResetSize = () => {
    if (originalImageRef.current) {
      setResizeDimensions({
        width: originalImageRef.current.width,
        height: originalImageRef.current.height
      });
      aspectRatioRef.current = originalImageRef.current.width / originalImageRef.current.height;
    }
  };

  // Save resize changes
  const handleResizeSave = async () => {
    if (!resizingId) return;

    const updatedImages = galleryImages.map(img =>
      img.id === resizingId
        ? { ...img, width: resizeDimensions.width, height: resizeDimensions.height }
        : img
    );
    setGalleryImages(updatedImages);

    try {
      await fetch('/api/about/gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedImages)
      });
    } catch (error) {
      console.error('Failed to save image size:', error);
    }

    setResizingId(null);
  };

  // Cancel resize
  const handleResizeCancel = () => {
    setResizingId(null);
    setResizeDimensions({ width: 0, height: 0 });
  };

  // Corner drag resize handler (ProjectCard style)
  const startCornerResize = (e: React.MouseEvent | React.TouchEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    resizeStartRef.current = {
      x: clientX,
      y: clientY,
      w: resizeDimensions.width,
      h: resizeDimensions.height
    };

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!resizeStartRef.current) return;

      const moveX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const moveY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;

      const deltaX = moveX - resizeStartRef.current.x;
      const deltaY = moveY - resizeStartRef.current.y;

      let newWidth = resizeStartRef.current.w;
      let newHeight = resizeStartRef.current.h;

      // Handle horizontal direction
      if (direction.includes('E')) newWidth += deltaX;
      if (direction.includes('W')) newWidth -= deltaX;

      // Handle vertical direction
      if (direction.includes('S')) newHeight += deltaY;
      if (direction.includes('N')) newHeight -= deltaY;

      // Constraints
      newWidth = Math.max(50, Math.min(newWidth, 1200));
      newHeight = Math.max(50, Math.min(newHeight, 1200));

      if (lockedRatio && aspectRatioRef.current) {
        // Keep aspect ratio based on width change
        newHeight = Math.round(newWidth / aspectRatioRef.current);
      }

      setResizeDimensions({ width: Math.round(newWidth), height: Math.round(newHeight) });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  // Register add action for header
  useEffect(() => {
    setAddAction(startAddingNew);
    return () => setAddAction(null);
  }, [setAddAction, startAddingNew]);

  return (
    <main className="hide-scrollbar">
      <Header />

      <div className={contentStyles.pageContainer}>
        {/* Left: Content blocks */}
        <div className={contentStyles.contentWrapper} style={{ marginTop: 0, marginBottom: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* New block form */}
            {isAddingNew && (
              <article style={{ paddingBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Enter content..."
                        rows={10}
                        style={{ width: '100%', color: '#666', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '8px', resize: 'vertical', fontSize: '14px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '5px', alignItems: 'center' }}>
                        <button
                          onClick={handleAddImage}
                          disabled={isUploading}
                          style={{ padding: '4px 8px', fontSize: '11px', cursor: isUploading ? 'wait' : 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: '#666' }}
                        >
                          {isUploading ? 'uploading...' : '+add image'}
                        </button>
                        <button
                          onClick={handleAddYouTube}
                          style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: '#666' }}
                        >
                          +add youtube
                        </button>
                        <span style={{ marginLeft: '10px', fontSize: '11px', color: '#666' }}>font:</span>
                        <select
                          value={formData.fontFamily}
                          onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value as 'sans' | 'serif' })}
                          style={{ fontSize: '11px', padding: '2px 4px', border: '1px solid #ccc' }}
                        >
                          <option value="sans">Noto Sans</option>
                          <option value="serif">Noto Serif</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexShrink: 0 }}>
                    <button
                      onClick={handleSaveNew}
                      style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                    >
                      save
                    </button>
                    <button
                      onClick={cancelAddingNew}
                      style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                    >
                      cancel
                    </button>
                  </div>
                </div>
              </article>
            )}

            {blocks.map((block) => {
              const isEditing = editingId === block.id;

              if (block.type === 'map') {
                return (
                  <div key={block.id} style={{ paddingBottom: '20px', position: 'relative' }}>
                    <OfficeMap />
                    {isAdmin && adminMode && (
                      <div style={{ position: 'absolute', top: '10px', right: '60px', display: 'flex', gap: '10px', zIndex: 1000 }}>
                        <button
                          onClick={() => handleMoveUp(block.id)}
                          style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'white', border: '1px solid #ddd' }}
                          title="Move up"
                        >
                          ∧
                        </button>
                        <button
                          onClick={() => handleMoveDown(block.id)}
                          style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'white', border: '1px solid #ddd' }}
                          title="Move down"
                        >
                          ∨
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <article key={block.id} style={{ paddingBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      {isEditing ? (
                        <div style={{ position: 'relative' }}>
                          <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={10}
                            style={{ width: '100%', color: '#666', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '8px', resize: 'vertical', fontSize: '14px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '5px', alignItems: 'center' }}>
                            <button
                              onClick={handleAddImage}
                              disabled={isUploading}
                              style={{ padding: '4px 8px', fontSize: '11px', cursor: isUploading ? 'wait' : 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: '#666' }}
                            >
                              {isUploading ? 'uploading...' : '+add image'}
                            </button>
                            <button
                              onClick={handleAddYouTube}
                              style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: '#666' }}
                            >
                              +add youtube
                            </button>
                            <span style={{ marginLeft: '10px', fontSize: '11px', color: '#666' }}>font:</span>
                            <select
                              value={formData.fontFamily}
                              onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value as 'sans' | 'serif' })}
                              style={{ fontSize: '11px', padding: '2px 4px', border: '1px solid #ccc' }}
                            >
                              <option value="sans">Noto Sans</option>
                              <option value="serif">Noto Serif</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{ color: '#2a2a2a', whiteSpace: 'pre-wrap', fontFamily: (block.fontFamily || (block as any).font_family) === 'serif' ? '"Noto Serif KR", serif' : '"Noto Sans KR", sans-serif' }}
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content.replace(/\n/g, '<br>'), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] }) }}
                        />
                      )}
                    </div>

                    {isAdmin && adminMode && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexShrink: 0 }}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleMoveUp(block.id)}
                              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                              title="Move up"
                            >
                              ∧
                            </button>
                            <button
                              onClick={() => handleMoveDown(block.id)}
                              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                              title="Move down"
                            >
                              ∨
                            </button>
                            <button
                              onClick={() => handleDelete(block.id)}
                              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: '#cc0000' }}
                            >
                              delete
                            </button>
                            <button
                              onClick={() => handleSaveInline(block.id)}
                              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                            >
                              save
                            </button>
                            <button
                              onClick={cancelEditing}
                              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                            >
                              cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditing(block)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: 'black' }}
                          >
                            edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {blocks.length === 0 && !isLoading && (
              <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>No blocks yet.</p>
            )}
          </div>
        </div>

        {/* Right: Gallery area */}
        <div
          ref={containerRef}
          className={`${contentStyles.galleryArea} ${resizingId ? contentStyles.editMode : ''}`}
        >
          {/* Edit/Done button at top right */}
          {isAdmin && adminMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              {isEditingGallery ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleAddGalleryImage}
                    disabled={isUploadingGallery}
                    style={{ padding: '4px 8px', fontSize: '12px', cursor: isUploadingGallery ? 'wait' : 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: '#666' }}
                  >
                    {isUploadingGallery ? 'uploading...' : '+add image'}
                  </button>
                  <button
                    onClick={() => setIsEditingGallery(false)}
                    style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: 'black' }}
                  >
                    done
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingGallery(true)}
                  style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: 'black' }}
                >
                  edit
                </button>
              )}
            </div>
          )}

          {/* Gallery images */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {galleryImages.map((image) => {
              const isCurrentlyResizing = resizingId === image.id;
              const displayWidth = isCurrentlyResizing ? resizeDimensions.width : image.width;
              const displayHeight = isCurrentlyResizing ? resizeDimensions.height : image.height;

              return (
                <div
                  key={image.id}
                  style={{
                    width: displayWidth ? `${displayWidth}px` : 'auto',
                    maxWidth: '100%',
                    position: 'relative',
                    outline: isCurrentlyResizing ? '2px dashed #2a2a2a' : 'none',
                    zIndex: isCurrentlyResizing ? 50 : 'auto',
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', aspectRatio: displayWidth && displayHeight ? `${displayWidth} / ${displayHeight}` : 'auto' }}>
                    <Image
                      src={image.url}
                      alt=""
                      width={displayWidth || 400}
                      height={displayHeight || 300}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />

                    {/* Admin overlay (ProjectCard style) - visible when editing and not resizing */}
                    {isAdmin && adminMode && isEditingGallery && !isCurrentlyResizing && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        display: 'flex',
                        gap: '8px',
                        zIndex: 10,
                        padding: '6px',
                        background: 'transparent',
                      }}>
                        {/* Drag Handle for reordering */}
                        <div
                          style={{
                            padding: '3px 5px',
                            background: '#f0f0f0',
                            color: '#666',
                            cursor: 'grab',
                            border: '1px solid #ddd',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <span style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={() => handleMoveImageUp(image.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', padding: '0 2px' }}
                              title="Move up"
                            >∧</button>
                            <button
                              onClick={() => handleMoveImageDown(image.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', padding: '0 2px' }}
                              title="Move down"
                            >∨</button>
                          </span>
                        </div>
                        {/* Resize toggle button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startResizeMode(image.id, image.width || 400, image.height || 300);
                          }}
                          style={{
                            padding: '3px 6px',
                            background: '#f0f0f0',
                            color: '#333',
                            border: '1px solid #ddd',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                          title="Resize"
                        >⤡</button>
                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteGalleryImage(image.id)}
                          style={{
                            padding: '3px 6px',
                            background: '#fff5f5',
                            color: '#cc0000',
                            border: '1px solid #ffdada',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                          title="Delete"
                        >×</button>
                      </div>
                    )}

                    {/* Corner resize handles (ProjectCard style) - visible when resizing */}
                    {isCurrentlyResizing && (
                      <>
                        <div
                          onMouseDown={(e) => startCornerResize(e, 'NW')}
                          onTouchStart={(e) => startCornerResize(e, 'NW')}
                          style={{ position: 'absolute', top: -6, left: -6, width: 12, height: 12, background: 'white', border: '1px solid black', cursor: 'nw-resize', zIndex: 20 }}
                        />
                        <div
                          onMouseDown={(e) => startCornerResize(e, 'NE')}
                          onTouchStart={(e) => startCornerResize(e, 'NE')}
                          style={{ position: 'absolute', top: -6, right: -6, width: 12, height: 12, background: 'white', border: '1px solid black', cursor: 'ne-resize', zIndex: 20 }}
                        />
                        <div
                          onMouseDown={(e) => startCornerResize(e, 'SW')}
                          onTouchStart={(e) => startCornerResize(e, 'SW')}
                          style={{ position: 'absolute', bottom: -6, left: -6, width: 12, height: 12, background: 'white', border: '1px solid black', cursor: 'sw-resize', zIndex: 20 }}
                        />
                        <div
                          onMouseDown={(e) => startCornerResize(e, 'SE')}
                          onTouchStart={(e) => startCornerResize(e, 'SE')}
                          style={{ position: 'absolute', bottom: -6, right: -6, width: 12, height: 12, background: 'white', border: '1px solid black', cursor: 'se-resize', zIndex: 20 }}
                        />

                        {/* Resize overlay panel - positioned at top-left of image */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            background: 'white',
                            padding: 12,
                            zIndex: 9999,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            minWidth: 200,
                            border: '1px solid black',
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 11, fontWeight: 'bold', color: '#666' }}>W</span>
                              <input
                                type="number"
                                value={resizeDimensions.width || ''}
                                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                                style={{ width: 50, padding: 4, border: '1px solid #ccc', fontSize: 12 }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 11, fontWeight: 'bold', color: '#666' }}>H</span>
                              <input
                                type="number"
                                value={resizeDimensions.height || ''}
                                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                                style={{ width: 50, padding: 4, border: '1px solid #ccc', fontSize: 12 }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <label style={{ fontSize: 11, fontWeight: 'bold', color: '#666', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={lockedRatio}
                                onChange={(e) => setLockedRatio(e.target.checked)}
                              />
                              Lock
                            </label>
                          </div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                            <button
                              onClick={handleResetSize}
                              style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#333', textDecoration: 'underline', cursor: 'pointer' }}
                              title="Reset to original image size"
                            >
                              Reset
                            </button>
                            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                              <button
                                onClick={handleResizeSave}
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#333', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleResizeCancel}
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#333', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {galleryImages.length === 0 && isAdmin && adminMode && isEditingGallery && (
              <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
                Click &quot;+add image&quot; to add images
              </p>
            )}
          </div>

        </div>
      </div>

      <BackToTop />
    </main>
  );
}
