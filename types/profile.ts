export default interface Profile {
    userName: string;
    firstName: string;
    birthDate: string;
    city: string;
    state: string;
    bio?: string;
    presignedImageUrls: string[];
}