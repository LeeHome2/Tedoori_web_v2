"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useAdmin } from "@/context/AdminContext";
import styles from "./essays.module.css";

interface Essay {
  id: string;
  title: string;
  content: string;
  date: string;
  created_at: string;
}

export default function EssaysPage() {
  const { isAdmin, adminMode } = useAdmin();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchEssays();
  }, []);

  const fetchEssays = async () => {
    try {
      const res = await fetch('/api/essays');
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched essays:', data.length);
        setEssays(data);
      } else {
        console.error('Failed to fetch essays:', await res.text());
      }
    } catch (error) {
      console.error('Failed to fetch essays:', error);
    }
  };

  const handleSaveInline = async (id: string) => {
    console.log('Saving essay update:', { id, formData });

    try {
      const res = await fetch('/api/essays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      console.log('Essay saved successfully');
      await fetchEssays();
      setEditingId(null);
    } catch (error: any) {
      console.error('Failed to save essay:', error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  const handleSaveNew = async () => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    console.log('Saving new essay:', formData);

    try {
      const res = await fetch('/api/essays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      console.log('New essay saved successfully');
      await fetchEssays();
      setIsAddingNew(false);
      setFormData({
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error('Failed to save new essay:', error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this essay?')) return;

    try {
      const res = await fetch(`/api/essays?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      await fetchEssays();
    } catch (error: any) {
      console.error('Failed to delete essay:', error);
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

  const startEditing = (essay: Essay) => {
    setEditingId(essay.id);
    setFormData({
      title: essay.title,
      content: essay.content,
      date: essay.date
    });
    // Expand the content when editing
    setExpandedId(essay.id);
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
            aria-label="Add essay"
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
          <span style={{ color: 'black', fontWeight: 'bold' }}>essays</span>
        </div>

        <h1 style={{ fontSize: '24px', marginBottom: '40px', fontWeight: 'bold', textTransform: 'uppercase' }}>Essays</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* New essay form */}
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

          {essays.map((essay) => {
            const isEditing = editingId === essay.id;

            return (
              <article key={essay.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
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
                          {new Date(essay.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                        </span>
                        <h2
                          style={{ fontSize: '18px', marginBottom: '10px', cursor: 'pointer', fontWeight: expandedId === essay.id ? 'bold' : 'normal' }}
                          onClick={() => !isAdmin || !adminMode ? setExpandedId(expandedId === essay.id ? null : essay.id) : null}
                        >
                          {essay.title}
                        </h2>
                        {expandedId === essay.id && (
                          <div
                            style={{ color: '#666', marginTop: '15px', whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{ __html: essay.content }}
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
                            onClick={() => handleDelete(essay.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                          >
                            delete
                          </button>
                          <button
                            onClick={() => handleSaveInline(essay.id)}
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
                          onClick={() => startEditing(essay)}
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

      <BackToTop />
    </main>
  );
}
