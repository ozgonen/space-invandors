export class Point2D {
  x;
  y;

  constructor(x, y) {
    this.x = (typeof x === 'undefined') ? 0 : x;
    this.y = (typeof y === 'undefined') ? 0 : y;
  }

  set(x, y): void {
    this.x = x;
    this.y = y;
  }
}
