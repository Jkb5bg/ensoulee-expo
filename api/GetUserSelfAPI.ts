import User from '@/types/user';
import DecodedTokenInfo from '@/types/decodedTokenInfo';

export const GetUserSelfAPI = async (userInfo: DecodedTokenInfo, authToken: string): Promise<User | undefined> => {

    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;

    // API Call to get the User info from the backend.
    try {
        const response = await fetch(API_URL + "user/self", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': userInfo.apiKey
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        const user: User = {
            userName: data.userName,
            tier: data.tier,
            imageFilenames: data.imageFilenames,
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
        }

        return user;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return undefined;
    }

};