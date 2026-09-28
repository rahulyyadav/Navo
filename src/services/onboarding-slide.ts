// A fast fling or a partial drag must not open login. Allow only an 8pt endpoint tolerance.
export function shouldCompleteSlide(position: number, travel: number) {
  return travel > 0 && position >= Math.max(travel - 8, travel * 0.97);
}
