import {
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated
} from 'react-native';
import { useState } from "react";
import { LinearGradient } from 'expo-linear-gradient';
import Swiper from 'react-native-swiper';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

export default function OnboardingScreen() {

    const [index, setIndex] = useState<number>(0);


    useEffect(() => {
        async function prepare() {
            try {
                // Wait for a second before proceeding
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Hide the splash screen
                await SplashScreen.hideAsync();
                
            } catch (error) {
                console.error("Error preparing app:", error);
            }
        }
        
        prepare();
    }, []);

    

    const data = [
        {
            title: 'Simple & Safe',
            subTitle: '3 Steps To A Meaningful Connection',
            img: require('../../assets/images/onbond1.png'),
        },
        {
            title: 'AI Matching',
            subTitle: 'Let Our AI Put In The Path Of Your Soulmate',
            img: require('../../assets/images/onbond2.png'),
        },
        {
            title: 'Friction Removed',
            subTitle: 'We Help You Get Out of Your Own Way',
            img: require('../../assets/images/onbond3.png'),
        },
        {
            title: 'Deeper Connections',
            subTitle: 'Bridging The Gap To Lasting Love',
            img: require('../../assets/images/onbond4.png'),
        },
    ];

    const skipOnboarding = () => {
        router.replace("/(onboarding)/register")

    }

    const handleIndexChange = (newIndex: number) => {
        setIndex(newIndex+1);
        if (index === 2) {
            // If it's the last slide, navigate to Register after a short delay
            setTimeout(() => {
                router.replace('/(onboarding)/register');
            }, 1500); // Adjust the delay as needed
        } 
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.skipButton}
                onPress={() => skipOnboarding()}>
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <Swiper
                style={styles.wrapper}
                showsButtons={false}
                loop={false}
                onIndexChanged={() => handleIndexChange(index)}
                dotStyle={styles.dot}
                activeDotStyle={styles.activeDot}>
                {data.map((item, index) => (
                    <View style={styles.slide} key={index}>
                        <ImageBackground source={item.img} style={styles.image}>
                            <LinearGradient
                                colors={[
                                    'rgba(20, 20, 20, 0.9)',
                                    'rgba(20, 20, 20, 0.07)',
                                    'rgba(20, 20, 20, 0.97)',
                                ]}
                                locations={[0.1, 0.4, 0.75]}
                                style={styles.overlay}>
                                <Text style={styles.text}>{item.title}</Text>
                                <Text style={styles.subTitle}>{item.subTitle}</Text>
                            </LinearGradient>
                        </ImageBackground>
                    </View>
                ))}
            </Swiper>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    wrapper: {},
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        height: '100%',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 10,
        paddingHorizontal: 25,
        // fontFamily: '"SFProDisplay-Regular", "Roboto", "Helvetica", sans-serif',
    },
    subTitle: {
        color: '#FFFFFF',
        // fontFamily: '"SFProDisplay-Regular", "Roboto", "Helvetica", sans-serif',
        fontSize: 15,
        textAlign: 'left',
        paddingHorizontal: 25,
        paddingBottom: 150,
    },
    dot: {
        backgroundColor: '#FFFFFF1A',
        width: 12,
        height: 12,
        borderRadius: 50,
        marginHorizontal: 8,
    },
    activeDot: {
        backgroundColor: '#FF7B6F',
        width: 12,
        height: 12,
        borderRadius: 50,
        marginHorizontal: 8,
    },
    skipButton: {
        position: 'absolute',
        top: 80,
        right: 20,
        zIndex: 1000,
    },
    skipText: {
        color: '#F44D7B',
        fontSize: 17,
        fontWeight: '400',
        // fontFamily: '"SFProDisplay-Regular", "Roboto", "Helvetica", sans-serif',
        textDecorationLine: 'none',
    },
});