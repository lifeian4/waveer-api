export interface OAuthApp {
  id: string;
  client_id: string;
  client_secret: string;
  app_name: string;
  redirect_uris: string[];
  created_at: string;
}

export interface AuthorizationCode {
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  expires_at: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserInfo {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  created_at: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  client_id: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: string;
  iat: number;
  exp: number;
}

export interface RegisterAppRequest {
  app_name: string;
  redirect_uris: string[];
}

export interface RegisterAppResponse {
  client_id: string;
  client_secret: string;
  app_name: string;
}

export interface AuthorizeRequest {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  state?: string;
}

export interface TokenRequest {
  grant_type: string;
  code: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export interface ErrorResponse {
  error: string;
  error_description?: string;
}
