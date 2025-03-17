import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert, ActivityIndicator,
} from 'react-native';
import {Ionicons} from "@expo/vector-icons";
import { useAuth } from "@/components/AuthContext";


export default function RegisterScreen() {

    const { authTokens, login, logout, isAuthenticated } = useAuth();

    const handleLogin = async () => {

        try {
            await login();
            if (authTokens != null) {
                console.log("Access token:", authTokens.accessToken);
            }
        } catch (error) {
            console.error("Login error:", error);
            Alert.alert("Login Error", "There was a problem during login. Please try again.");
        }
    }

    const handleGoogleLogin = () => {
        // TODO: Implement Google Login
    }

    return (
        <>
            <SafeAreaView style={styles.container}>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Sign In</Text>

                    {/* Facebook Login Button */}
                    <TouchableOpacity onPress={handleLogin} style={styles.socialButton}>
                        <View style={styles.facebookButton}>
                            <Ionicons name="logo-facebook" size={24} color="white" />
                            <Text style={styles.socialButtonText}>Continue with Facebook</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Spacing */}
                    <View style={{ height: 16 }} />

                    {/* Google Login Button */}
                    <TouchableOpacity onPress={handleLogin} style={styles.socialButton}>
                        <View style={styles.googleButton}>
                            <Ionicons name="logo-google" size={24} color="#4285F4" />
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.checkboxContainer}>
                        <Text style={styles.checkboxLabel}>
                            I have read and agree to the Terms of Service.
                        </Text>
                    </View>
                </View>

                <View style={styles.footerContainer}>
                    <View style={styles.question}>
                        <Text style={styles.questionText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={handleLogin}>
                            <Text style={styles.registerText}>Register here.</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </>
    );
};


const styles = StyleSheet.create({
    // Keeping your existing styles
    container: {
        backgroundColor: '#181818',
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#181818',
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginTop: 10,
    },
    contentContainer: {
        width: '100%',
        marginTop: 120,
    },
    title: {
        color: '#fff',
        fontSize: 34,
        fontWeight: '600',
        textAlign: 'left',
        paddingVertical: 20,
    },

    // New styles for social buttons
    socialButton: {
        width: '100%',
        borderRadius: 8,
        marginBottom: 4,
    },
    facebookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1877F2',
        padding: 12,
        borderRadius: 8,
        height: 48,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        height: 48,
        borderWidth: 1,
        borderColor: '#dadce0',
    },
    socialButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 12,
    },
    googleButtonText: {
        color: '#757575',
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 12,
    },

    // Keeping your remaining styles
    checkboxContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 18,
    },
    checkboxLabel: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'left',
    },
    question: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    questionText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '400',
    },
    registerText: {
        color: 'red',
        fontWeight: 'bold',
    },
    footerContainer: {
        width: '100%',
    },
});