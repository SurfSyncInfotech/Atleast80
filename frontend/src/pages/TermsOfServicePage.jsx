import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import StaticPageLayout from "../components/layout/StaticPageLayout"
import { cn } from "../lib/utils"
import { getCmsPolicy } from "../lib/api"

const DEFAULT_SECTIONS = [
  {
    id: "acceptance",
    num: "01",
    title: "Acceptance",
    content: "By accessing or using Atleast80, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the platform.",
  },
  {
    id: "role",
    num: "02",
    title: "Our role",
    content: "Atleast80 is a technology marketplace that connects customers with independent home kitchens. We are not the seller of food items — kitchens prepare and fulfil orders directly. We facilitate discovery, ordering, payments, and hygiene verification.",
  },
  {
    id: "customers",
    num: "03",
    title: "Customer accounts",
    content: "You must provide accurate contact and delivery information. You are responsible for keeping your login credentials secure. Orders are binding once confirmed.",
  },
  {
    id: "partners",
    num: "04",
    title: "Kitchen partner obligations",
    content: "Partners must maintain valid registrations (including FSSAI where applicable), upload daily hygiene videos, prepare food safely, honour listed prices, and fulfil orders on time. We may suspend or remove kitchens that violate hygiene standards, receive repeated complaints, or breach these terms.",
  },
  {
    id: "orders",
    num: "05",
    title: "Orders, pricing & payments",
    content: "Prices are set by kitchens and displayed at checkout. Taxes and delivery fees may apply. Payments are processed through authorised payment partners. Refunds are handled per our refund policy and individual order circumstances.",
  },
  {
    id: "hygiene",
    num: "06",
    title: "Hygiene & food safety",
    content: "Kitchens agree to follow our Hygiene Guidelines and applicable food safety laws. Customers acknowledge that home-cooked food carries inherent risks and should report concerns promptly.",
  },
  {
    id: "conduct",
    num: "07",
    title: "Prohibited conduct",
    content: "Users may not misuse the platform, post false reviews, circumvent fees, upload misleading media, harass others, or use the service for unlawful purposes.",
  },
  {
    id: "ip",
    num: "08",
    title: "Intellectual property",
    content: "Atleast80 branding, software, and content are owned by us or our licensors. Kitchens grant us a licence to display their menus, images, and hygiene content for platform operation.",
  },
  {
    id: "liability",
    num: "09",
    title: "Limitation of liability",
    content: "To the fullest extent permitted by law, Atleast80 is not liable for indirect, incidental, or consequential damages arising from use of the platform, food quality issues between customers and kitchens, or service interruptions.",
  },
  {
    id: "termination",
    num: "10",
    title: "Termination",
    content: "We may suspend or terminate accounts that violate these terms. You may stop using the service at any time. Provisions that should survive termination will remain in effect.",
  },
  {
    id: "law",
    num: "11",
    title: "Governing law",
    content: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.",
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

export default function TermsOfServicePage() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [activeId, setActiveId] = useState(DEFAULT_SECTIONS[0]?.id || "acceptance")

  useEffect(() => {
    getCmsPolicy("terms")
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
      title="Terms of Service"
      subtitle="Last updated June 2026 — rules and terms governing use of Atleast80."
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
                <Link to="/privacy" className="text-primary font-semibold hover:underline">Privacy Policy</Link>
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
