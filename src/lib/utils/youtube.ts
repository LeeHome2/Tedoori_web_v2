/**
 * YouTube URL parsing and embedding utilities
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 *
 * @param url - YouTube URL
 * @returns Video ID or null if invalid
 */
export function extractYoutubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /youtu\.be\/([^#\&\?]{11})/,                    // youtu.be/VIDEO_ID
    /youtube\.com\/watch\?v=([^#\&\?]{11})/,        // youtube.com/watch?v=VIDEO_ID
    /youtube\.com\/embed\/([^#\&\?]{11})/,          // youtube.com/embed/VIDEO_ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate YouTube embed URL from video ID
 * @param videoId - YouTube video ID
 * @returns Embed URL
 */
export function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Generate YouTube thumbnail URL
 * @param videoId - YouTube video ID
 * @param quality - Thumbnail quality (default, hq, maxres)
 * @returns Thumbnail URL
 */
export function getYoutubeThumbnail(
  videoId: string,
  quality: 'default' | 'hq' | 'maxres' = 'hq'
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}

/**
 * Generate YouTube iframe HTML for embedding
 * @param url - YouTube URL
 * @returns iframe HTML string or null if invalid URL
 */
export function generateYoutubeIframe(url: string): string | null {
  const videoId = extractYoutubeId(url);

  if (!videoId) {
    return null;
  }

  return `<iframe width="100%" height="400" src="${getYoutubeEmbedUrl(videoId)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="margin: 10px 0;"></iframe>`;
}
