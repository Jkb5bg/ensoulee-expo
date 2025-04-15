// utils/styles.js (or wherever your sharedStyles is located)
import { StyleSheet } from 'react-native';

const sharedStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#181818',
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 30,
        paddingBottom: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
        paddingTop: 20, // Add padding at top of the content
        alignItems: 'center',
    },
    questionContainer: {
        width: '100%',
        marginBottom: 25, // Increased spacing between questions
    },
    questionText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 15,
    },
    answerButton: {
        backgroundColor: '#2C2C2C',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    selectedAnswer: {
        backgroundColor: '#FF7B6F',
    },
    answerText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
        paddingHorizontal: 30,
    },
    navigationButton: {
        backgroundColor: '#FF7B6F',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    navigationButtonDisabled: {
        backgroundColor: '#FFFFFF1A',
    },
    navigationButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    pageIndicator: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: '#F44D7B',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
        marginTop: 20,
        marginHorizontal: 30,
        marginBottom: 25,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    saveButton: {
        padding: 12,
        backgroundColor: '#4a90e2',
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 30,
        marginVertical: 15,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#181818',
        padding: 20,
    },
    errorText: {
        color: '#FF7B6F',
        fontSize: 18,
        textAlign: 'center',
    },
});

export default sharedStyles;