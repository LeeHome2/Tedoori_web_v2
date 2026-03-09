"use client";

import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useAdmin } from "@/context/AdminContext";
import OfficeMap from '@/components/OfficeMap';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Dropcursor from '@tiptap/extension-dropcursor';
import styles from './about.module.css';
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
    content: `<p style="margin-bottom: 20px;">Tedoori is an architectural practice based in Seoul.</p><p>We focus on the essential qualities of space and structure, exploring the relationship between form and function.</p>`,
    order_index: 0
  },
  {
    id: 'contact-block',
    type: 'text',
    content: `<p>Email: info@tedoori.com</p><p>Tel: +82 2 1234 5678</p><p>Address: 123, Sejong-daero, Jongno-gu, Seoul, Republic of Korea</p>`,
    order_index: 1
  },
  {
    id: 'map-block',
    type: 'map',
    content: '',
    order_index: 2
  }
];

function TextBlockEditor({ block, onSave, onCancel, onDelete }: { block: AboutBlock; onSave: (content: string) => void; onCancel: () => void; onDelete: () => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: false,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
      }),
      Dropcursor.configure({
        color: '#000000',
        width: 2,
      }),
    ],
    content: block.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        style: 'white-space: pre-wrap;',
      },
    },
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
      fileType: 'image/webp'
    };

    try {
      setIsUploading(true);
      const compressedFile = await imageCompression(file, options);

      const formData = new FormData();
      formData.append('file', compressedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      editor.chain().focus().setImage({ src: data.url }).run();
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Image upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  if (!editor) return null;

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.toolbar}>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? styles.active : ''}>
          <strong>B</strong>
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? styles.active : ''}>
          <em>I</em>
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}>
          H2
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? styles.active : ''}>
          H3
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? styles.active : ''}>
          Left
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? styles.active : ''}>
          Center
        </button>
        <label className={styles.imageBtn}>
          Image
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        </label>
        {isUploading && <span>Uploading...</span>}
      </div>
      <EditorContent editor={editor} className={styles.editorContent} />
      <div className={styles.buttonRow}>
        <button onClick={() => {
          const html = editor.getHTML();
          console.log('Editor HTML before save:', html);
          onSave(html);
        }} className={styles.saveBtn}>Save</button>
        <button onClick={onCancel} className={styles.cancelBtn}>Cancel</button>
        <button onClick={onDelete} className={styles.deleteBtn}>Delete</button>
      </div>
    </div>
  );
}

