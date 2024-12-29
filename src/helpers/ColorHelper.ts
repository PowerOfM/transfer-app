export class ColorHelper {
  private static RGB_REGEX = /(\d{3}), (\d{3}), (\d{3})/

  private static getLuminance(color: string) {
    const rgbMatch = color.match(this.RGB_REGEX)
    if (!rgbMatch) {
      return 0.5
    }

    // Calculate the luminance using the formula
    const r = parseInt(rgbMatch[1]) / 255
    const g = parseInt(rgbMatch[2]) / 255
    const b = parseInt(rgbMatch[3]) / 255

    // Apply the luminance formula for RGB (Rec. 709 standard)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  public static getTextColor(backgroundColor: string) {
    const luminance = this.getLuminance(backgroundColor)
    return luminance > 0.5 ? "black" : "white"
  }
}
