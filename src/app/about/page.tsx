
"use client";

import { useState, useEffect, useRef } from 'react';
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useAdmin } from "@/context/AdminContext";
import DOMPurify from 'dompurify';
import OfficeMap from '@/components/OfficeMap';

interface AboutContent {
  intro: string;
  contact: string;
}

const DEFAULT_CONTENT: AboutContent = {
  intro: `<p style="margin-bottom: 20px;">Tedoori is an architectural practice based in Seoul.</p><p>We focus on the essential qualities of space and structure, exploring the relationship between form and function.</p>`,
  contact: `<p>Email: info@tedoori.com</p><p>Tel: +82 2 1234 5678</p><p>Address: 123, Sejong-daero, Jongno-gu, Seoul, Republic of Korea</p>`
};

export default function AboutPage() {
  const { isAdmin, adminMode } = useAdmin();
  const [content, setContent] = useState<AboutContent>(DEFAULT_CONTENT);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/about');
      if (res.ok) {
        const data = await res.json();
        // If API returns empty object (table not ready), keep defaults
        if (Object.keys(data).length > 0) {
            setContent(prev => ({ ...prev, ...data }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch about content', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStart = (section: keyof AboutContent) => {
    if (!isAdmin || !adminMode) return;
    setEditingSection(section);
    setEditValue(content[section]);
    // Focus happens via autoFocus on textarea
  };

  const handleSave = async () => {
    if (!editingSection) return;
    
    // Basic validation
    if (editValue.length > 1000) {
        alert("Content exceeds 1000 characters limit.");
        return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: editingSection,
          content: editValue
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update');
      }

      setContent(prev => ({ ...prev, [editingSection]: editValue }));
      setEditingSection(null);
      alert('Content updated successfully');
    } catch (error: any) {
      console.error('Update failed', error);
      alert(`Update failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditValue('');
  };

  // Helper to render HTML content safely using DOMPurify for XSS prevention
  const createMarkup = (html: string) => {
    // Only sanitize if window is defined (client-side) to avoid hydration mismatch if possible,
    // but DOMPurify needs window. For SSR, we might need a different approach or rely on client-side sanitization.
    // Since this is a "use client" component, it runs on client, but initial render is on server.
    // DOMPurify works in Node.js with jsdom, but here we just want to ensure displayed content is safe.
    
    // Simple check to ensure we are in browser environment or handle it gracefully
    if (typeof window !== 'undefined') {
        return { __html: DOMPurify.sanitize(html) };
    }
    return { __html: html }; // Fallback for server-side render (be careful if source is untrusted)
  };

  return (
    <main>
      <Header />
      <div style={{ 
        maxWidth: '800px', 
        margin: '150px auto 100px', 
        padding: '0 20px', 
        fontFamily: 'Consolas, monospace',
        lineHeight: '1.6',
        minHeight: '60vh'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '40px', fontWeight: 'bold' }}>ABOUT</h1>
        
        {/* Intro Section */}
        <div 
            style={{ 
                marginBottom: '40px', 
                position: 'relative',
                cursor: (isAdmin && adminMode && !editingSection) ? 'pointer' : 'default',
                border: (isAdmin && adminMode && !editingSection) ? '1px dashed #ccc' : '1px solid transparent',
                padding: '10px',
                borderRadius: '4px',
                transition: 'border-color 0.2s'
            }}
            onClick={() => !editingSection && handleEditStart('intro')}
            title={isAdmin && adminMode ? "Click to edit intro" : ""}
        >
            {editingSection === 'intro' ? (
                <div onClick={e => e.stopPropagation()}>
                    <textarea 
                        ref={editorRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{ 
                            width: '100%', 
                            minHeight: '150px', 
                            padding: '10px', 
                            fontFamily: 'inherit',
                            marginBottom: '10px',
                            resize: 'vertical'
                        }}
                        autoFocus
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            style={{ 
                                padding: '5px 15px', 
                                backgroundColor: 'black', 
                                color: 'white', 
                                border: 'none', 
                                cursor: 'pointer' 
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                            onClick={handleCancel} 
                            disabled={isSaving}
                            style={{ 
                                padding: '5px 15px', 
                                backgroundColor: '#f0f0f0', 
                                border: 'none', 
                                cursor: 'pointer' 
                            }}
                        >
                            Cancel
                        </button>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: editValue.length > 1000 ? 'red' : '#999' }}>
                            {editValue.length}/1000
                        </span>
                    </div>
                </div>
            ) : (
                <div dangerouslySetInnerHTML={createMarkup(content.intro)} />
            )}
            {isAdmin && adminMode && !editingSection && (
                <span style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: 'transparent',
                    color: '#666',
                    fontSize: '12px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    zIndex: 10
                }}>
                    edit
                </span>
            )}
        </div>

        {/* Contact Section */}
        <div 
            style={{ 
                marginBottom: '40px',
                position: 'relative',
                cursor: (isAdmin && adminMode && !editingSection) ? 'pointer' : 'default',
                border: (isAdmin && adminMode && !editingSection) ? '1px dashed #ccc' : '1px solid transparent',
                padding: '10px',
                borderRadius: '4px',
                transition: 'border-color 0.2s'
            }}
            onClick={() => !editingSection && handleEditStart('contact')}
            title={isAdmin && adminMode ? "Click to edit contact" : ""}
        >
          <h2 style={{ fontSize: '18px', marginBottom: '20px', fontWeight: 'bold' }}>CONTACT</h2>
          
          {editingSection === 'contact' ? (
                <div onClick={e => e.stopPropagation()}>
                    <textarea 
                        ref={editorRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{ 
                            width: '100%', 
                            minHeight: '150px', 
                            padding: '10px', 
                            fontFamily: 'inherit',
                            marginBottom: '10px',
                            resize: 'vertical'
                        }}
                        autoFocus
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            style={{ 
                                padding: '5px 15px', 
                                backgroundColor: 'black', 
                                color: 'white', 
                                border: 'none', 
                                cursor: 'pointer' 
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                            onClick={handleCancel} 
                            disabled={isSaving}
                            style={{ 
                                padding: '5px 15px', 
                                backgroundColor: '#f0f0f0', 
                                border: 'none', 
                                cursor: 'pointer' 
                            }}
                        >
                            Cancel
                        </button>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: editValue.length > 1000 ? 'red' : '#999' }}>
                            {editValue.length}/1000
                        </span>
                    </div>
                </div>
            ) : (
                <div dangerouslySetInnerHTML={createMarkup(content.contact)} />
            )}
             {isAdmin && adminMode && !editingSection && (
                <span style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: 'transparent',
                    color: '#666',
                    fontSize: '12px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    zIndex: 10
                }}>
                    edit
                </span>
            )}
        </div>

        {/* Office Map */}
        <OfficeMap />

      </div>
      <BackToTop />
    </main>
  );
}
