import { Logger } from "./Logger";

export class DiscoverIPHelper {
  private static readonly logger = new Logger("DiscoverIPHelper");
  private static readonly IP_REGEX =
    /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g;

  public static async getIp(): Promise<string> {
    for (const fn of this.strategies) {
      try {
        const result = await fn();
        if (result) return result;
      } catch (error) {
        this.logger.error("Error fetching IP with strategy", fn.name, error);
      }
    }
    throw new Error("Unable to find IP");
  }

  private static ipifyStrategy = async () => {
    const result = await fetch("https://api64.ipify.org?format=json");
    const data = await result.json();
    return data.ip;
  };

  private static cloudflareStrategy = async () => {
    const res = await fetch("https://1.0.0.1/cdn-cgi/trace");
    const text = await res.text();
    const match = text.match(/ip=(.+)/);
    return match ? match[1] : undefined;
  };

  private static awsStrategy = async () => {
    const res = await fetch("https://checkip.amazonaws.com/");
    const text = await res.text();
    const match = text.match(this.IP_REGEX);
    return match ? match[0] : undefined;
  };

  private static strategies = [
    this.cloudflareStrategy,
    this.ipifyStrategy,
    this.awsStrategy,
  ];
}
