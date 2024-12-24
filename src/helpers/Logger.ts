const LOG_COLORS = [
  "#DFFF00",
  "#40E0D0",
  "#FFBF00",
  "#6495ED",
  "#FF7F50",
  "#DE3163",
  "#9FE2BF",
  "#CCCCFF",
  "#EA580C",
]

export class Logger {
  private static colorIndex = 0
  private readonly color = Logger.getNextColor()
  private readonly prefix = [`%c[${this.name}]`, `color: ${this.color}`]

  constructor(private readonly name: string) {}

  public log(...args: unknown[]) {
    console.log(...this.prefix, ...args)
  }

  public error(...args: unknown[]) {
    console.error(...this.prefix, ...args)
  }

  public warn(...args: unknown[]) {
    console.warn(...this.prefix, ...args)
  }

  public debug(...args: unknown[]) {
    console.debug(...this.prefix, ...args)
  }

  private static getNextColor() {
    const color = LOG_COLORS[Logger.colorIndex]
    Logger.colorIndex = (Logger.colorIndex + 1) % LOG_COLORS.length
    return color
  }
}
