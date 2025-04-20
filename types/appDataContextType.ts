export default interface AppDataContextType {
    matches: any[];
    potentialMatches: any[];
    userProfileImage: string | null;
    profileImagesCache: Record<string, string>;  // Add cache
    loadProfileImage: (userId: string, imageFilename?: string) => Promise<string | null>;  // Add function
    refreshMatches: () => Promise<void>;
    refreshPotentialMatches: () => Promise<void>;
    refreshAllData: () => Promise<void>;
    isLoading: boolean;
}