function SortableBlock({ block, isEditing, onEdit, onDelete, onSave, onCancel }: {
  block: AboutBlock;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (content: string) => void;
  onCancel: () => void;
}) {
  const { isAdmin, adminMode } = useAdmin();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (block.type === 'map') {
    return (
      <div ref={setNodeRef} style={style} className={styles.block}>
        <div style={{ position: 'relative' }}>
          <OfficeMap />
          {isAdmin && adminMode && (
            <div className={styles.blockControls}>
              <button {...attributes} {...listeners} className={styles.dragHandle}>☰</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div ref={setNodeRef} style={style} className={styles.block}>
        <div className={styles.imageBlock}>
          <img src={block.content} alt="About" style={{ maxWidth: '100%', height: 'auto' }} />
          {isAdmin && adminMode && (
            <div className={styles.blockControls}>
              <button {...attributes} {...listeners} className={styles.dragHandle}>☰</button>
              <button onClick={onDelete} className={styles.deleteBtn}>Delete</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.block}>
      {isEditing ? (
        <TextBlockEditor block={block} onSave={onSave} onCancel={onCancel} onDelete={onDelete} />
      ) : (
        <div className={styles.textBlock}>
          <div
            className={styles.textContent}
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
          {isAdmin && adminMode && (
            <div className={styles.blockControls}>
              <button {...attributes} {...listeners} className={styles.dragHandle}>☰</button>
              <button onClick={onEdit} className={styles.editBtn}>Edit</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AboutPage() {
  const { isAdmin, adminMode } = useAdmin();
  const [blocks, setBlocks] = useState<AboutBlock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const res = await fetch('/api/about');
      if (res.ok) {
        const data = await res.json();

        // If no blocks in database, initialize with default blocks
        if (data.length === 0) {
          console.log('No blocks found, initializing with defaults...');
          await initializeDefaultBlocks();
        } else {
          // Check if default blocks exist in DB
          const hasIntro = data.some((b: AboutBlock) => b.id === 'intro-block');
          const hasContact = data.some((b: AboutBlock) => b.id === 'contact-block');
          const hasMap = data.some((b: AboutBlock) => b.id === 'map-block');

          // If any default block is missing, add them
          if (!hasIntro || !hasContact || !hasMap) {
            console.log('Some default blocks missing, adding them...');
            const missingBlocks: AboutBlock[] = [];

            if (!hasIntro) missingBlocks.push(DEFAULT_BLOCKS[0]);
            if (!hasContact) missingBlocks.push(DEFAULT_BLOCKS[1]);
            if (!hasMap) missingBlocks.push(DEFAULT_BLOCKS[2]);

            // Add missing default blocks to DB
            for (const block of missingBlocks) {
              await fetch('/api/about', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(block)
              });
            }

            // Re-fetch to get complete list
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
      // On error, show default blocks
      setBlocks(DEFAULT_BLOCKS);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultBlocks = async () => {
    try {
      // Create all default blocks in DB
      for (const block of DEFAULT_BLOCKS) {
        await fetch('/api/about', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(block)
        });
      }

      // Re-fetch to get the created blocks
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Save new order to backend (upsert handles both existing and default blocks)
        fetch('/api/about', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItems)
        });

        return newItems;
      });
    }
  };

  const handleAddText = async () => {
    const newBlock: AboutBlock = {
      id: `block-${Date.now()}`,
      type: 'text',
      content: '<p>New text block</p>',
      order_index: blocks.length
    };

    console.log('Adding text block:', newBlock);

    try {
      const res = await fetch('/api/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlock)
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Error response:', errorData);
        alert(`Failed to add block: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const data = await res.json();
      console.log('Created block:', data);
      setBlocks([...blocks, data]);
      setEditingId(data.id);
    } catch (error) {
      console.error('Failed to add block', error);
      alert('Failed to add block. Check console for details.');
    }
  };

  const handleAddImageClick = () => {
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
        console.log('Compressing image...');
        const compressedFile = await imageCompression(file, options);

        const formData = new FormData();
        formData.append('file', compressedFile);

        console.log('Uploading image...');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          console.error('Upload failed:', errorText);
          throw new Error('Upload failed');
        }
        const uploadData = await uploadRes.json();
        console.log('Upload successful:', uploadData);

        const newBlock: AboutBlock = {
          id: `block-${Date.now()}`,
          type: 'image',
          content: uploadData.url,
          order_index: blocks.length
        };

        console.log('Creating image block:', newBlock);
        const res = await fetch('/api/about', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBlock)
        });

        console.log('Response status:', res.status);

        if (!res.ok) {
          const errorData = await res.json();
          console.error('Error response:', errorData);
          alert(`Failed to add image block: ${errorData.error || 'Unknown error'}`);
          return;
        }

        const data = await res.json();
        console.log('Created block:', data);
        setBlocks([...blocks, data]);
      } catch (error) {
        console.error('Failed to add image', error);
        alert('Failed to add image. Check console for details.');
      }
    };
    input.click();
  };

  const handleAddMap = async () => {
    const newBlock: AboutBlock = {
      id: `block-${Date.now()}`,
      type: 'map',
      content: '',
      order_index: blocks.length
    };

    console.log('Adding map block:', newBlock);

    try {
      const res = await fetch('/api/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlock)
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Error response:', errorData);
        alert(`Failed to add map: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const data = await res.json();
      console.log('Created block:', data);
      setBlocks([...blocks, data]);
    } catch (error) {
      console.error('Failed to add map', error);
      alert('Failed to add map. Check console for details.');
    }
  };

  const handleSave = async (blockId: string, content: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    console.log('Saving block with content:', content);

    try {
      // Use PUT with upsert - works for both new and existing blocks
      const res = await fetch('/api/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...block, content })
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Saved block data:', data);
        setBlocks(blocks.map(b => b.id === blockId ? data : b));
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to save block', error);
      alert('Failed to save block');
    }
  };

  const handleDelete = async (blockId: string) => {
    if (!confirm('Delete this block?')) return;

    try {
      // Try to delete from DB
      const res = await fetch(`/api/about?id=${blockId}`, {
        method: 'DELETE'
      });

      // Remove from local state regardless of DB result (for default blocks)
      setBlocks(blocks.filter(b => b.id !== blockId));
    } catch (error) {
      console.error('Failed to delete block', error);
      // Still remove from local state
      setBlocks(blocks.filter(b => b.id !== blockId));
    }
  };

  return (
    <main>
      <Header />

      {isAdmin && adminMode && (
        <div style={{ position: 'fixed', top: '150px', right: '40px', zIndex: 2001 }}>
          <button onClick={() => setShowAddModal(true)} className={styles.addBtn} title="Add block" aria-label="Add block">
          </button>
        </div>
      )}

      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Block</h2>
            <div className={styles.blockTypeList}>
              <button onClick={() => { handleAddText(); setShowAddModal(false); }} className={styles.blockTypeBtn}>
                📝 Text Block
              </button>
              <button onClick={() => { handleAddImageClick(); setShowAddModal(false); }} className={styles.blockTypeBtn}>
                📷 Image Block
              </button>
              <button onClick={() => { handleAddMap(); setShowAddModal(false); }} className={styles.blockTypeBtn}>
                🗺️ Map Block
              </button>
            </div>
            <button onClick={() => setShowAddModal(false)} className={styles.modalClose}>
              Cancel
            </button>
          </div>
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
        <h1 style={{ fontSize: '24px', marginBottom: '40px', fontWeight: 'bold', paddingLeft: '0' }}>ABOUT</h1>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          id={`dnd-about`}
        >
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                isEditing={editingId === block.id}
                onEdit={() => setEditingId(block.id)}
                onDelete={() => handleDelete(block.id)}
                onSave={(content) => handleSave(block.id, content)}
                onCancel={() => setEditingId(null)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && !isLoading && (
          <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>Loading...</p>
        )}
      </div>

      <BackToTop />
    </main>
  );
}
