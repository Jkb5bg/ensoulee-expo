export default interface DecodedTokenInfo {
    email?: string;
    apiKey: string;
    givenName: string;
    gender?: string;
    birthdate?: string;
    cognito_username?: string;
    exp?: number;
    userName?: string;
}