import nodemailer from "nodemailer"

const OTP_SUBJECT = process.env.SMTP_OTP_SUBJECT || "Your Atleast80 verification code"

let transporter = null

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

/**
 * @param {string} email
 * @param {string} otp
 */
export async function sendOtpEmail(email, otp) {
  if (!isEmailConfigured()) {
    throw new Error("Email service is not configured")
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: OTP_SUBJECT,
    text: `${otp} is your Atleast80 OTP. Valid for 10 minutes only, don't share with anyone.`,
    html: `<p><strong>${otp}</strong> is your Atleast80 OTP.</p><p>Valid for 10 minutes only, don't share with anyone.</p>`,
  })

  console.log(`OTP email sent to ${email.replace(/^(.{2}).*(@.*)$/, "$1***$2")}`)
}
