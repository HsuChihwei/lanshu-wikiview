import type { SmsProvider } from "./types";
import { DevMockProvider } from "./dev-mock";
import { AliyunSmsProvider } from "./aliyun";

export function getSmsProvider(): SmsProvider {
  if (process.env.SMS_PROVIDER === "aliyun") {
    return new AliyunSmsProvider({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID ?? "",
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET ?? "",
      signName: process.env.ALIYUN_SMS_SIGN_NAME ?? "",
      templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE ?? "",
    });
  }
  return new DevMockProvider();
}
