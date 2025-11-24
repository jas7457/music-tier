import FormData from "form-data";
import Mailgun from "mailgun.js";
import { APP_NAME } from "./utils/constants";

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
if (!MAILGUN_API_KEY) {
  throw new Error("MAILGUN_API_KEY is not defined in environment variables");
}
if (!MAILGUN_DOMAIN) {
  throw new Error("MAILGUN_DOMAIN is not defined in environment variables");
}

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: "api",
  key: MAILGUN_API_KEY,
  // When you have an EU-domain, you must specify the endpoint:
  // url: "https://api.eu.mailgun.net"
});

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: {
    fullName: string;
    email: string;
  };
  subject: string;
  text: string;
}) {
  try {
    await mg.messages.create(MAILGUN_DOMAIN!, {
      from: `${APP_NAME} <notifications@${MAILGUN_DOMAIN}>`,
      to: [`${to.fullName} <${to.email}>`],
      subject,
      text,
    });
  } catch {}
}
