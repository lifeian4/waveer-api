import { createClient } from '@supabase/supabase-js';
import { UserInfo } from '../types/index';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const verifyUserToken = async (token: string): Promise<UserInfo | null> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata,
      created_at: user.created_at,
    };
  } catch (error) {
    console.error('Error verifying user token:', error);
    return null;
  }
};

export const getUserById = async (userId: string): Promise<UserInfo | null> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.admin.getUserById(userId);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata,
      created_at: user.created_at,
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

export const getSupabaseClient = () => supabase;
