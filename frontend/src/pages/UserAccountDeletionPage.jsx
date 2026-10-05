import { useEffect, useState } from "react"
import { Mail, Trash2, Clock, ShieldCheck } from "lucide-react"
import StaticPageLayout from "../components/layout/StaticPageLayout"
import { getPublicContactSettings } from "../lib/api"
import { gmailDeletionUrl } from "../lib/deletionMail"

const FALLBACK_DELETION_EMAIL = "liveatleast80@gmail.com"

const STEPS = [
  {
    num: "01",
    title: "Send a deletion request",
    content: (email) => `Email ${email} from the email address registered on your Atleast80 account. Use the subject “Account deletion request”.`,
  },
  {
    num: "02",
    title: "Include your account details",
    content: "In the email, include your full name and the phone number linked to the account so we can match the request to the right profile.",
  },
  {
    num: "03",
    title: "We confirm and delete",
    content: "After we verify the request, we delete the account and associated personal data. You will receive a confirmation at the same email address.",
  },
]

export default function UserAccountDeletionPage() {
  const [deletionEmail, setDeletionEmail] = useState(FALLBACK_DELETION_EMAIL)

  useEffect(() => {
    getPublicContactSettings()
      .then((data) => {
        if (data?.accountDeletionEmail) setDeletionEmail(data.accountDeletionEmail)
      })
      .catch(() => {})
  }, [])

  const mailHref = gmailDeletionUrl(deletionEmail)

  return (
    <StaticPageLayout
      variant="legal"
      badge="Your account"
      title={
        <a href={mailHref} target="_blank" rel="noopener noreferrer" className="hover:underline">
          Delete your Atleast80 account
        </a>
      }
      subtitle={`You can request deletion of your user account at any time. Send the request to ${deletionEmail} and we will remove your account and personal data.`}
    >
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10 max-w-3xl">
        <a
          href={mailHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 p-5 rounded-2xl bg-[#0a1f13] text-white hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Mail size={22} className="text-secondary" />
          </div>
          <div>
            <p className="font-poppins text-white/60 text-xs font-semibold uppercase tracking-wider">Request account deletion</p>
            <p className="font-poppins font-bold text-lg md:text-xl mt-1">{deletionEmail}</p>
            <p className="font-nunito text-white/60 text-sm mt-2">Opens Gmail with your deletion request.</p>
          </div>
        </a>

        <div className="mt-10 space-y-8">
          {STEPS.map((step) => (
            <section key={step.num} className="flex items-start gap-4 md:gap-6">
              <span className="font-poppins font-bold text-3xl text-primary/20 leading-none select-none">{step.num}</span>
              <div>
                <h2 className="font-poppins font-bold text-dark text-lg">{step.title}</h2>
                <p className="font-nunito text-[#4a4a4a] text-sm md:text-base leading-relaxed mt-2">
                  {typeof step.content === "function" ? step.content(deletionEmail) : step.content}
                </p>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-cream/70 p-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Trash2 size={18} className="text-primary" />
            </div>
            <h3 className="font-poppins font-semibold text-dark text-sm">What we delete</h3>
            <p className="font-nunito text-gray text-sm leading-relaxed mt-2">
              Your profile, login, phone number, email, saved delivery address, and other personal details tied to the account.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-cream/70 p-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <h3 className="font-poppins font-semibold text-dark text-sm">What we may keep</h3>
            <p className="font-nunito text-gray text-sm leading-relaxed mt-2">
              Order and payment records required for tax, fraud prevention, or legal obligations may be retained in limited form, then deleted when that period ends.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gray-100 p-5">
          <Clock size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <p className="font-nunito text-[#4a4a4a] text-sm leading-relaxed">
            Deletion requests are processed within 7 business days. You can also open this page from the Account section in the Atleast80 app or website.
          </p>
        </div>
      </div>
    </StaticPageLayout>
  )
}
