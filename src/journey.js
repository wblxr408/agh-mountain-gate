class PortalJourney {
  constructor(reduced = false) {
    this.reduced = reduced;
    if (reduced) this.phase = "entered";
  }
  reduced;
  phase = "waiting";
  elapsed = 0;
  start() {
    if (this.phase === "waiting") this.phase = this.reduced ? "entered" : "opening";
  }
  advance(ms, hidden = false) {
    if (hidden || this.phase !== "opening" || !Number.isFinite(ms) || ms <= 0) return;
    this.elapsed = Math.min(18e3, this.elapsed + ms);
    if (this.elapsed === 18e3) this.phase = "entered";
  }
  skip() {
    this.elapsed = 18e3;
    this.phase = "entered";
  }
  replay() {
    this.elapsed = 0;
    this.phase = this.reduced ? "entered" : "waiting";
  }
  get progress() {
    return this.elapsed / 18e3;
  }
}
export {
  PortalJourney
};
