import { Node, mergeAttributes } from '@tiptap/core';

export interface ResizableImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
        height?: number;
        fixedSize?: boolean;
        align?: string;
      }) => ReturnType;
    };
  }
}

export const ResizableImage = Node.create<ResizableImageOptions>({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => {
          const dataWidth = element.getAttribute('data-width');
          if (dataWidth) return parseInt(dataWidth, 10);
          const width = element.getAttribute('width');
          if (width) return parseInt(width, 10);
          return null;
        },
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return {
            'data-width': attributes.width,
            width: attributes.width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const dataHeight = element.getAttribute('data-height');
          if (dataHeight) return parseInt(dataHeight, 10);
          const height = element.getAttribute('height');
          if (height) return parseInt(height, 10);
          return null;
        },
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return {
            'data-height': attributes.height,
            height: attributes.height,
          };
        },
      },
      fixedSize: {
        default: false,
        parseHTML: element => {
          return element.getAttribute('data-fixed-size') === 'true';
        },
        renderHTML: attributes => {
          return {
            'data-fixed-size': attributes.fixedSize ? 'true' : 'false',
          };
        },
      },
      align: {
        default: 'center',
        parseHTML: element => {
          return element.getAttribute('data-align') || 'center';
        },
        renderHTML: attributes => {
          return {
            'data-align': attributes.align || 'center',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // Get actual attribute values from node.attrs (not HTMLAttributes which has data-* keys)
    const fixedSize = node.attrs.fixedSize;
    const align = node.attrs.align || 'center';
    const width = node.attrs.width;
    const height = node.attrs.height;

    const style: string[] = [];

    if (fixedSize && width) {
      style.push(`width: ${width}px`);
      if (height) {
        style.push(`height: ${height}px`);
      }
    } else if (width) {
      style.push(`width: ${width}px`);
      style.push('max-width: 100%');
      style.push('height: auto');
    }

    // Filter out attribute-level renderHTML outputs to avoid duplicates
    const { 'data-fixed-size': _, 'data-align': __, 'data-width': ___, 'data-height': ____, ...rest } = HTMLAttributes;

    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, rest, {
        width: width || undefined,
        height: height || undefined,
        'data-width': width || undefined,
        'data-height': height || undefined,
        'data-fixed-size': fixedSize ? 'true' : 'false',
        'data-align': align,
        style: style.length > 0 ? style.join('; ') : undefined,
      }),
    ];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

export default ResizableImage;
