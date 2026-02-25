"use client";

import { useState, useEffect } from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useAdmin } from "@/context/AdminContext";
import styles from "./news.module.css";

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

  return (
    <main>
      <Header />

      {isAdmin && adminMode && (
        <div style={{ position: 'fixed', top: '145px', left: '133px', zIndex: 2001, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={startAddingNew}
            className={styles.addBtn}
            aria-label="Add news"
          >
          </button>
        </div>
      )}

      <div style={{
        maxWidth: '800px',
        margin: '150px auto 100px',
        padding: '0 20px',
        fontFamily: 'Consolas, monospace',
        lineHeight: '1.6',
        minHeight: '60vh'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', fontSize: '14px', color: '#666' }}>
          <span>works</span>
          <span>/</span>
          <span style={{ color: 'black', fontWeight: 'bold' }}>news</span>
        </div>

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
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Content"
                    rows={10}
                    style={{ width: '100%', color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '8px', resize: 'vertical' }}
                  />
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
                        <textarea
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          rows={10}
                          style={{ width: '100%', color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace', border: '1px solid #ccc', padding: '8px', resize: 'vertical' }}
                        />
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>
                          {new Date(news.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                        </span>
                        <h2
                          style={{ fontSize: '18px', marginBottom: '10px', cursor: 'pointer', fontWeight: expandedId === news.id ? 'bold' : 'normal' }}
                          onClick={() => !isAdmin || !adminMode ? setExpandedId(expandedId === news.id ? null : news.id) : null}
                        >
                          {news.title}
                        </h2>
                        {expandedId === news.id && (
                          <div
                            style={{ color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{ __html: news.content }}
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
                            onClick={() => handleDelete(news.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                          >
                            delete
                          </button>
                          <button
                            onClick={() => handleSaveInline(news.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'black', color: 'white', border: 'none' }}
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
