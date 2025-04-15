import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '@/components/AuthContext';
import DemographicsDataType from '@/types/demographicsDataType';
import SelectedAnswersType from '@/types/selectedAnswersType';
import { GetDemographicsAnswers } from '@/api/GetDemographicsAnswers';
import { PostDemoQuizAnswers } from '@/api/PostDemoQuizAnswers';
import { router } from 'expo-router';
import { useLoading } from '@/components/LoadingContext';
import sharedStyles from '@/utils/styles';
import { Alert } from 'react-native';
import OnboardingHeader from '@/components/OnboardingHeader';


export default function DemographicsScreen() {
    const [demographicsData, setDemographicsData] = useState<DemographicsDataType | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswersType>({});
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { userInfo, authTokens } = useAuth();
    const { showLoading, hideLoading } = useLoading();
    const hasLoadedData = useRef(false);

    const questionsPerPage = 4;
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (hasLoadedData.current) return;
        
        const loadData = async () => {
            try {
                showLoading("Loading demographics data...");
                const data: DemographicsDataType = require('@/utils/Demographics.json');
                setDemographicsData(data);
                
                if (userInfo && authTokens?.idToken) {
                    const existingAnswers = await GetDemographicsAnswers(userInfo, authTokens.idToken);
                    const formattedAnswers = Object.entries(existingAnswers).reduce((acc: SelectedAnswersType, [key, value]) => {
                        if (typeof value === 'string' && typeof key === 'string') {
                            const questionNumber = key.padStart(2, '0');
                            const answer = value.charAt(2);
                            acc[questionNumber] = answer;
                        }
                        return acc;
                    }, {} as SelectedAnswersType);
                    
                    setSelectedAnswers(formattedAnswers);
                }
                hasLoadedData.current = true;
            } catch (error) {
                console.error("Error loading demographics data:", error);
                setError("Failed to load demographics data. Please try again.");
                hasLoadedData.current = false; // Allow retrying if there was an error
            } finally {
                hideLoading();
            }
        };
        
        if (userInfo && authTokens?.idToken) {
            loadData();
        }
    }, [userInfo, authTokens]);

    const handleAnswerSelect = (questionNumber: number, answerKey: string) => {
        setSelectedAnswers((prevAnswers) => ({
            ...prevAnswers,
            [questionNumber.toString().padStart(2, '0')]: answerKey,
        }));
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({y: 0, animated: false});
        }
    };

    const handleSave = async () => {
        if (isSaving) return;
        if (Object.keys(selectedAnswers).length === 0) {
            Alert.alert("Nothing to Save", "Please answer at least one question before saving.");
            return;
        }
        
        setIsSaving(true);
        
        try {
            showLoading("Saving your progress...");
            
            // Use the same API endpoint as the submit function but don't navigate after success
            const answerHashes = Object.entries(selectedAnswers).map(([questionNumber, answerKey]) => {
                return `${questionNumber}${answerKey.toUpperCase().padEnd(2, 'A')}`;
            });
            
            if (authTokens?.idToken && userInfo?.apiKey) {
                const response = await PostDemoQuizAnswers(userInfo, authTokens.idToken, answerHashes);
                
                if (response) {
                    Alert.alert(
                        "Progress Saved", 
                        "Your answers have been saved. Would you like to continue or return to home?",
                        [
                            {
                                text: "Continue",
                                style: "cancel"
                            },
                            {
                                text: "Return Home",
                                onPress: () => router.push('/(tabs)')
                            }
                        ]
                    );
                } else {
                    throw new Error("Failed to save answers");
                }
            }
        } catch (error) {
            console.error("Error saving progress:", error);
            Alert.alert(
                "Save Failed", 
                "We couldn't save your progress. Please try again."
            );
        } finally {
            hideLoading();
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting) return; // Prevent duplicate submissions
        
        if (!authTokens?.idToken || !userInfo?.apiKey) {
            console.error("Auth tokens or user info is missing");
            return;
        }

        const answerHashes = Object.entries(selectedAnswers).map(([questionNumber, answerKey]) => {
            return `${questionNumber}${answerKey.toUpperCase().padEnd(2, 'A')}`;
        });

        console.log("Answer hashes to be sent to the API:", answerHashes);
        setIsSubmitting(true);
        
        try {
            showLoading("Submitting answers...");
            const response = await PostDemoQuizAnswers(userInfo, authTokens.idToken, answerHashes);
            console.log("Response from API:", response);

            if (response) {
                router.push('/(tabs)');
            } else {
                setError("Failed to submit answers. Please try again.");
            }
        } catch (error) {
            console.error("Error submitting answers:", error);
            setError("An error occurred. Please try again.");
        } finally {
            hideLoading();
            setIsSubmitting(false);
        }
    };

    // In DemographicsScreen.tsx, update the renderQuestion function:
    const renderQuestion = (question: DemographicsDataType['questions'][0], index?: number) => {
        return (
            <View key={question.id} style={sharedStyles.questionContainer}>
                <Text style={sharedStyles.questionText}>{question.id}. {question.question}</Text>
                {question.options.map((option) => {
                    const isSelected = selectedAnswers[question.id.toString().padStart(2, '0')] === option.key;

                    return (
                        <TouchableOpacity
                            key={option.key}
                            style={[
                                sharedStyles.answerButton,
                                isSelected && sharedStyles.selectedAnswer
                            ]}
                            onPress={() => handleAnswerSelect(question.id, option.key)}
                        >
                            <Text style={sharedStyles.answerText}>{option.value}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    if (error) {
        return (
            <View style={sharedStyles.errorContainer}>
                <Text style={sharedStyles.errorText}>{error}</Text>
                <TouchableOpacity 
                    style={sharedStyles.navigationButton} 
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text style={sharedStyles.navigationButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!demographicsData || demographicsData.questions.length === 0) {
        return (
            <View style={sharedStyles.errorContainer}>
                <Text style={sharedStyles.errorText}>No demographics data available.</Text>
                <TouchableOpacity 
                    style={sharedStyles.navigationButton} 
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text style={sharedStyles.navigationButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentQuestions = demographicsData.questions.slice(
        currentPage * questionsPerPage,
        (currentPage + 1) * questionsPerPage
    );

    const totalPages = Math.ceil(demographicsData.questions.length / questionsPerPage);
    const hasAnswers = Object.keys(selectedAnswers).length > 0;

    return (
        <View style={sharedStyles.container}>
            <OnboardingHeader title="Quiz" />
            
            <View style={sharedStyles.contentContainer}>
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={sharedStyles.scrollViewContent}
                    style={sharedStyles.scrollView}
                >
                    {currentQuestions.map((question, index) => renderQuestion(question, currentPage * questionsPerPage + index))}
                </ScrollView>
                
                {/* Save Button */}
                {hasAnswers && (
                    <TouchableOpacity 
                        style={[
                            sharedStyles.saveButton,
                            isSaving && { opacity: 0.7 }
                        ]} 
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        <Text style={sharedStyles.saveButtonText}>
                            {isSaving ? "Saving..." : "Save & Exit"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            
            <View style={sharedStyles.navigationContainer}>
                <TouchableOpacity
                    style={[
                        sharedStyles.navigationButton,
                        currentPage === 0 && sharedStyles.navigationButtonDisabled,
                    ]}
                    onPress={() => handlePageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                >
                    <Text style={sharedStyles.navigationButtonText}>Previous</Text>
                </TouchableOpacity>
                
                <Text style={sharedStyles.pageIndicator}>
                    {`Page ${currentPage + 1} of ${totalPages}`}
                </Text>
                
                <TouchableOpacity
                    style={[
                        sharedStyles.navigationButton,
                        currentPage === totalPages - 1 && sharedStyles.navigationButtonDisabled,
                    ]}
                    onPress={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                >
                    <Text style={sharedStyles.navigationButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
            
            {currentPage === totalPages - 1 && (
                <TouchableOpacity 
                    style={[
                        sharedStyles.submitButton,
                        isSubmitting && { opacity: 0.7 }
                    ]} 
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={sharedStyles.submitButtonText}>Submit Answers</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}