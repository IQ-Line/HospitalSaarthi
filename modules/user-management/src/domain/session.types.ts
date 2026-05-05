export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSessionData {
  user_id: string;
  token: string;
  expires_at: Date;
  ip_address?: string | null;
  user_agent?: string | null;
}
