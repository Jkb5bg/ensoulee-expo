export default interface UserProfileType {
    userName: string;
    firstName: string;
    birthDate: string;
    city?: string;
    state?: string;
    bio?: string;
    occupation?: string;
    sex: string;
    matchSex: string;
    imageFilenames: string[];
    createdAt: string;
    privateProfile?: boolean;
}