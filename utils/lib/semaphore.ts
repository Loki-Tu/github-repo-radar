/**
 * Promise-based Semaphore 实现
 * 用于控制并发请求数量
 */
export class Semaphore {
  private waiting: Array<() => void> = [];
  private current: number;
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
    this.current = 0;
  }

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.current--;
    if (this.waiting.length > 0) {
      this.current++;
      const next = this.waiting.shift()!;
      next();
    }
  }
}
