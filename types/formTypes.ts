export type LocationsData = {
    [state: string]: string[];
  };
  
  export type Occupation = string;
  
  export type OccupationsData = {
    occupations: Occupation[];
  };
  
  export interface GenderSelection {
    id: string;
    label: string;
    value: string;
  }
  
  export interface UserProfileFormData {
    sex?: string;
    matchSex?: string;
    birthDate?: string;
    state?: string;
    city?: string;
    occupation?: string;
    bio?: string;
    profileImage?: string;
  }
  
  export interface OnboardingStepProps {
    onNext: () => void;
    onBack?: () => void;
    formData: UserProfileFormData;
    updateFormData: (data: Partial<UserProfileFormData>) => void;
  }