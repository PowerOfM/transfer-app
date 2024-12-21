import { Logger } from "./Logger";

export class DiscoverIPHelper {
  private static readonly logger = new Logger("DiscoverIPHelper");

  public static async getIp(): Promise<string> {
    try {
      const result = await fetch("https://api64.ipify.org?format=json");
      const data = await result.json();
      this.logger.debug("Found IP", data);
      return data.ip;
    } catch (error) {
      this.logger.error("Error fetching IP", error);
      throw error;
    }
  }
}
