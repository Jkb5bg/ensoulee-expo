// utils/imageHelpers.ts

/**
 * Cleans a presigned URL from backend response
 * 
 * The backend may return presigned URLs with quotes or other characters
 * that need to be cleaned before using them
 * 
 * @param url The URL to clean
 * @returns Cleaned URL string
 */
export const cleanPresignedUrl = (url: string): string => {
  if (!url) return '';
  
  // Remove any quotes from response
  let cleanUrl = url.replace(/"/g, '');
  cleanUrl = cleanUrl.replace(/'/g, '');
  
  // Remove any whitespace
  cleanUrl = cleanUrl.trim();
  
  // Handle AWS URLs that have encoded characters
  if (cleanUrl.includes('%2F')) {
    try {
      cleanUrl = decodeURIComponent(cleanUrl);
    } catch (error) {
      console.warn('Failed to decode URL:', error);
    }
  }
  
  // Fix any double slashes that aren't part of protocol
  cleanUrl = cleanUrl.replace(/([^:])\/\//g, '$1/');
  
  // Make sure URL has proper protocol
  if (!cleanUrl.startsWith('http')) {
    if (cleanUrl.startsWith('//')) {
      cleanUrl = 'https:' + cleanUrl;
    } else if (cleanUrl.startsWith('/')) {
      // This is a relative URL, we can't use it - return empty
      return '';
    } else {
      cleanUrl = 'https://' + cleanUrl;
    }
  }
  
  return cleanUrl;
};