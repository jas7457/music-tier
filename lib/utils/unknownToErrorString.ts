export function unknownToErrorString(
  err: unknown,
  unknownError: string,
): string {
  const errorMessage = (() => {
    if (typeof err === 'string') {
      return err;
    }
    if (err instanceof Error) {
      return err.message;
    }

    if (unknownError) {
      return unknownError;
    }

    return 'An unknown error occurred';
  })();

  console.error(`${unknownError ?? 'Error'}:`, errorMessage);
  return errorMessage;
}
