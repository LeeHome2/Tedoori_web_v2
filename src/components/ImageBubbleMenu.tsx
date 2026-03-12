"use client";

import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './ImageBubbleMenu.module.css';
import { Lock, Unlock, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { NodeSelection } from '@tiptap/pm/state';

interface ImageBubbleMenuProps {
  editor: Editor;
}

export default function ImageBubbleMenu({ editor }: ImageBubbleMenuProps) {
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [fixedSize, setFixedSize] = useState(false);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [lockRatio, setLockRatio] = useState(true);

  // Store image position for direct updates
  const imagePositionRef = useRef<number | null>(null);

  // Get current image attributes when selection changes
  const updateFromSelection = useCallback(() => {
    const { selection } = editor.state;
    const node = editor.state.doc.nodeAt(selection.from);

    if (node?.type.name === 'image') {
      imagePositionRef.current = selection.from;
      const attrs = node.attrs;
      setWidth(attrs.width?.toString() || '');
      setHeight(attrs.height?.toString() || '');
      setFixedSize(attrs.fixedSize || false);
      setAlign(attrs.align || 'center');

      // Calculate aspect ratio from original image
      if (attrs.width && attrs.height) {
        setAspectRatio(attrs.width / attrs.height);
      }
    }
  }, [editor]);

  useEffect(() => {
    updateFromSelection();

    editor.on('selectionUpdate', updateFromSelection);
    return () => {
      editor.off('selectionUpdate', updateFromSelection);
    };
  }, [editor, updateFromSelection]);

  // Helper function to update image attributes at stored position
  const updateImageAttributes = useCallback((newAttrs: Record<string, unknown>) => {
    const pos = imagePositionRef.current;
    console.log('[ImageBubbleMenu] updateImageAttributes called, pos:', pos, 'newAttrs:', JSON.stringify(newAttrs));

    if (pos === null) {
      console.log('[ImageBubbleMenu] pos is null, returning');
      return false;
    }

    const node = editor.state.doc.nodeAt(pos);
    console.log('[ImageBubbleMenu] node at pos:', node?.type.name, 'current attrs:', JSON.stringify(node?.attrs));

    if (!node || node.type.name !== 'image') {
      console.log('[ImageBubbleMenu] node is not image, returning');
      return false;
    }

    // Merge old attrs with new attrs
    const mergedAttrs = {
      ...node.attrs,
      ...newAttrs,
    };
    console.log('[ImageBubbleMenu] merged attrs:', JSON.stringify(mergedAttrs));

    // Delete the node and re-insert with new attributes to force DOM re-render
    const { tr, schema } = editor.state;
    const nodeType = schema.nodes.image;

    if (!nodeType) {
      console.log('[ImageBubbleMenu] image node type not found in schema');
      return false;
    }

    console.log('[ImageBubbleMenu] Deleting node at pos:', pos, 'nodeSize:', node.nodeSize);

    // Delete the old node
    tr.delete(pos, pos + node.nodeSize);

    // Insert a new node with merged attributes
    const newNode = nodeType.create(mergedAttrs);
    tr.insert(pos, newNode);

    // Set selection to the new node
    tr.setSelection(NodeSelection.create(tr.doc, pos));

    editor.view.dispatch(tr);

    // Update the position ref since we replaced the node
    imagePositionRef.current = pos;

    console.log('[ImageBubbleMenu] Node replaced with new attrs:', JSON.stringify(mergedAttrs));

    // Verify the update worked
    const updatedNode = editor.state.doc.nodeAt(pos);
    console.log('[ImageBubbleMenu] AFTER update - node attrs:', JSON.stringify(updatedNode?.attrs));

    // Force DOM update by manually setting attributes on the DOM element
    // This is a workaround for ProseMirror not properly re-rendering custom attributes
    setTimeout(() => {
      const imgElement = editor.view.dom.querySelector(`img[alt="${mergedAttrs.alt}"]`) as HTMLImageElement;
      if (imgElement) {
        imgElement.setAttribute('data-fixed-size', mergedAttrs.fixedSize ? 'true' : 'false');
        imgElement.setAttribute('data-align', mergedAttrs.align as string || 'center');
        console.log('[ImageBubbleMenu] DOM manually updated');
      }
    }, 0);

    return true;
  }, [editor]);

  const handleWidthChange = (newWidth: string) => {
    setWidth(newWidth);

    if (lockRatio && aspectRatio && newWidth) {
      const w = parseInt(newWidth, 10);
      if (!isNaN(w)) {
        setHeight(Math.round(w / aspectRatio).toString());
      }
    }
  };

  const handleHeightChange = (newHeight: string) => {
    setHeight(newHeight);

    if (lockRatio && aspectRatio && newHeight) {
      const h = parseInt(newHeight, 10);
      if (!isNaN(h)) {
        setWidth(Math.round(h * aspectRatio).toString());
      }
    }
  };

  const applyChanges = () => {
    const w = width ? parseInt(width, 10) : undefined;
    const h = height ? parseInt(height, 10) : undefined;

    updateImageAttributes({
      width: w,
      height: h,
      fixedSize: fixedSize,
    });
  };

  const handleFixedSizeChange = (checked: boolean) => {
    setFixedSize(checked);

    const w = width ? parseInt(width, 10) : undefined;
    const h = height ? parseInt(height, 10) : undefined;

    updateImageAttributes({
      width: w,
      height: h,
      fixedSize: checked,
      align: align, // Include current align state
    });
  };

  // Preset sizes
  const presetSizes = [
    { label: 'S', width: 200 },
    { label: 'M', width: 400 },
    { label: 'L', width: 600 },
    { label: 'XL', width: 800 },
  ];

  const applyPreset = (presetWidth: number) => {
    const newWidth = presetWidth.toString();
    setWidth(newWidth);

    let newHeight: number | undefined;
    if (aspectRatio) {
      newHeight = Math.round(presetWidth / aspectRatio);
      setHeight(newHeight.toString());
    }

    updateImageAttributes({
      width: presetWidth,
      height: newHeight,
      fixedSize: fixedSize,
    });
  };

  const handleAlignChange = (newAlign: 'left' | 'center' | 'right') => {
    setAlign(newAlign);

    const w = width ? parseInt(width, 10) : undefined;
    const h = height ? parseInt(height, 10) : undefined;

    updateImageAttributes({
      width: w,
      height: h,
      fixedSize: fixedSize, // Include current fixedSize state
      align: newAlign,
    });
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state }) => {
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from);
        return node?.type.name === 'image';
      }}
    >
      <div
        className={`${styles.bubbleMenu} ${styles.container}`}
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Preset Sizes */}
        <div className={styles.presets}>
          {presetSizes.map((preset) => (
            <button
              key={preset.label}
              className={styles.presetBtn}
              onClick={() => applyPreset(preset.width)}
              title={`${preset.width}px`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Manual Size Input */}
        <div className={styles.sizeInputs}>
          <input
            type="number"
            value={width}
            onChange={(e) => handleWidthChange(e.target.value)}
            onBlur={applyChanges}
            onKeyDown={(e) => e.key === 'Enter' && applyChanges()}
            placeholder="W"
            className={styles.sizeInput}
            min={50}
            max={2000}
          />
          <button
            className={`${styles.lockBtn} ${lockRatio ? styles.locked : ''}`}
            onClick={() => setLockRatio(!lockRatio)}
            title={lockRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
          >
            {lockRatio ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
          <input
            type="number"
            value={height}
            onChange={(e) => handleHeightChange(e.target.value)}
            onBlur={applyChanges}
            onKeyDown={(e) => e.key === 'Enter' && applyChanges()}
            placeholder="H"
            className={styles.sizeInput}
            min={50}
            max={2000}
          />
        </div>

        <div className={styles.divider} />

        {/* Fixed Size Toggle */}
        <label className={styles.fixedToggle} title="크기 고정: 체크하면 영역이 늘어나도 이미지 크기 유지">
          <input
            type="checkbox"
            checked={fixedSize}
            onChange={(e) => handleFixedSizeChange(e.target.checked)}
          />
          <span className={styles.checkboxLabel}>고정</span>
        </label>

        <div className={styles.divider} />

        {/* Alignment */}
        <div className={styles.alignButtons}>
          <button
            className={`${styles.alignBtn} ${align === 'left' ? styles.active : ''}`}
            onClick={() => handleAlignChange('left')}
            title="왼쪽 정렬"
          >
            <AlignLeft size={14} />
          </button>
          <button
            className={`${styles.alignBtn} ${align === 'center' ? styles.active : ''}`}
            onClick={() => handleAlignChange('center')}
            title="가운데 정렬"
          >
            <AlignCenter size={14} />
          </button>
          <button
            className={`${styles.alignBtn} ${align === 'right' ? styles.active : ''}`}
            onClick={() => handleAlignChange('right')}
            title="오른쪽 정렬"
          >
            <AlignRight size={14} />
          </button>
        </div>
      </div>
    </BubbleMenu>
  );
}
