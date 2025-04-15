import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/components/AuthContext';
import { useLoading } from '@/components/LoadingContext';
import { UserProfileFormData } from '@/types/formTypes';
import OnboardingHeader from '@/components/OnboardingHeader';
import GenderSelector from '@/components/GenderSelector';
import PersonalInfoForm from '@/components/PersonalInfoForm';
import ProfileSetupScreen from '@/components/ProfileSetupScreen';
import { UpdateUserProfile } from '@/api/UpdateUserProfile';

enum OnboardingStep {
  GENDER_SELECTION = 1,
  PERSONAL_INFO = 2,
  PROFILE_SETUP = 3,
  COMPLETED = 4,
}

const ProfileSetupScreenWrapper = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.GENDER_SELECTION);
  const [formData, setFormData] = useState<UserProfileFormData>({
    sex: 'woman',
    matchSex: 'woman',
  });
  
  const router = useRouter();
  const { userInfo, getValidToken } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const updateFormData = (data: Partial<UserProfileFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    setCurrentStep((prev) => {
      const nextStep = prev + 1;
      return nextStep as OnboardingStep;
    });
  };

  const handleBack = () => {
    setCurrentStep((prev) => {
      const prevStep = prev - 1;
      return prevStep as OnboardingStep;
    });
  };

  const handleGenderSelection = async () => {
    try {
      showLoading('Updating preferences...');
      
      const token = await getValidToken();
      if (!token || !userInfo) {
        throw new Error('No valid token or user info found');
      }

      const success = await UpdateUserProfile(userInfo, token, {
        sex: formData.sex,
        matchSex: formData.matchSex,
      });

      if (success) {
        handleNext();
      } else {
        throw new Error('Failed to update gender preferences');
      }
    } catch (error) {
      console.error('Error updating gender preferences:', error);
      alert('Failed to update preferences. Please try again.');
    } finally {
      hideLoading();
    }
  };

  const handleCompletion = () => {
    router.replace('/success');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.GENDER_SELECTION:
        return (
          <GenderSelector
            selectedGender={formData.sex || 'woman'}
            lookingFor={formData.matchSex || 'woman'}
            onGenderChange={(gender: any) => updateFormData({ sex: gender })}
            onLookingForChange={(gender: any) => updateFormData({ matchSex: gender })}
            onNext={handleGenderSelection}
          />
        );
      case OnboardingStep.PERSONAL_INFO:
        return (
          <PersonalInfoForm
            onNext={handleNext}
            matchSex={formData.matchSex || 'woman'}
          />
        );
      case OnboardingStep.PROFILE_SETUP:
        return <ProfileSetupScreen onComplete={handleCompletion} />;
      case OnboardingStep.COMPLETED:
      default:
        return null;
    }
  };

  // Render the step progress indicator without Native Base components.
  const renderStepper = () => {
    return (
      <View style={styles.stepperContainer}>
        {Array.from({ length: 4 }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          
          return (
            <React.Fragment key={`step-${stepNumber}`}>
              {/* Circle indicator */}
              <View
                style={[
                  styles.circle,
                  {
                    borderColor: isActive || isCompleted
                      ? 'rgba(244, 77, 123, 1)'
                      : 'rgba(66, 67, 68, 1)',
                    backgroundColor: isCompleted
                      ? 'rgba(244, 77, 123, 1)'
                      : 'transparent',
                  },
                ]}
              >
                {isActive && <View style={styles.innerCircle} />}
              </View>
              
              {/* Line between circles */}
              {stepNumber < 4 && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: isCompleted
                        ? 'rgba(244, 77, 123, 1)'
                        : 'rgba(66, 67, 68, 1)',
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <OnboardingHeader title="Profile Setup"/>
        
        {renderStepper()}
        
        {renderStepContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 24, 1)',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 24, 1)',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  circle: {
    height: 24,
    width: 24,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(244, 77, 123, 1)',
  },
  line: {
    height: 2,
    width: 54,
    marginHorizontal: 8,
  },
});

export default ProfileSetupScreenWrapper;
