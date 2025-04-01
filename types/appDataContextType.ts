export default interface AppDataContextType {
    matches: any[];
    potentialMatches: any[];
    userProfileImage: string | null;
    refreshMatches: () => Promise<void>;
    refreshPotentialMatches: () => Promise<void>;
    refreshAllData: () => Promise<void>;
    isLoading: boolean;
}