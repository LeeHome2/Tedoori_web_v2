"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useAdmin } from "@/context/AdminContext";
import { useAddAction } from "@/context/AddActionContext";
import { useContentEditor, type ContentItem } from "@/hooks/useContentEditor";
import DOMPurify from 'dompurify';
import contentStyles from '@/styles/contentPage.module.css';

// Helper function to separate text and media from HTML content
function separateContent(htmlContent: string): { text: string; media: string[] } {
  if (typeof window === 'undefined') {
    return { text: htmlContent, media: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Extract images and iframes
  const mediaElements: string[] = [];
  const images = doc.querySelectorAll('img');
  const iframes = doc.querySelectorAll('iframe');

  images.forEach(img => {
    mediaElements.push(img.outerHTML);
    img.remove();
  });

  iframes.forEach(iframe => {
    mediaElements.push(iframe.outerHTML);
    iframe.remove();
  });

  return {
    text: doc.body.innerHTML,
    media: mediaElements
  };
}

export default function NewsPage() {
  const { isAdmin, adminMode } = useAdmin();
  const { setAddAction } = useAddAction();
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
      date: new Date().toISOString().split('T')[0],
      fontFamily: 'sans'
    },
  });

  // Custom startEditing to also expand the content
  const handleStartEditing = (newsItem: ContentItem) => {
    startEditing(newsItem);
    setExpandedId(newsItem.id);
  };

  // Register add action for header
  useEffect(() => {
    setAddAction(startAddingNew);
    return () => setAddAction(null);
  }, [setAddAction, startAddingNew]);

  // Check if currently editing the expanded item
  const isEditingExpanded = editingId && editingId === expandedId;

  // Get media for currently expanded item
  const currentMedia = useMemo(() => {
    if (!expandedId) return [];
    const item = newsItems.find(n => n.id === expandedId);
    if (!item) return [];
    const { media } = separateContent(item.content || '');
    return media;
  }, [expandedId, newsItems]);

  return (
    <main>
      <Header />

      <div className={contentStyles.pageContainer}>
        {/* Left: Content list */}
        <div className={contentStyles.contentWrapper} style={{ marginTop: 0, marginBottom: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* New news form */}
            {isAddingNew && (
              <article style={{ paddingBottom: '20px' }}>
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
                          value={formData.fontFamily || 'sans'}
                          onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
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

            {newsItems.map((newsItem) => {
              const isEditing = editingId === newsItem.id;
              const isExpanded = expandedId === newsItem.id;
              const { text } = separateContent(newsItem.content || '');

              return (
                <article key={newsItem.id} style={{ paddingBottom: '20px' }}>
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
                                value={formData.fontFamily || 'sans'}
                                onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                                style={{ fontSize: '11px', padding: '2px 4px', border: '1px solid #ccc' }}
                              >
                                <option value="sans">Noto Sans</option>
                                <option value="serif">Noto Serif</option>
                              </select>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <h2
                            className={contentStyles.contentTitle}
                            onClick={() => setExpandedId(isExpanded ? null : newsItem.id)}
                          >
                            <span className={contentStyles.contentDate}>{newsItem.date && new Date(newsItem.date).toLocaleDateString('sv-SE').replace(/-/g, '.')}</span>
                            <span className={contentStyles.contentTitleText}>{newsItem.title}</span>
                          </h2>
                          <div
                            style={{
                              maxHeight: isExpanded ? '2000px' : '0',
                              overflow: 'hidden',
                              transition: isExpanded
                                ? 'max-height 0.4s ease-in-out 0.25s'
                                : 'max-height 0.2s ease-in-out',
                            }}
                          >
                            <div
                              style={{ color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap', fontFamily: (newsItem.fontFamily || newsItem.font_family) === 'serif' ? '"Noto Serif KR", serif' : '"Noto Sans KR", sans-serif' }}
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }}
                            />
                          </div>
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

        {/* Right: Gallery area */}
        <div
          className={`${contentStyles.galleryArea} ${isEditingExpanded ? contentStyles.editMode : ''}`}
          style={{
            opacity: currentMedia.length > 0 ? 1 : 0,
            pointerEvents: currentMedia.length > 0 ? 'auto' : 'none',
          }}
        >
          {currentMedia.map((mediaHtml, index) => (
            <div
              key={index}
              className={isEditingExpanded ? contentStyles.mediaItemEditing : undefined}
              style={{ width: '100%' }}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(mediaHtml, {
                  ADD_TAGS: ['iframe'],
                  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height']
                })
              }}
            />
          ))}
        </div>
      </div>

      <BackToTop />
    </main>
  );
}
