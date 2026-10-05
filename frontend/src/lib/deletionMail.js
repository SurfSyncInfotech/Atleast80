export function gmailDeletionUrl(email, { name = "", phone = "", registeredEmail = "" } = {}) {
  const body = [
    "Please delete my Atleast80 account.",
    "",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Registered email: ${registeredEmail}`,
  ].join("\n")

  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email,
    su: "Account deletion request",
    body,
  })

  return `https://mail.google.com/mail/?${params.toString()}`
}
