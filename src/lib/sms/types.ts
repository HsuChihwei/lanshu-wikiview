export interface SmsResult {
  success: boolean;
  error?: string;
}

export interface SmsProvider {
  sendCode(phone: string, code: string): Promise<SmsResult>;
}
