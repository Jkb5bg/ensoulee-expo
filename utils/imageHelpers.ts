export const cleanPresignedUrl = (url: string | null): string | null => {
  if (!url) return null;
  
  try {
    // Remove any leading/trailing whitespace
    let cleanedUrl = url.trim();
    
    // Check if the URL contains the API endpoint incorrectly concatenated with the S3 URL
    // This fixes URLs like: https://backend.ensoulee.com/dev/api/images/USER/https://ensoulee-user-images.s3...
    const s3UrlIndex = cleanedUrl.indexOf('https://ensoulee-user-images.s3');
    if (s3UrlIndex > 0) {
      // Extract only the S3 URL part
      cleanedUrl = cleanedUrl.substring(s3UrlIndex);
      console.log('Fixed concatenated URL, extracted S3 URL part:', cleanedUrl);
    }
    
    // Also check for AWS API Gateway URLs that may be incorrectly concatenated
    const awsGatewayUrlIndex = cleanedUrl.indexOf('https://execute-api');
    if (awsGatewayUrlIndex > 0 && cleanedUrl.substring(0, awsGatewayUrlIndex).includes('api/images')) {
      cleanedUrl = cleanedUrl.substring(awsGatewayUrlIndex);
      console.log('Fixed AWS Gateway URL concatenation:', cleanedUrl);
    }
    
    // Sometimes the API returns a JSON object with url property instead of direct URL
    if (cleanedUrl.startsWith('{') && cleanedUrl.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanedUrl);
        if (parsed.url && typeof parsed.url === 'string') {
          console.log('Extracted URL from JSON response');
          cleanedUrl = parsed.url;
        }
      } catch (parseError) {
        console.log('Failed to parse JSON response:', parseError);
      }
    }
    
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