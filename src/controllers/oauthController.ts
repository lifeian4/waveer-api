import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createApp,
  getAppByClientId,
  verifyAppCredentials,
  storeAuthorizationCode,
  getAndValidateAuthorizationCode,
  cleanupExpiredCodes,
} from '../database/apps';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  getTokenExpirySeconds,
} from '../utils/jwt';
import { verifyUserToken, getUserById } from '../utils/supabase';
import {
  RegisterAppRequest,
  RegisterAppResponse,
  AuthorizeRequest,
  TokenRequest,
  TokenResponse,
  UserInfo,
  ErrorResponse,
} from '../types/index';

// POST /oauth/register-app
export const registerApp = async (
  req: Request<{}, {}, RegisterAppRequest>,
  res: Response<RegisterAppResponse | ErrorResponse>
): Promise<void> => {
  try {
    const { app_name, redirect_uris } = req.body;

    if (!app_name || !redirect_uris || redirect_uris.length === 0) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'app_name and redirect_uris are required',
      });
      return;
    }

    const app = createApp(app_name, redirect_uris);

    res.status(201).json({
      client_id: app.client_id,
      client_secret: app.client_secret,
      app_name: app.app_name,
    });
  } catch (error) {
    console.error('Error registering app:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to register app',
    });
  }
};

// GET /oauth/authorize
export const authorize = async (
  req: Request<{}, {}, {}, AuthorizeRequest>,
  res: Response
): Promise<void> => {
  try {
    const { client_id, redirect_uri, response_type, state } = req.query;

    // Validate required parameters
    if (!client_id || !redirect_uri || !response_type) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'client_id, redirect_uri, and response_type are required',
      });
      return;
    }

    if (response_type !== 'code') {
      res.status(400).json({
        error: 'unsupported_response_type',
        error_description: 'Only response_type=code is supported',
      });
      return;
    }

    // Verify app exists
    const app = getAppByClientId(client_id as string);
    if (!app) {
      res.status(400).json({
        error: 'invalid_client',
        error_description: 'Client not found',
      });
      return;
    }

    // Verify redirect_uri is registered
    if (!app.redirect_uris.includes(redirect_uri as string)) {
      res.status(400).json({
        error: 'invalid_redirect_uri',
        error_description: 'Redirect URI not registered',
      });
      return;
    }

    // Get user from Supabase session (in real scenario, this would come from session/cookie)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'unauthorized',
        error_description: 'User must be authenticated',
      });
      return;
    }

    const token = authHeader.substring(7);
    const user = await verifyUserToken(token);

    if (!user) {
      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid or expired user token',
      });
      return;
    }

    // Generate authorization code
    const code = `code_${uuidv4().replace(/-/g, '')}`;
    storeAuthorizationCode(code, client_id as string, user.id, redirect_uri as string);

    // Build redirect URL
    const redirectUrl = new URL(redirect_uri as string);
    redirectUrl.searchParams.append('code', code);
    if (state) {
      redirectUrl.searchParams.append('state', state as string);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Error in authorize:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Authorization failed',
    });
  }
};

// POST /oauth/token
export const token = async (
  req: Request<{}, {}, TokenRequest>,
  res: Response<TokenResponse | ErrorResponse>
): Promise<void> => {
  try {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

    // Validate required parameters
    if (!grant_type || !code || !client_id || !client_secret || !redirect_uri) {
      res.status(400).json({
        error: 'invalid_request',
        error_description:
          'grant_type, code, client_id, client_secret, and redirect_uri are required',
      });
      return;
    }

    if (grant_type !== 'authorization_code') {
      res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only grant_type=authorization_code is supported',
      });
      return;
    }

    // Verify app credentials
    const app = verifyAppCredentials(client_id, client_secret);
    if (!app) {
      res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
      });
      return;
    }

    // Validate authorization code
    const authCode = getAndValidateAuthorizationCode(code, client_id, redirect_uri);
    if (!authCode) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code',
      });
      return;
    }

    // Get user info
    const user = await getUserById(authCode.user_id);
    if (!user) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'User not found',
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, client_id);
    const refreshToken = generateRefreshToken(user.id);
    const expiresIn = getTokenExpirySeconds();

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    });
  } catch (error) {
    console.error('Error in token endpoint:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Token generation failed',
    });
  }
};

// GET /oauth/userinfo
export const userinfo = async (
  req: Request,
  res: Response<UserInfo | ErrorResponse>
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'unauthorized',
        error_description: 'Authorization header required',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid or expired access token',
      });
      return;
    }

    // Get user from Supabase
    const user = await getUserById(payload.sub);
    if (!user) {
      res.status(404).json({
        error: 'not_found',
        error_description: 'User not found',
      });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error in userinfo:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to retrieve user info',
    });
  }
};
