"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import FitTitle from "@/components/FitTitle";
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

function EssaysPageContent() {
  const { isAdmin, adminMode } = useAdmin();
  const { setAddAction } = useAddAction();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const articleRefs = useRef<Map<string, HTMLElement>>(new Map());
  const initialScrollDone = useRef(false);

  // Use the custom hook for content management
  const {
    items: essays,
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
    apiEndpoint: '/api/essays',
    defaultFormData: {
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      fontFamily: 'sans'
    },
  });

  // Custom startEditing to also expand the content
  const handleStartEditing = (essay: ContentItem) => {
    startEditing(essay);
    setExpandedId(essay.id);
  };

  // Register add action for header
  useEffect(() => {
    setAddAction(startAddingNew);
    return () => setAddAction(null);
  }, [setAddAction, startAddingNew]);

  // URL 파라미터로 아이템 자동 펼침 및 스크롤
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId && essays.length > 0 && !initialScrollDone.current) {
      // 해당 아이템이 존재하는지 확인
      const targetItem = essays.find(item => item.id === itemId);
      if (targetItem) {
        // 아이템 펼치기
        setExpandedId(itemId);
        initialScrollDone.current = true;

        // 약간의 딜레이 후 스크롤 (렌더링 완료 후)
        setTimeout(() => {
          const articleElement = articleRefs.current.get(itemId);
          if (articleElement) {
            articleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [searchParams, essays]);

  // Check if currently editing the expanded item
  const isEditingExpanded = editingId && editingId === expandedId;

  // Get media for currently expanded item
  const currentMedia = useMemo(() => {
    if (!expandedId) return [];
    const item = essays.find(e => e.id === expandedId);
    if (!item) return [];
    const { media } = separateContent(item.content || '');
    return media;
  }, [expandedId, essays]);

  return (
    <main className="hide-scrollbar">
      <Header />

      <div className={contentStyles.pageContainer}>
        {/* Left: Content list */}
        <div className={contentStyles.contentWrapper} style={{ marginTop: 0, marginBottom: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* New essay form */}
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

            {essays.map((essay) => {
              const isEditing = editingId === essay.id;
              const isExpanded = expandedId === essay.id;
              const { text } = separateContent(essay.content || '');

              return (
                <article
                  key={essay.id}
                  ref={(el) => {
                    if (el) articleRefs.current.set(essay.id, el);
                  }}
                  style={{ paddingBottom: '20px' }}
                >
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
                          <FitTitle
                            date={essay.date ? new Date(essay.date).toLocaleDateString('sv-SE').replace(/-/g, '.') : ''}
                            title={essay.title || ''}
                            onClick={() => setExpandedId(isExpanded ? null : essay.id)}
                          />
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
                              style={{ color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap', fontFamily: (essay.fontFamily || essay.font_family) === 'serif' ? '"Noto Serif KR", serif' : '"Noto Sans KR", sans-serif' }}
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
                              onClick={() => handleMoveUp(essay.id)}
                              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                              title="Move up"
                            >
                              ∧
                            </button>
                            <button
                              onClick={() => handleMoveDown(essay.id)}
                              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                              title="Move down"
                            >
                              ∨
                            </button>
                            <button
                              onClick={() => handleDelete(essay.id)}
                              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline', color: '#cc0000' }}
                            >
                              delete
                            </button>
                            <button
                              onClick={() => handleSaveInline(essay.id)}
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
                            onClick={() => handleStartEditing(essay)}
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

            {essays.length === 0 && (
              <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>No essays yet.</p>
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
                  ADD_ATTR: ['allow', 'allowfullscreen', 'scrolling', 'src', 'width', 'height']
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

export default function EssaysPage() {
  return (
    <Suspense fallback={<div />}>
      <EssaysPageContent />
    </Suspense>
  );
}
