import DecodedTokenInfo from "@/types/decodedTokenInfo"
import MessageType from "@/types/MessageType";

export const GetMessages = async (userInfo: DecodedTokenInfo, matchId: string, authToken: string): Promise<{ messages: MessageType[] } | undefined> => {
    console.log(`[GetMessages] Starting request for matchId: ${matchId}`);
    
    try {
        if (!authToken || !userInfo?.apiKey) {
            console.error('[GetMessages] Missing credentials:', {
                tokenAvailable: !!authToken,
                apiKeyAvailable: !!userInfo?.apiKey
            });
            throw new Error('No token or API key available');
        }

        const requestUrl = `${process.env.EXPO_PUBLIC_ENSOULEE_API_URL}messages/${matchId}`;
        console.log(`[GetMessages] Making request to: ${requestUrl}`);
        
        // Log request headers (partially redacted for security)
        console.log('[GetMessages] Request headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken.substring(0, 5)}...`,
            'x-api-key': `${userInfo.apiKey.substring(0, 5)}...`
        });

        const response = await fetch(
            requestUrl,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'x-api-key': userInfo.apiKey,
                }
            }
        );

        // Log response status
        console.log(`[GetMessages] Response status: ${response.status} ${response.statusText || ''}`);
        
        if (!response.ok) {
            // Try to get more error details
            let errorDetails = '';
            try {
                errorDetails = await response.text();
                console.error(`[GetMessages] Error response body: ${errorDetails}`);
            } catch (e) {
                console.error('[GetMessages] Could not read error response body');
            }
            
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorDetails || 'unknown'}`);
        }

        const data = await response.json();
        console.log(`[GetMessages] Successfully fetched ${data.messages?.length || 0} messages`);
        
        // Log a sample of the first message if available (without sensitive content)
        if (data.messages && data.messages.length > 0) {
            const sampleMessage = { ...data.messages[0] };
            if (sampleMessage.content) {
                sampleMessage.content = sampleMessage.content.substring(0, 20) + '...';
            }
            console.log('[GetMessages] Sample message structure:', sampleMessage);
        }

        return data;

    } catch (error: unknown) {
        // Enhanced error logging
        console.error("[GetMessages] Error occurred:");
        
        if (error instanceof Error) {
            console.error("[GetMessages] Error details:", {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        } else {
            console.error("[GetMessages] Non-Error object thrown:", error);
        }
        
        // Check for potential issues with environment variables
        if (!process.env.EXPO_PUBLIC_ENSOULEE_API_URL) {
            console.error('[GetMessages] EXPO_PUBLIC_BACKEND_URL environment variable is missing or empty.');
        }
        
        return undefined;
    }
}