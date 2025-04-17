// utils/imageHelpers.ts
export const cleanPresignedUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    try {
      // Remove any leading/trailing whitespace
      let cleanedUrl = url.trim();
      
      // Validate URL structure
      if (!cleanedUrl.startsWith('http')) {
        console.warn('Invalid URL format, does not start with http');
        return null;
      }
      
      // Try to create a URL object to validate it
      new URL(cleanedUrl);
      
      return cleanedUrl;
    } catch (error) {
      console.error('Invalid image URL:', error);
      return null;
    }
  };