export class Rng {
  private s: number;
  private spare: number | null = null;

  constructor(seed: number) {
    this.s = (seed ^ 0x9e3779b9) >>> 0;
  }

  random(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(a: number, b: number) {
    return a + (b - a) * this.random();
  }

  int(a: number, b: number) {
    return a + Math.floor(this.random() * (b - a + 1));
  }

  choice<T>(xs: readonly T[]): T {
    return xs[Math.floor(this.random() * xs.length)];
  }

  gauss(mu: number, sigma: number) {
    if (this.spare !== null) {
      const z = this.spare;
      this.spare = null;
      return mu + sigma * z;
    }
    const u = Math.max(this.random(), 1e-12);
    const v = this.random();
    const r = Math.sqrt(-2 * Math.log(u));
    this.spare = r * Math.sin(2 * Math.PI * v);
    return mu + sigma * r * Math.cos(2 * Math.PI * v);
  }

  shuffle<T>(xs: T[]): T[] {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  }
}
