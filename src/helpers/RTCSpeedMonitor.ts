import { Signal } from "./Signal"

export class RTCSpeedMonitor {
  private prevTimestamp: number = 0
  private interval: NodeJS.Timeout | null = null

  constructor(
    private readonly connection: RTCPeerConnection,
    private readonly targetSize: number,
    private readonly signal: Signal<number>
  ) {}

  public start() {
    this.interval = setInterval(() => {
      void this.getStats()
    }, 500)
  }

  public stop() {
    if (!this.interval) return
    clearInterval(this.interval)
    this.interval = null
  }

  public async getStats() {
    const stats = await this.connection.getStats()

    let activeCandidatePair: RTCTransportStats | undefined
    stats.forEach((report) => {
      console.log("REPORT", report)
      if (report.type === "transport") {
        activeCandidatePair = stats.get(report.selectedCandidatePairId)
      }
    })

    if (!activeCandidatePair) return
    if (this.prevTimestamp === activeCandidatePair.timestamp) {
      return
    }

    // calculate current progress
    const bytesNow = activeCandidatePair.bytesReceived ?? 0
    const progress = Math.round((bytesNow / this.targetSize) * 100)
    this.signal.emit(progress)
  }
}
