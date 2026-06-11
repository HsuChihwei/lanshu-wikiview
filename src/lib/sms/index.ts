import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SmsProvider } from "./types";
import { DevMockProvider } from "./dev-mock";
import { AliyunSmsProvider } from "./aliyun";

export function getSmsProvider(): SmsProvider {
  const { env } = getCloudflareContext();
  const e = env as unknown as Record<string, string>;
  if (e.SMS_PROVIDER === "aliyun") {
    return new AliyunSmsProvider({
      accessKeyId: e.ALIYUN_ACCESS_KEY_ID ?? "",
      accessKeySecret: e.ALIYUN_ACCESS_KEY_SECRET ?? "",
      signName: e.ALIYUN_SMS_SIGN_NAME ?? "",
      templateCode: e.ALIYUN_SMS_TEMPLATE_CODE ?? "",
    });
  }
  return new DevMockProvider();
}
