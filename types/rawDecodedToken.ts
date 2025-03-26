export default interface RawDecodedToken {
  // Common fields
  sub?: string;
  exp?: number;
  iat?: number;
  token_use?: string; // "id" or "access"
  
  // Fields typically in ID tokens
  'custom:apiKey'?: string;
  'custom:userName'?: string;
  'given_name'?: string;
  'family_name'?: string;
  email?: string;
  
  // Fields typically in access tokens
  username?: string;
  'cognito:username'?: string;
  
  // Other possible fields
  gender?: string;
  birthdate?: string;
  iss?: string;
  aud?: string;
  auth_time?: number;
  jti?: string;
}