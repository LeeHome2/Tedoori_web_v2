"use client";

import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useAdmin } from "@/context/AdminContext";
import OfficeMap from '@/components/OfficeMap';
import styles from './about.module.css';
import DOMPurify from 'dompurify';
import imageCompression from 'browser-image-compression';

interface AboutBlock {
  id: string;
  type: 'text' | 'image' | 'map';
  content: string;
  order_index: number;
}

const DEFAULT_BLOCKS: AboutBlock[] = [
  {
    id: 'intro-block',
    type: 'text',
    content: `Tedoori is an architectural practice based in Seoul.\n\nWe focus on the essential qualities of space and structure, exploring the relationship between form and function.`,
    order_index: 0
  },
  {
    id: 'contact-block',
    type: 'text',
    content: `Email: info@tedoori.com\nTel: +82 2 1234 5678\nAddress: 123, Sejong-daero, Jongno-gu, Seoul, Republic of Korea`,
    order_index: 1
  },
  {
    id: 'map-block',
    type: 'map',
    content: '',
    order_index: 2
  }
];

export default function AboutPage() {
  const { isAdmin, adminMode } = useAdmin();
  const [blocks, setBlocks] = useState<AboutBlock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    content: ''
  });

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const res = await fetch('/api/about');
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

            const newRes = await fetch('/api/about');
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
  };

  const initializeDefaultBlocks = async () => {
    try {
      for (const block of DEFAULT_BLOCKS) {
        await fetch('/api/about', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(block)
        });
      }

      const res = await fetch('/api/about');
      if (res.ok) {
        const data = await res.json();
        setBlocks(data);
      }
    } catch (error) {
      console.error('Failed to initialize default blocks', error);
      setBlocks(DEFAULT_BLOCKS);
    }
  };

  const handleAddText = async () => {
    const newBlock: AboutBlock = {
      id: `block-${Date.now()}`,
      type: 'text',
      content: 'New text block',
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
      setBlocks([...blocks, data]);
      setEditingId(data.id);
      setFormData({ content: data.content });
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
        body: JSON.stringify({ ...block, content: formData.content })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      await fetchBlocks();
      setEditingId(null);
    } catch (error: any) {
      console.error('Failed to save block:', error);
      alert(`Failed to save: ${error.message}`);
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

    const updates = newBlocks.map((item, idx) => ({
      id: item.id,
      order_index: idx
    }));

    setBlocks(newBlocks);

    try {
      await fetch('/api/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      await fetchBlocks();
    }
  };

  const handleMoveDown = async (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index < 0 || index >= blocks.length - 1) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];

    const updates = newBlocks.map((item, idx) => ({
      id: item.id,
      order_index: idx
    }));

    setBlocks(newBlocks);

    try {
      await fetch('/api/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      await fetchBlocks();
    }
  };

  const startEditing = (block: AboutBlock) => {
    setEditingId(block.id);
    setFormData({
      content: block.content
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({
      content: ''
    });
  };

  const handleAddImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp'
      };

      try {
        setIsUploading(true);
        console.log('Compressing image...', file.name, file.type, file.size);
        const compressedFile = await imageCompression(file, options);
        console.log('Compressed:', compressedFile.name, compressedFile.type, compressedFile.size);

        // Rename file to have .webp extension
        const webpFile = new File([compressedFile], `${Date.now()}.webp`, { type: 'image/webp' });

        const formData = new FormData();
        formData.append('file', webpFile);

        console.log('Uploading to /api/upload...');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        console.log('Upload response status:', uploadRes.status);
        const uploadData = await uploadRes.json();
        console.log('Upload response data:', uploadData);

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Upload failed');
        }

        // Add image HTML to content
        setFormData(prev => ({
          content: prev.content + `\n<img src="${uploadData.url}" alt="Uploaded image" style="max-width: 100%; height: auto; margin: 10px 0;" />\n`
        }));
      } catch (error: any) {
        console.error('Failed to upload image', error);
        alert(`Failed to upload image: ${error.message || error}`);
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleAddYouTube = () => {
    const url = prompt('Enter YouTube URL:');
    if (!url) return;

    // Extract video ID from various YouTube URL formats
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1].split('?')[0];
    }

    if (!videoId) {
      alert('Invalid YouTube URL');
      return;
    }

    // Add YouTube iframe to content
    setFormData(prev => ({
      content: prev.content + `\n<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="margin: 10px 0;"></iframe>\n`
    }));
  };

  return (
    <main>
      <Header />

      {isAdmin && adminMode && (
        <div style={{ position: 'fixed', top: '150px', right: '40px', zIndex: 2001 }}>
          <button onClick={handleAddText} className={styles.addBtn} title="Add block" aria-label="Add block">
          </button>
        </div>
      )}

      <div style={{
        maxWidth: '800px',
        marginTop: '150px',
        marginBottom: '100px',
        marginLeft: '165px',
        paddingLeft: '0',
        paddingRight: '20px',
        lineHeight: '1.6',
        minHeight: '60vh'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '40px', fontWeight: 'bold', textTransform: 'uppercase' }}>About</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {blocks.map((block) => {
            const isEditing = editingId === block.id;

            if (block.type === 'map') {
              return (
                <div key={block.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', position: 'relative' }}>
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
              <article key={block.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <div style={{ position: 'relative' }}>
                        <textarea
                          value={formData.content}
                          onChange={(e) => setFormData({ content: e.target.value })}
                          rows={10}
                          style={{ width: '100%', color: '#666', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '8px', resize: 'vertical', fontSize: '14px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
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
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{ color: '#000', whiteSpace: 'pre-wrap' }}
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

      <BackToTop />
    </main>
  );
}
