import type { SmsProvider, SmsResult } from "./types";

export class AliyunSmsProvider implements SmsProvider {
  private accessKeyId: string;
  private accessKeySecret: string;
  private signName: string;
  private templateCode: string;

  constructor(config: {
    accessKeyId: string;
    accessKeySecret: string;
    signName: string;
    templateCode: string;
  }) {
    this.accessKeyId = config.accessKeyId;
    this.accessKeySecret = config.accessKeySecret;
    this.signName = config.signName;
    this.templateCode = config.templateCode;
  }

  async sendCode(phone: string, code: string): Promise<SmsResult> {
    try {
      const params = new URLSearchParams({
        AccessKeyId: this.accessKeyId,
        Action: "SendSms",
        Format: "JSON",
        PhoneNumbers: phone,
        RegionId: "cn-hangzhou",
        SignName: this.signName,
        SignatureMethod: "HMAC-SHA1",
        SignatureNonce: crypto.randomUUID(),
        SignatureVersion: "1.0",
        TemplateCode: this.templateCode,
        TemplateParam: JSON.stringify({ code }),
        Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
        Version: "2017-05-25",
      });

      const sortedParams = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
      const canonicalized = sortedParams
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      const stringToSign = `POST&${encodeURIComponent("/")}&${encodeURIComponent(canonicalized)}`;

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(this.accessKeySecret + "&"),
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(stringToSign));
      const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

      params.set("Signature", signature);

      const resp = await fetch("https://dysmsapi.aliyuncs.com/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = (await resp.json()) as { Code?: string; Message?: string };
      if (data.Code === "OK") {
        return { success: true };
      }
      return { success: false, error: data.Message || "Unknown SMS error" };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "SMS send failed" };
    }
  }
}
