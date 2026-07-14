import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import StaticPageLayout from "../components/layout/StaticPageLayout"
import { cn } from "../lib/utils"

const SECTIONS = [
  {
    id: "who",
    num: "01",
    title: "Who we are",
    content: (
      <p>
        Atleast80 (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates a marketplace connecting customers
        with verified home kitchens. This policy explains how we handle personal data when you use
        our website and mobile experience.
      </p>
    ),
  },
  {
    id: "collect",
    num: "02",
    title: "Information we collect",
    content: (
      <>
        <p><strong className="text-dark font-semibold">Customers:</strong> name, phone number, email, delivery address, order history, and payment-related metadata processed by our payment partners (we do not store full card numbers).</p>
        <p><strong className="text-dark font-semibold">Kitchen partners:</strong> business and owner details, FSSAI or registration documents, kitchen photos, hygiene videos, menu data, bank or payout details, and communications with our team.</p>
        <p><strong className="text-dark font-semibold">Automatically:</strong> device type, browser, IP address, and usage logs used for security and product improvement.</p>
      </>
    ),
  },
  {
    id: "use",
    num: "03",
    title: "How we use your data",
    content: (
      <p>To process orders, deliver food, verify kitchen hygiene, provide customer support, send transactional messages (order updates, OTPs), improve our platform, and comply with legal obligations.</p>
    ),
  },
  {
    id: "share",
    num: "04",
    title: "Sharing of information",
    content: (
      <p>We share limited data with kitchen partners (name, phone, delivery address for fulfilment), payment processors, delivery partners where applicable, and authorities when required by law. We do not sell your personal data.</p>
    ),
  },
  {
    id: "hygiene",
    num: "05",
    title: "Hygiene videos",
    content: (
      <p>Kitchen hygiene videos uploaded by sellers may be displayed to customers on the kitchen&apos;s public page to build trust. Videos are stored securely and removed according to our retention rules.</p>
    ),
  },
  {
    id: "retention",
    num: "06",
    title: "Data retention",
    content: (
      <p>We retain account and order data as long as your account is active and as needed for legal, tax, and dispute-resolution purposes. You may request deletion subject to applicable law.</p>
    ),
  },
  {
    id: "rights",
    num: "07",
    title: "Your rights",
    content: (
      <p>You may access, correct, or request deletion of your personal data by contacting us. Indian users may have rights under applicable data protection laws.</p>
    ),
  },
  {
    id: "security",
    num: "08",
    title: "Security",
    content: (
      <p>We use industry-standard measures including encrypted connections (HTTPS), access controls, and secure storage. No method of transmission over the internet is 100% secure.</p>
    ),
  },
  {
    id: "children",
    num: "09",
    title: "Children",
    content: (
      <p>Our services are not directed at children under 18. We do not knowingly collect data from minors.</p>
    ),
  },
  {
    id: "contact",
    num: "10",
    title: "Contact",
    content: (
      <>
        <p>
          For privacy questions:{" "}
          <a href="mailto:contact@elifelo.com" className="text-primary font-semibold hover:underline">contact@elifelo.com</a>
          {" · "}
          <a href="tel:+914035594439" className="text-primary font-semibold hover:underline">+91 40 3559 4439</a>
        </p>
      </>
    ),
  },
]

function LegalSection({ id, num, title, children, isLast }) {
  return (
    <section id={id} className={cn("scroll-mt-28", !isLast && "pb-12 mb-12 border-b border-gray-200/70")}>
      <div className="flex items-start gap-4 md:gap-6">
        <span className="font-poppins font-bold text-3xl md:text-4xl text-primary/15 leading-none select-none flex-shrink-0">
          {num}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-poppins font-bold text-dark text-lg md:text-xl">{title}</h2>
          <div className="font-nunito text-[#4a4a4a] text-sm md:text-base leading-[1.75] mt-4 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

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
              {SECTIONS.map((s) => (
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
          {SECTIONS.map((s, i) => (
            <LegalSection key={s.id} id={s.id} num={s.num} title={s.title} isLast={i === SECTIONS.length - 1}>
              {s.content}
            </LegalSection>
          ))}
        </div>
      </div>
    </StaticPageLayout>
  )
}
