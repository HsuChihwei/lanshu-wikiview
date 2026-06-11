export interface User {
  id: string;
  phone: string;
  nickname: string | null;
  created_at: string;
  updated_at: string;
}

export interface Token {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export interface VerificationCode {
  id: string;
  phone: string;
  code: string;
  ip: string;
  attempts: number;
  created_at: string;
  expires_at: string;
}
