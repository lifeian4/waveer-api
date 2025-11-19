import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OAuthApp, AuthorizationCode } from '../types/index';

const DB_DIR = path.join(process.cwd(), 'data');
const APPS_FILE = path.join(DB_DIR, 'apps.json');
const CODES_FILE = path.join(DB_DIR, 'codes.json');

// Ensure data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
};

// Initialize files if they don't exist
const initializeFiles = () => {
  ensureDataDir();

  if (!fs.existsSync(APPS_FILE)) {
    fs.writeFileSync(APPS_FILE, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(CODES_FILE)) {
    fs.writeFileSync(CODES_FILE, JSON.stringify([], null, 2));
  }
};

// Read all apps
export const getAllApps = (): OAuthApp[] => {
  initializeFiles();
  try {
    const data = fs.readFileSync(APPS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Find app by client_id
export const getAppByClientId = (clientId: string): OAuthApp | null => {
  const apps = getAllApps();
  return apps.find((app) => app.client_id === clientId) || null;
};

// Create new app
export const createApp = (
  appName: string,
  redirectUris: string[]
): OAuthApp => {
  const app: OAuthApp = {
    id: uuidv4(),
    client_id: generateClientId(),
    client_secret: generateClientSecret(),
    app_name: appName,
    redirect_uris: redirectUris,
    created_at: new Date().toISOString(),
  };

  const apps = getAllApps();
  apps.push(app);

  initializeFiles();
  fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2));

  return app;
};

// Verify app credentials
export const verifyAppCredentials = (
  clientId: string,
  clientSecret: string
): OAuthApp | null => {
  const app = getAppByClientId(clientId);
  if (!app) return null;

  if (app.client_secret === clientSecret) {
    return app;
  }

  return null;
};

// Store authorization code
export const storeAuthorizationCode = (
  code: string,
  clientId: string,
  userId: string,
  redirectUri: string,
  expiresIn: number = 600 // 10 minutes
): void => {
  const authCode: AuthorizationCode = {
    code,
    client_id: clientId,
    user_id: userId,
    redirect_uri: redirectUri,
    expires_at: Date.now() + expiresIn * 1000,
    created_at: new Date().toISOString(),
  };

  const codes = getAllAuthorizationCodes();
  codes.push(authCode);

  initializeFiles();
  fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
};

// Get and validate authorization code
export const getAndValidateAuthorizationCode = (
  code: string,
  clientId: string,
  redirectUri: string
): AuthorizationCode | null => {
  const codes = getAllAuthorizationCodes();
  const authCode = codes.find(
    (c) =>
      c.code === code &&
      c.client_id === clientId &&
      c.redirect_uri === redirectUri
  );

  if (!authCode) return null;

  // Check if code has expired
  if (authCode.expires_at < Date.now()) {
    return null;
  }

  // Remove used code
  const updatedCodes = codes.filter((c) => c.code !== code);
  initializeFiles();
  fs.writeFileSync(CODES_FILE, JSON.stringify(updatedCodes, null, 2));

  return authCode;
};

// Get all authorization codes
const getAllAuthorizationCodes = (): AuthorizationCode[] => {
  initializeFiles();
  try {
    const data = fs.readFileSync(CODES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Helper functions to generate secure credentials
const generateClientId = (): string => {
  return `client_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
};

const generateClientSecret = (): string => {
  return `secret_${uuidv4().replace(/-/g, '')}`;
};

// Clean up expired authorization codes
export const cleanupExpiredCodes = (): void => {
  const codes = getAllAuthorizationCodes();
  const validCodes = codes.filter((c) => c.expires_at >= Date.now());

  if (validCodes.length !== codes.length) {
    initializeFiles();
    fs.writeFileSync(CODES_FILE, JSON.stringify(validCodes, null, 2));
  }
};
