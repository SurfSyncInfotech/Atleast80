import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import StaticPageLayout from "../components/layout/StaticPageLayout"
import { cn } from "../lib/utils"
import { getCmsPolicy } from "../lib/api"

const DEFAULT_SECTIONS = [
  {
    id: "who",
    num: "01",
    title: "Who we are",
    content: "Atleast80 (\"we\", \"us\", \"our\") operates a marketplace connecting customers with verified home kitchens. This policy explains how we handle personal data when you use our website and mobile experience.",
  },
  {
    id: "collect",
    num: "02",
    title: "Information we collect",
    content: "Customers: name, phone number, email, delivery address, order history, and payment-related metadata processed by our payment partners (we do not store full card numbers).\n\nKitchen partners: business and owner details, FSSAI or registration documents, kitchen photos, hygiene videos, menu data, bank or payout details, and communications with our team.\n\nAutomatically: device type, browser, IP address, and usage logs used for security and product improvement.",
  },
  {
    id: "use",
    num: "03",
    title: "How we use your data",
    content: "To process orders, deliver food, verify kitchen hygiene, provide customer support, send transactional messages (order updates, OTPs), improve our platform, and comply with legal obligations.",
  },
  {
    id: "share",
    num: "04",
    title: "Sharing of information",
    content: "We share limited data with kitchen partners (name, phone, delivery address for fulfilment), payment processors, delivery partners where applicable, and authorities when required by law. We do not sell your personal data.",
  },
  {
    id: "hygiene",
    num: "05",
    title: "Hygiene videos",
    content: "Kitchen hygiene videos uploaded by sellers may be displayed to customers on the kitchen's public page to build trust. Videos are stored securely and removed according to our retention rules.",
  },
  {
    id: "retention",
    num: "06",
    title: "Data retention",
    content: "We retain account and order data as long as your account is active and as needed for legal, tax, and dispute-resolution purposes. You may request deletion subject to applicable law.",
  },
  {
    id: "rights",
    num: "07",
    title: "Your rights",
    content: "You may access, correct, or request deletion of your personal data by contacting us. Indian users may have rights under applicable data protection laws.",
  },
  {
    id: "security",
    num: "08",
    title: "Security",
    content: "We use industry-standard measures including encrypted connections (HTTPS), access controls, and secure storage. No method of transmission over the internet is 100% secure.",
  },
  {
    id: "children",
    num: "09",
    title: "Children",
    content: "Our services are not directed at children under 18. We do not knowingly collect data from minors.",
  },
  {
    id: "contact",
    num: "10",
    title: "Contact",
    content: "For privacy questions: contact@elifelo.com · +91 40 3559 4439",
  },
]

function LegalSection({ id, num, title, content, isLast }) {
  const paragraphs = typeof content === "string" ? content.split("\n\n") : []

  return (
    <section id={id} className={cn("scroll-mt-28", !isLast && "pb-12 mb-12 border-b border-gray-200/70")}>
      <div className="flex items-start gap-4 md:gap-6">
        <span className="font-poppins font-bold text-3xl md:text-4xl text-primary/15 leading-none select-none flex-shrink-0">
          {num}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-poppins font-bold text-dark text-lg md:text-xl">{title}</h2>
          <div className="font-nunito text-[#4a4a4a] text-sm md:text-base leading-[1.75] mt-4 space-y-4">
            {typeof content === "string" ? (
              paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
            ) : (
              content
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [activeId, setActiveId] = useState(DEFAULT_SECTIONS[0]?.id || "who")

  useEffect(() => {
    getCmsPolicy("privacy")
      .then((data) => {
        if (data?.sections && Array.isArray(data.sections) && data.sections.length > 0) {
          setSections(data.sections)
          setActiveId(data.sections[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <StaticPageLayout
      variant="legal"
      wide
      badge="Legal"
      title="Privacy Policy"
      subtitle="Last updated June 2026 — how Atleast80 collects, uses, and protects your information."
    >
      <div className="grid lg:grid-cols-[220px_1fr] gap-10 lg:gap-14">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
            <p className="font-poppins text-xs font-semibold uppercase tracking-widest text-gray mb-4">On this page</p>
            <nav className="space-y-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    "block font-nunito text-sm py-1.5 px-2 rounded-lg transition-colors",
                    activeId === s.id
                      ? "text-primary font-semibold bg-primary/5"
                      : "text-gray hover:text-dark hover:bg-gray-50"
                  )}
                >
                  {s.title}
                </a>
              ))}
            </nav>
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="font-nunito text-xs text-gray leading-relaxed">
                See also{" "}
                <Link to="/terms" className="text-primary font-semibold hover:underline">Terms of Service</Link>
              </p>
            </div>
          </div>
        </aside>

        {/* Document body */}
        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-7 md:p-10 lg:p-12">
          {sections.map((s, i) => (
            <LegalSection key={s.id || i} id={s.id} num={s.num} title={s.title} content={s.content} isLast={i === sections.length - 1} />
          ))}
        </div>
      </div>
    </StaticPageLayout>
  )
}
