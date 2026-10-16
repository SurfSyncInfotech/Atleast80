import { useEffect, useState } from "react"
import { Mail, Trash2, Clock, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react"
import StaticPageLayout from "../components/layout/StaticPageLayout"
import { useAuth } from "../context/AuthContext"
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
  const { user } = useAuth()
  const [deletionEmail, setDeletionEmail] = useState(FALLBACK_DELETION_EMAIL)

  useEffect(() => {
    getPublicContactSettings()
      .then((data) => {
        if (data?.accountDeletionEmail) setDeletionEmail(data.accountDeletionEmail)
      })
      .catch(() => {})
  }, [])

  const mailHref = gmailDeletionUrl(deletionEmail, {
    name: user?.name || "",
    phone: user?.phone || "",
    registeredEmail: user?.email || "",
  })

  return (
    <StaticPageLayout
      variant="legal"
      badge="Your account"
      title="Delete your Atleast80 User or Kitchen Partner Account"
      subtitle={`You can request deletion of your Atleast80 customer or kitchen partner/seller account and associated data at any time. Send the request to ${deletionEmail} and we will remove your account and personal/business data.`}
    >
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10 max-w-3xl">
        {/* Main CTA banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[#0a1f13] to-[#123824] text-white shadow-md">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Mail size={22} className="text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="font-poppins text-white/60 text-xs font-semibold uppercase tracking-wider">Official Support Email</p>
              <p className="font-poppins font-bold text-lg md:text-xl mt-0.5 truncate">{deletionEmail}</p>
              <p className="font-nunito text-white/70 text-xs mt-1">
                {user ? `Prefilled for ${user.name || user.email}` : "Click button to compose deletion request"}
              </p>
            </div>
          </div>

          <a
            href={mailHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-secondary text-dark font-poppins font-bold text-sm hover:bg-secondary-light transition-all shadow-sm hover:shadow flex-shrink-0 cursor-pointer text-center"
          >
            <span>Open in Gmail</span>
            <ExternalLink size={16} />
          </a>
        </div>

        {/* Steps */}
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

        {/* Info Grid */}
        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-cream/70 p-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Trash2 size={18} className="text-primary" />
            </div>
            <h3 className="font-poppins font-semibold text-dark text-sm">What we delete</h3>
            <p className="font-nunito text-gray text-sm leading-relaxed mt-2">
              Your user or kitchen profile, login credentials, phone number, email, address, menu items, and personal details.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-cream/70 p-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <h3 className="font-poppins font-semibold text-dark text-sm">What we may keep</h3>
            <p className="font-nunito text-gray text-sm leading-relaxed mt-2">
              Order and payment transaction logs required for tax, audit, and legal compliance for the legally required duration.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gray-100 p-5">
          <Clock size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <p className="font-nunito text-[#4a4a4a] text-sm leading-relaxed">
            Deletion requests are verified and processed within 7 business days. You will receive a confirmation once complete.
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="font-nunito text-sm text-gray">
            Ready to proceed? Click to open Gmail with pre-filled details.
          </p>
          <a
            href={mailHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-poppins font-bold text-sm hover:bg-primary-dark transition-colors shadow-xs flex-shrink-0 cursor-pointer"
          >
            <Mail size={16} />
            <span>Send Deletion Request</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </StaticPageLayout>
  )
}
