// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TWILIO_VERIFICATION_CODE = "AWLFY6D68D8GY3KBXM4Y8LUY";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TWILIO_NUMBER = "+18668348653";

export async function sendTextMessage({
  number,
  message,
}: {
  number: string;
  message: string;
}) {
  console.log({ number, message });
}
