// api/GetUserProfileImages.ts
import DecodedTokenInfo from "@/types/decodedTokenInfo";
import User from "@/types/user";

export const GetUserProfileImages = async (
  tokenInfo: DecodedTokenInfo,
  authToken: string,
  userData?: User | null
): Promise<string[] | null> => {
  // Base URLs from environment
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL || "";
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || API_URL;
  if (!BACKEND_URL) {
    console.error("GetUserProfileImages: no BACKEND_URL configured");
    return null;
  }

  // Determine whose profile we’re fetching
  const profileUser = userData?.userName;
  const apiKey = tokenInfo.apiKey;
  const filenames = userData?.imageFilenames;

  if (!profileUser || !authToken || !Array.isArray(filenames) || filenames.length === 0) {
    console.warn("GetUserProfileImages: missing data", {
      profileUser,
      hasAuthToken: !!authToken,
      filenames,
    });
    return null;
  }

  // Normalize base URL (strip trailing slash, ensure /dev)
  let base = BACKEND_URL.replace(/\/+$/, "");
  if (!base.includes("/dev")) {
    base = `${base}/dev`;
  }

  // We'll always call "/dev/api/images/{profileUser}/{filename}"
  const endpointPrefix = `${base}/api/images/${encodeURIComponent(profileUser)}`;

  // Fetch a presigned URL for each filename
  const results = await Promise.all(
    filenames.map(async (filename) => {
      const encodedFilename = encodeURIComponent(filename);
      const url = `${endpointPrefix}/${encodedFilename}`;

      try {
        const resp = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
            "x-api-key": apiKey || "",
          },
        });

        if (!resp.ok) {
          console.error(`GetUserProfileImages: ${filename} → ${resp.status}`);
          // fallback direct S3 URL if it's a known image extension
          if (/\.(jpe?g|png)$/i.test(filename)) {
            return `https://ensoulee-user-images.s3.amazonaws.com/${profileUser}/${filename}`;
          }
          return null;
        }

        // Return the full presigned URL, including its query string
        const presigned = await resp.text();
        return presigned;
      } catch (err) {
        console.error(`GetUserProfileImages: error fetching ${filename}`, err);
        // fallback direct S3 URL if possible
        if (/\.(jpe?g|png)$/i.test(filename)) {
          return `https://ensoulee-user-images.s3.amazonaws.com/${profileUser}/${filename}`;
        }
        return null;
      }
    })
  );

  // Filter out any nulls and return
  const validUrls = results.filter((url): url is string => !!url);
  return validUrls.length > 0 ? validUrls : null;
};
