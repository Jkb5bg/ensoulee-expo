import { Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { GetUserSelfAPI } from '@/api/GetUserSelfAPI';
import { useAuth } from '@/components/AuthContext';

export default function Matches() {
    const { authTokens, userInfo, logout } = useAuth();
    const [apiResult, setApiResult] = useState(null);

    const handlePress = async () => {
        console.log("Triggered");
        if (userInfo && authTokens?.idToken) {
            try {
                const result = await GetUserSelfAPI(userInfo, authTokens.idToken);
                console.log("API Result:", result);
                setApiResult(result);
            } catch (error) {
                console.error("Error calling API:", error);
            }
        } else {
            console.log("Missing userInfo or token", { userInfo, token: authTokens?.idToken });
        }
    };

    return (
        <>
            <Text>
                Welcome to the Matches Screen!
            </Text>
            <TouchableOpacity onPress={handlePress}>
                <Text>                
                    Press here to trigger
                </Text>
            </TouchableOpacity>
            
            {apiResult && (
                <Text>
                    API Result: {JSON.stringify(apiResult, null, 2)}
                </Text>
            )}
        </>
    );
}