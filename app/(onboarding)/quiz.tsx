import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import sharedStyles from '@/utils/styles';
import { useAuth } from '@/components/AuthContext';
import { router } from 'expo-router';
import { useLoading } from '@/components/LoadingContext';
import { QuizDataType } from '@/types/quizDataType';
import SelectedAnswersType from '@/types/selectedAnswersType';
import { GetQuizAnswers } from '@/api/GetQuizAnswers';
import { PostQuizAnswers } from '@/api/PostQuizAnswers';
import { Alert } from 'react-native';

export default function QuizScreen() {
    const [quizData, setQuizData] = useState<QuizDataType>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswersType>({});
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { userInfo, authTokens } = useAuth();
    const { showLoading, hideLoading } = useLoading();
    const hasLoadedData = useRef(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const questionsPerPage = 10;

    useEffect(() => {
        if (hasLoadedData.current) return;
        
        const loadQuizData = async () => {
            try {
                showLoading("Loading quiz data...");
                const data: QuizDataType = require('@/utils/Quiz.json');
                setQuizData(data);

                // Fetch existing answers if the user has already taken the quiz
                if (userInfo && authTokens?.idToken) {
                    const existingAnswers = await GetQuizAnswers(userInfo, authTokens.idToken);
                    if (existingAnswers) {
                        const formattedAnswers = Object.entries(existingAnswers).reduce((acc, [key, value]) => {
                            if (typeof value === 'string' && typeof key === 'string') {
                                const questionNumber = key.padStart(2, '0');
                                const answer = value.charAt(2); // Assuming the answer is the third character
                                acc[questionNumber] = answer;
                            }
                            return acc;
                        }, {} as SelectedAnswersType);
                        
                        setSelectedAnswers(formattedAnswers);
                    }
                }
                hasLoadedData.current = true;
            } catch (error) {
                console.error('Error loading quiz data:', error);
                setError('Failed to load quiz data. Please try again.');
                hasLoadedData.current = false; // Allow retrying if there was an error
            } finally {
                hideLoading();
            }
        };

        if (userInfo && authTokens?.idToken) {
            loadQuizData();
        }
    }, [userInfo, authTokens]);

    const handleAnswerSelect = (questionNumber: string, answerKey: string) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionNumber]: answerKey
        }));
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting) return; // Prevent duplicate submissions
        
        if (!authTokens?.idToken || !userInfo?.apiKey) {
            console.error('No auth tokens or API key available');
            return;
        }

        const answerHashes = Object.entries(selectedAnswers).map(([questionNumber, answerKey]) => {
            const paddedQuestionNumber = questionNumber.padStart(2, '0');
            return `${paddedQuestionNumber}${answerKey.toUpperCase().padEnd(2, 'A')}`;
        });

        console.log("Submitting answers: ", answerHashes);
        setIsSubmitting(true);
        
        try {
            showLoading("Submitting answers...");
            const response = await PostQuizAnswers(userInfo, authTokens.idToken, answerHashes);
            console.log('Answers submitted successfully:', response);
            
            // Show success message
            alert('Quiz answers submitted successfully');
            
            // Navigate to next screen
            router.push('/(onboarding)/success');
        } catch (error) {
            console.error('Error submitting answers:', error);
            setError('Failed to submit answers. Please try again.');
        } finally {
            hideLoading();
            setIsSubmitting(false);
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
                const paddedQuestionNumber = questionNumber.padStart(2, '0');
                return `${paddedQuestionNumber}${answerKey.toUpperCase().padEnd(2, 'A')}`;
            });
            
            if (authTokens?.idToken && userInfo?.apiKey) {
                const response = await PostQuizAnswers(userInfo, authTokens.idToken, answerHashes);
                
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

    const renderQuestion = (question: QuizDataType[0], index: number) => {
        const questionNumber = question.questionNumber || `${index + 1}`;
        const paddedQuestionNumber = questionNumber.toString().padStart(2, '0');

        return (
            <View key={paddedQuestionNumber} style={sharedStyles.questionContainer}>
                <Text style={sharedStyles.questionText}>{questionNumber}. {question.question}</Text>
                {Object.entries(question)
                    .filter(([key, value]) => key.startsWith('Answer') && value)
                    .map(([key, value]) => {
                        const answerLetter = key.slice(-1); // Extract the last character to get 1, 2, 3, or 4
                        const isSelected = selectedAnswers[paddedQuestionNumber] === answerLetter;

                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    sharedStyles.answerButton,
                                    isSelected && sharedStyles.selectedAnswer
                                ]}
                                onPress={() => handleAnswerSelect(paddedQuestionNumber, answerLetter)}
                            >
                                <Text style={sharedStyles.answerText}>{String(value)}</Text>
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

    if (quizData.length === 0) {
        return (
            <View style={sharedStyles.errorContainer}>
                <Text style={sharedStyles.errorText}>No quiz data available.</Text>
                <TouchableOpacity 
                    style={sharedStyles.navigationButton} 
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text style={sharedStyles.navigationButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Calculate these values directly without useMemo
    const currentQuestions = quizData.slice(
        currentPage * questionsPerPage,
        (currentPage + 1) * questionsPerPage
    );

    const totalPages = Math.ceil(quizData.length / questionsPerPage);

    return (
        <View style={sharedStyles.container}>
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={sharedStyles.scrollViewContent}
                style={sharedStyles.scrollView}
            >
                {currentQuestions.map((question, index) => renderQuestion(question, currentPage * questionsPerPage + index))}
            </ScrollView>

            {Object.keys(selectedAnswers).length > 0 && (
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