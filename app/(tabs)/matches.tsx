import { Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { GetUserSelfAPI } from '@/api/GetUserSelfAPI';
import { useAuth } from '@/components/AuthContext';
import User from '@/types/user';
import { GetUserSelfDemographicsAPI } from '@/api/GetUserSelfDemographicsAPI';
import { GetUserMatches } from '@/api/GetUserMatches';

export default function Matches() {
    const { authTokens, userInfo, logout } = useAuth();
    const [apiResult, setApiResult] = useState<User | null | undefined>(null);
    const [apiDemoResult, setApiDemoResult] = useState<String[] | null | undefined>(null);
    const [apiMatchesResult, setApiMatchesResult] = useState<String[] | null | undefined>(null);

    const handlePress = async () => {
        if (userInfo && authTokens?.idToken) {
            try {
                const result = await GetUserSelfAPI(userInfo, authTokens.idToken);
                setApiResult(result);
            } catch (error) {
                console.error("Error calling API:", error);
            }
        } else {
            console.log("Missing userInfo or token", { userInfo, token: authTokens?.idToken });
        }
    };

    const handleDemoPress = async () => {
        if (userInfo && authTokens?.idToken) {
            try {
                const result = await GetUserSelfDemographicsAPI(userInfo, authTokens.idToken);
                setApiDemoResult(result);
            } catch (error) {
                console.error("Error calling Demo API: ", error);
            }
        } else {
            console.log("Missing userInfo or token", { userInfo, token: authTokens?.idToken });
        }
    }

    const handleMatchPress = async () => {
        console.log("Triggered Get User Matches test");
        if (userInfo && authTokens?.idToken) {
            try {
                const result = await GetUserMatches(userInfo, authTokens.idToken);
                setApiMatchesResult(result);
            } catch (error) {
                console.error("Error calling Matches API: ", error);
            }
        } else {
            console.log("Missing userInfo or token", {userInfo, token: authTokens?.idToken });
        }
    }

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
            <Text>
                Here is the second API test!
            </Text>
            <TouchableOpacity onPress={handleDemoPress}>
                <Text>
                    Press here to trigger demographics
                </Text>
            </TouchableOpacity>

            {apiDemoResult && (
                <Text>
                    API Result: {JSON.stringify(apiDemoResult, null, 2)}
                </Text>
            )}
            <Text>
                Here is the Matches API test!
            </Text>
            <TouchableOpacity onPress={handleMatchPress}>
                <Text>
                    Press here to trigger matches
                </Text>
            </TouchableOpacity>

            {apiMatchesResult && (
                <Text>
                    API Result: {JSON.stringify(apiMatchesResult, null, 2)}
                </Text>
            )}
        </>
    );
}