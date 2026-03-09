"use client";

import { useState, useEffect } from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useAdmin } from "@/context/AdminContext";
import styles from "./news.module.css";
import DOMPurify from 'dompurify';
import imageCompression from 'browser-image-compression';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  created_at: string;
}

export default function NewsPage() {
  const { isAdmin, adminMode } = useAdmin();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched news:', data.length);
        setNewsItems(data);
      } else {
        console.error('Failed to fetch news:', await res.text());
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    }
  };

  const handleSaveInline = async (id: string) => {
    console.log('Saving news update:', { id, formData });

    try {
      const res = await fetch('/api/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      console.log('News saved successfully');
      await fetchNews();
      setEditingId(null);
    } catch (error: any) {
      console.error('Failed to save news:', error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  const handleSaveNew = async () => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    console.log('Saving new news:', formData);

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      console.log('New news saved successfully');
      await fetchNews();
      setIsAddingNew(false);
      setFormData({
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error('Failed to save new news:', error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this news item?')) return;

    try {
      const res = await fetch(`/api/news?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      await fetchNews();
    } catch (error: any) {
      console.error('Failed to delete news:', error);
      alert(`Failed to delete: ${error.message}`);
    }
  };

  const handleMoveUp = async (id: string) => {
    const index = newsItems.findIndex(item => item.id === id);
    if (index <= 0) return;

    const newItems = [...newsItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];

    // Update order_index for all items
    const updates = newItems.map((item, idx) => ({
      id: item.id,
      order_index: idx
    }));

    setNewsItems(newItems);

    try {
      await fetch('/api/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      await fetchNews(); // Revert on error
    }
  };

  const handleMoveDown = async (id: string) => {
    const index = newsItems.findIndex(item => item.id === id);
    if (index < 0 || index >= newsItems.length - 1) return;

    const newItems = [...newsItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];

    // Update order_index for all items
    const updates = newItems.map((item, idx) => ({
      id: item.id,
      order_index: idx
    }));

    setNewsItems(newItems);

    try {
      await fetch('/api/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      await fetchNews(); // Revert on error
    }
  };

  const startAddingNew = () => {
    setIsAddingNew(true);
    setFormData({
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const startEditing = (news: NewsItem) => {
    setEditingId(news.id);
    setFormData({
      title: news.title,
      content: news.content,
      date: news.date
    });
    // Expand the content when editing
    setExpandedId(news.id);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const cancelAddingNew = () => {
    setIsAddingNew(false);
    setFormData({
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0]
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

        setFormData(prev => ({
          ...prev,
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

    setFormData(prev => ({
      ...prev,
      content: prev.content + `\n<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="margin: 10px 0;"></iframe>\n`
    }));
  };

  return (
    <main>
      <Header />

      {isAdmin && adminMode && (
        <div className={styles.addBtnWrapper}>
          <button
            onClick={startAddingNew}
            className={styles.addBtn}
            aria-label="Add news"
          >
          </button>
        </div>
      )}

      <div className={styles.contentWrapper} style={{
        width: 'calc(40vw - 145px)',
        marginTop: '150px',
        marginBottom: '100px',
        marginLeft: '165px',
        paddingLeft: '0',
        paddingRight: '20px',
        lineHeight: '1.6',
        minHeight: '60vh'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '40px', fontWeight: 'bold', textTransform: 'uppercase' }}>News</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* New news form */}
          {isAddingNew && (
            <article style={{ borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={{ fontSize: '12px', color: '#999', marginBottom: '5px', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '2px 4px' }}
                  />
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Title"
                    style={{ fontSize: '18px', fontWeight: 'bold', width: '100%', marginBottom: '10px', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '4px' }}
                  />
                  <div>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Content"
                      rows={10}
                      style={{ width: '100%', color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '8px', resize: 'vertical' }}
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
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexShrink: 0 }}>
                  <button
                    onClick={handleSaveNew}
                    style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'black', color: 'white', border: 'none' }}
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

          {newsItems.map((news) => {
            const isEditing = editingId === news.id;

            return (
              <article key={news.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <>
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          style={{ fontSize: '12px', color: '#999', marginBottom: '5px', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '2px 4px' }}
                        />
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          style={{ fontSize: '18px', fontWeight: 'bold', width: '100%', marginBottom: '10px', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '4px' }}
                        />
                        <div>
                          <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={10}
                            style={{ width: '100%', color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '8px', resize: 'vertical' }}
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
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>
                          {new Date(news.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                        </span>
                        <h2
                          style={{ fontSize: '18px', marginBottom: '10px', cursor: 'pointer', fontWeight: expandedId === news.id ? 'bold' : 'normal' }}
                          onClick={() => setExpandedId(expandedId === news.id ? null : news.id)}
                        >
                          {news.title}
                        </h2>
                        {expandedId === news.id && (
                          <div
                            style={{ color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(news.content, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] }) }}
                          />
                        )}
                      </>
                    )}
                  </div>

                  {isAdmin && adminMode && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexShrink: 0 }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleMoveUp(news.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                            title="Move up"
                          >
                            ∧
                          </button>
                          <button
                            onClick={() => handleMoveDown(news.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                            title="Move down"
                          >
                            ∨
                          </button>
                          <button
                            onClick={() => handleDelete(news.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: '#cc0000' }}
                          >
                            delete
                          </button>
                          <button
                            onClick={() => handleSaveInline(news.id)}
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
                          onClick={() => startEditing(news)}
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

          {newsItems.length === 0 && (
            <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>No news yet.</p>
          )}
        </div>
      </div>

      <BackToTop />
    </main>
  );
}
