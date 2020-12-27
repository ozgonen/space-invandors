export class Rect {
  x;
  y;
  w;
  h;

  constructor(x, y, w, h) {
    this.x = (typeof x === 'undefined') ? 0 : x;
    this.y = (typeof y === 'undefined') ? 0 : y;
    this.w = (typeof w === 'undefined') ? 0 : w;
    this.h = (typeof h === 'undefined') ? 0 : h;
  }

  set(x, y, w, h): void {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
}
