
export function getRandomArbitrary(min, max): number {
  return Math.random() * (max - min) + min;
}

export function getRandomInt(min, max): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(num, min, max): number {
  return Math.min(Math.max(num, min), max);
}

export function valueInRange(value, min, max): boolean {
  return (value <= max) && (value >= min);
}

export function checkRectCollision(A, B): boolean {
  const xOverlap = valueInRange(A.x, B.x, B.x + B.w) ||
    valueInRange(B.x, A.x, A.x + A.w);

  const yOverlap = valueInRange(A.y, B.y, B.y + B.h) ||
    valueInRange(B.y, A.y, A.y + A.h);
  return xOverlap && yOverlap;
}

