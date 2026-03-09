/**
 * Custom hook for managing content editor state and operations
 * Used by Essays, News, and About pages
 */

import { useState, useEffect, useCallback } from 'react';
import { uploadImage, generateImageHtml } from '@/lib/utils/image';
import { generateYoutubeIframe } from '@/lib/utils/youtube';

interface ContentItem {
  id: string;
  title?: string;
  content: string;
  date?: string;
  order_index?: number;
  [key: string]: any;
}

interface UseContentEditorOptions {
  apiEndpoint: string;  // '/api/essays', '/api/news', '/api/about'
  defaultFormData?: Record<string, any>;
}

interface UseContentEditorReturn {
  // State
  items: ContentItem[];
  editingId: string | null;
  isAddingNew: boolean;
  isUploading: boolean;
  formData: Record<string, any>;

  // Actions
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  fetchItems: () => Promise<void>;
  handleSaveInline: (id: string) => Promise<void>;
  handleSaveNew: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleMoveUp: (id: string) => Promise<void>;
  handleMoveDown: (id: string) => Promise<void>;
  startAddingNew: () => void;
  startEditing: (item: ContentItem) => void;
  cancelEditing: () => void;
  cancelAddingNew: () => void;
  handleAddImage: () => void;
  handleAddYouTube: () => void;
}

export function useContentEditor({
  apiEndpoint,
  defaultFormData = {},
}: UseContentEditorOptions): UseContentEditorReturn {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>(defaultFormData);

  // Fetch items from API
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint);
      if (res.ok) {
        const data = await res.json();
        console.log(`Fetched items from ${apiEndpoint}:`, data.length);
        setItems(data);
      } else {
        console.error(`Failed to fetch from ${apiEndpoint}:`, await res.text());
      }
    } catch (error) {
      console.error(`Failed to fetch from ${apiEndpoint}:`, error);
    }
  }, [apiEndpoint]);

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Save existing item (inline edit)
  const handleSaveInline = async (id: string) => {
    console.log('Saving item update:', { id, formData });

    try {
      const res = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      console.log('Item saved successfully');
      await fetchItems();
      setEditingId(null);
    } catch (error: any) {
      console.error('Failed to save item:', error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  // Save new item
  const handleSaveNew = async () => {
    // Basic validation - can be overridden by page
    if (formData.title !== undefined && !formData.title?.trim()) {
      alert('Title is required');
      return;
    }

    console.log('Saving new item:', formData);

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      console.log('New item saved successfully');
      await fetchItems();
      setIsAddingNew(false);
      setFormData(defaultFormData);
    } catch (error: any) {
      console.error('Failed to save new item:', error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  // Delete item
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;

    try {
      const res = await fetch(`${apiEndpoint}?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      await fetchItems();
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      alert(`Failed to delete: ${error.message}`);
    }
  };

  // Move item up in order
  const handleMoveUp = async (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index <= 0) return;

    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];

    // Update order_index for all items
    const updates = newItems.map((item, idx) => ({
      id: item.id,
      order_index: idx,
    }));

    setItems(newItems);

    try {
      await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      await fetchItems(); // Revert on error
    }
  };

  // Move item down in order
  const handleMoveDown = async (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0 || index >= items.length - 1) return;

    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];

    // Update order_index for all items
    const updates = newItems.map((item, idx) => ({
      id: item.id,
      order_index: idx,
    }));

    setItems(newItems);

    try {
      await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      await fetchItems(); // Revert on error
    }
  };

  // Start adding new item
  const startAddingNew = () => {
    setIsAddingNew(true);
    setFormData(defaultFormData);
  };

  // Start editing existing item
  const startEditing = (item: ContentItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
      date: item.date,
      ...item,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setFormData(defaultFormData);
  };

  // Cancel adding new
  const cancelAddingNew = () => {
    setIsAddingNew(false);
    setFormData(defaultFormData);
  };

  // Add image to content
  const handleAddImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setIsUploading(true);

        // Upload image using utility
        const url = await uploadImage(file);

        // Add image HTML to content
        setFormData((prev) => ({
          ...prev,
          content: prev.content + '\n' + generateImageHtml(url) + '\n',
        }));
      } catch (error: any) {
        alert(error.message);
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  // Add YouTube video to content
  const handleAddYouTube = () => {
    const url = prompt('Enter YouTube URL:');
    if (!url) return;

    const iframe = generateYoutubeIframe(url);

    if (!iframe) {
      alert('Invalid YouTube URL');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      content: prev.content + '\n' + iframe + '\n',
    }));
  };

  return {
    // State
    items,
    editingId,
    isAddingNew,
    isUploading,
    formData,

    // Actions
    setFormData,
    fetchItems,
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
  };
}
