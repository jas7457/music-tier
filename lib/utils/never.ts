export function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

export function assumeNever(x: never): never {
  return x;
}
