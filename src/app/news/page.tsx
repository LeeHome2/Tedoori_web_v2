"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useAdmin } from "@/context/AdminContext";
import { useContentEditor, type ContentItem } from "@/hooks/useContentEditor";
import styles from "./news.module.css";
import DOMPurify from 'dompurify';

export default function NewsPage() {
  const { isAdmin, adminMode } = useAdmin();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Use the custom hook for content management
  const {
    items: newsItems,
    editingId,
    isAddingNew,
    isUploading,
    formData,
    setFormData,
    handleSaveInline,
    handleSaveNew,
    handleDelete,
    handleMoveUp,
    handleMoveDown,
    startAddingNew,
    startEditing,
    cancelEditing,
    cancelAddingNew,
    handleAddImage,
    handleAddYouTube,
  } = useContentEditor({
    apiEndpoint: '/api/news',
    defaultFormData: {
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0]
    },
  });

  // Custom startEditing to also expand the content
  const handleStartEditing = (newsItem: ContentItem) => {
    startEditing(newsItem);
    setExpandedId(newsItem.id);
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

          {newsItems.map((newsItem) => {
            const isEditing = editingId === newsItem.id;

            return (
              <article key={newsItem.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
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
                          {newsItem.date && new Date(newsItem.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                        </span>
                        <h2
                          style={{ fontSize: '18px', marginBottom: '10px', cursor: 'pointer', fontWeight: expandedId === newsItem.id ? 'bold' : 'normal' }}
                          onClick={() => setExpandedId(expandedId === newsItem.id ? null : newsItem.id)}
                        >
                          {newsItem.title}
                        </h2>
                        {expandedId === newsItem.id && (
                          <div
                            style={{ color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(newsItem.content, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] }) }}
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
                            onClick={() => handleMoveUp(newsItem.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                            title="Move up"
                          >
                            ∧
                          </button>
                          <button
                            onClick={() => handleMoveDown(newsItem.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                            title="Move down"
                          >
                            ∨
                          </button>
                          <button
                            onClick={() => handleDelete(newsItem.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: '#cc0000' }}
                          >
                            delete
                          </button>
                          <button
                            onClick={() => handleSaveInline(newsItem.id)}
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
                          onClick={() => handleStartEditing(newsItem)}
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
