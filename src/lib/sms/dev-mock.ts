import type { SmsProvider, SmsResult } from "./types";

export class DevMockProvider implements SmsProvider {
  async sendCode(phone: string, code: string): Promise<SmsResult> {
    console.log(`[DevMockSMS] Sending code ${code} to ${phone}`);
    return { success: true };
  }
}
