import { RandomGenerator } from "./RandomGenerator";

export class Logger {
  private readonly color = RandomGenerator.color();
  private readonly prefix = [`%c[${this.name}]`, `color: ${this.color}`];

  constructor(private readonly name: string) {}

  public log(...args: unknown[]) {
    console.log(...this.prefix, ...args);
  }

  public error(...args: unknown[]) {
    console.error(...this.prefix, ...args);
  }

  public warn(...args: unknown[]) {
    console.warn(...this.prefix, ...args);
  }

  public debug(...args: unknown[]) {
    console.debug(...this.prefix, ...args);
  }
}
