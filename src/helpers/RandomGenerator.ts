import seedRandom from "seedrandom"
import { animals, uniqueNamesGenerator } from "unique-names-generator"
import emojisList from "../assets/emojis.min.json"
import webColors from "../assets/webColors.json"

export class RandomGenerator {
  public static name = () =>
    uniqueNamesGenerator({
      dictionaries: [webColors, animals],
      style: "capital",
      separator: "-",
    })

  public static color = () =>
    webColors[Math.floor(Math.random() * webColors.length)]

  public static emoji = () =>
    emojisList.emojis[Math.floor(Math.random() * emojisList.emojis.length)]

  public static emojiList = () =>
    this.shuffleArray(emojisList.emojis).slice(0, 30)

  private static shuffleArray<T>(array: T[]): T[] {
    const rng = seedRandom(this.buildLocalTimeSeed())
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  private static buildLocalTimeSeed() {
    const date = new Date()
    return (
      "" +
      date.getFullYear() +
      date.getMonth() +
      date.getDate() +
      date.getHours() +
      Math.floor(date.getMinutes() / 5) +
      date.getTimezoneOffset()
    )
  }
}
