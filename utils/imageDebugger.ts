// utils/imageDebugger.ts
export const debugImageLoading = async (url: string): Promise<boolean> => {
    try {
      console.log(`Testing image URL: ${url}`);
      const response = await fetch(url, { method: 'HEAD' });
      console.log(`Image response status: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error(`Error testing image URL: ${error}`);
      return false;
    }
  };