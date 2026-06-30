import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import StaticPageLayout from "../components/layout/StaticPageLayout"
import { cn } from "../lib/utils"

const SECTIONS = [
  {
    id: "acceptance",
    num: "01",
    title: "Acceptance",
    content: (
      <p>
        By accessing or using Atleast80, you agree to these Terms of Service and our Privacy Policy.
        If you do not agree, please do not use the platform.
      </p>
    ),
  },
  {
    id: "role",
    num: "02",
    title: "Our role",
    content: (
      <p>
        Atleast80 is a technology marketplace that connects customers with independent home kitchens.
        We are not the seller of food items — kitchens prepare and fulfil orders directly. We facilitate
        discovery, ordering, payments, and hygiene verification.
      </p>
    ),
  },
  {
    id: "customers",
    num: "03",
    title: "Customer accounts",
    content: (
      <p>You must provide accurate contact and delivery information. You are responsible for keeping your login credentials secure. Orders are binding once confirmed.</p>
    ),
  },
  {
    id: "partners",
    num: "04",
    title: "Kitchen partner obligations",
    content: (
      <p>
        Partners must maintain valid registrations (including FSSAI where applicable), upload daily hygiene videos, prepare food safely, honour listed prices, and fulfil orders on time. We may suspend or remove kitchens that violate hygiene standards, receive repeated complaints, or breach these terms. See our{" "}
        <Link to="/hygiene-guidelines" className="text-primary font-semibold hover:underline">Hygiene Guidelines</Link>.
      </p>
    ),
  },
  {
    id: "orders",
    num: "05",
    title: "Orders, pricing & payments",
    content: (
      <p>Prices are set by kitchens and displayed at checkout. Taxes and delivery fees may apply. Payments are processed through authorised payment partners. Refunds are handled per our refund policy and individual order circumstances.</p>
    ),
  },
  {
    id: "hygiene",
    num: "06",
    title: "Hygiene & food safety",
    content: (
      <p>Kitchens agree to follow our Hygiene Guidelines and applicable food safety laws. Customers acknowledge that home-cooked food carries inherent risks and should report concerns promptly.</p>
    ),
  },
  {
    id: "conduct",
    num: "07",
    title: "Prohibited conduct",
    content: (
      <p>Users may not misuse the platform, post false reviews, circumvent fees, upload misleading media, harass others, or use the service for unlawful purposes.</p>
    ),
  },
  {
    id: "ip",
    num: "08",
    title: "Intellectual property",
    content: (
      <p>Atleast80 branding, software, and content are owned by us or our licensors. Kitchens grant us a licence to display their menus, images, and hygiene content for platform operation.</p>
    ),
  },
  {
    id: "liability",
    num: "09",
    title: "Limitation of liability",
    content: (
      <p>To the fullest extent permitted by law, Atleast80 is not liable for indirect, incidental, or consequential damages arising from use of the platform, food quality issues between customers and kitchens, or service interruptions.</p>
    ),
  },
  {
    id: "termination",
    num: "10",
    title: "Termination",
    content: (
      <p>We may suspend or terminate accounts that violate these terms. You may stop using the service at any time. Provisions that should survive termination will remain in effect.</p>
    ),
  },
  {
    id: "law",
    num: "11",
    title: "Governing law",
    content: (
      <p>These terms are governed by the laws of India. Disputes shall be subject to the courts of Hyderabad, Telangana, unless otherwise required by applicable law.</p>
    ),
  },
  {
    id: "contact",
    num: "12",
    title: "Contact",
    content: (
      <>
        <p>
          Questions about these terms:{" "}
          <a href="mailto:hello@atleast80.com" className="text-primary font-semibold hover:underline">hello@atleast80.com</a>
          {" · "}
          <a href="tel:+919797355255" className="text-primary font-semibold hover:underline">+91 97973 55255</a>
        </p>
        <p>Atleast80, Hyderabad, India</p>
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

export default function TermsOfServicePage() {
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
      title="Terms of Service"
      subtitle="Last updated June 2026 — please read these terms before using Atleast80."
    >
      <div className="grid lg:grid-cols-[220px_1fr] gap-10 lg:gap-14">
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
                <Link to="/privacy" className="text-primary font-semibold hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </aside>

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
