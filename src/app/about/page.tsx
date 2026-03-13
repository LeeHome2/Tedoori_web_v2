"use client";

import { useState, useEffect, useCallback } from 'react';
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
  fontFamily?: 'sans' | 'serif';
  font_family?: 'sans' | 'serif';  // Database column name
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
  }, []); // No dependencies needed - only runs once on mount

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

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

        // Add image HTML to content
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

  // Register add action for header
  useEffect(() => {
    setAddAction(startAddingNew);
    return () => setAddAction(null);
  }, [setAddAction, startAddingNew]);

  return (
    <main>
      <Header />

      <div className={contentStyles.contentWrapper}>
        
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
                        style={{ color: '#000', whiteSpace: 'pre-wrap', fontFamily: (block.fontFamily || (block as any).font_family) === 'serif' ? '"Noto Serif KR", serif' : '"Noto Sans KR", sans-serif' }}
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
