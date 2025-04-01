import User from '@/types/user';
import DecodedTokenInfo from '@/types/decodedTokenInfo';

export const GetUserSelfAPI = async (userInfo: DecodedTokenInfo, authToken: string): Promise<User | undefined> => {
    console.log('========== GetUserSelfAPI Debug ==========');
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    console.log('API_URL:', API_URL);
    
    // Debug userInfo object
    console.log('userInfo:', {
        hasUserName: !!userInfo.userName,
        userName: userInfo.userName,
        hasApiKey: !!userInfo.apiKey,
        apiKeyLength: userInfo.apiKey ? userInfo.apiKey.length : 0,
        hasEmail: !!userInfo.email,
        hasGivenName: !!userInfo.givenName
    });
    
    // Debug auth token - only show first and last few characters for security
    console.log('authToken:', {
        length: authToken.length,
        start: authToken.substring(0, 10) + '...',
        end: '...' + authToken.substring(authToken.length - 10),
        tokenType: authToken.includes('eyJraWQiOiJ') ? 'Looks like JWT' : 'Might not be JWT format'
    });
    
    // API Call to get the User info from the backend.
    try {
        console.log('Making API request to:', API_URL + "user/self");
        console.log('Request headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken.substring(0, 10)}...`,
            'x-api-key': userInfo.apiKey ? `${userInfo.apiKey.substring(0, 5)}...` : 'MISSING'
        });
        
        const startTime = Date.now();
        const response = await fetch(API_URL + "user/self", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': userInfo.apiKey
            },
        });
        const requestTime = Date.now() - startTime;
        console.log('Response received in', requestTime, 'ms');
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText} - ${errorText}`);
        }

        console.log('Parsing JSON response...');
        const data = await response.json();
        console.log('Response data keys:', Object.keys(data));
        console.log('data.userName:', data.userName);
        console.log('data.imageFilenames:', data.imageFilenames ? `Array(${data.imageFilenames.length})` : 'undefined');

        const user: User = {
            userName: data.userName,
            tier: data.tier,
            imageFilenames: data.imageFilenames || [],
            occupation: data.occupation,
            state: data.state,
            city: data.city,
            bio: data.bio,
            matchSex: data.matchSex,
            apiKey: data.apiKey,
            birthDate: data.birthDate,
            createdAt: data.createdAt,
            email: data.email,
            firstName: data.firstName,
            privateProfile: data.privateProfile,
            sex: data.sex,
            firstLogin: data.firstLogin
        };
        
        console.log('User object created with keys:', Object.keys(user));
        console.log('============= End Debug ==============');
        return user;
    } catch (error) {
        console.error('Error fetching user data:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        console.log('============= End Debug ==============');
        return undefined;
    }
};