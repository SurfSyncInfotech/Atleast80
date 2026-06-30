import { useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import {
  ShieldCheck, Video, Clock, Eye, CheckCircle2, XCircle,
  ChefHat, Droplets, Refrigerator, Sparkles, ArrowRight,
} from "lucide-react"
import StaticPageLayout, { SectionHeading } from "../components/layout/StaticPageLayout"
import Button from "../components/ui/Button"

const STEPS = [
  { title: "Get approved", desc: "Complete registration and pass admin review." },
  { title: "Record daily", desc: "Open your dashboard and record a kitchen walkthrough." },
  { title: "Stay visible", desc: "A valid video keeps your kitchen live for customers." },
  { title: "Repeat", desc: "Upload again within 24 hours — every day you operate." },
]

const VIDEO_TIPS = [
  { icon: Video, title: "Record in good light", desc: "Landscape mode, natural daylight works best." },
  { icon: ChefHat, title: "Show the full kitchen", desc: "Pan across cooking area, sink, and storage." },
  { icon: Clock, title: "Upload every 24 hours", desc: "Record fresh before you start cooking each day." },
  { icon: Eye, title: "Customers can view it", desc: "Latest video appears on your public kitchen page." },
]

const DAILY_CHECKLIST = [
  "Cooking surfaces wiped clean and free of grease or food residue",
  "Utensils, chopping boards, and storage containers washed and dry",
  "Hands washed; hair tied back; clean apron or clothing while cooking",
  "Refrigerator organised — no expired ingredients visible",
  "Waste disposed properly; sink and washing area clear",
  "Packaging area clean before packing customer orders",
]

const DO_LIST = [
  "Upload one daily hygiene video from your seller dashboard",
  "Record after cleaning, before active cooking begins",
  "Keep ingredients labelled and stored at safe temperatures",
  "Use fresh gloves or washed hands when handling ready-to-eat food",
  "Report any illness and pause orders until you recover",
]

const DONT_LIST = [
  "Don't upload blurry, dark, or very short clips (under 10 seconds)",
  "Don't reuse old videos — each day needs a new recording",
  "Don't cook in areas with visible pests, clutter, or dirty water",
  "Don't use ingredients past expiry or with damaged packaging",
]

const AREAS = [
  { icon: ChefHat, label: "Cooking area", desc: "Stove, counters, prep space" },
  { icon: Droplets, label: "Washing area", desc: "Sink, utensils, drying rack" },
  { icon: Refrigerator, label: "Storage", desc: "Fridge shelves and ingredients" },
]

export default function HygieneGuidelinesPage() {
  const navigate = useNavigate()

  return (
    <StaticPageLayout
      wide
      variant="seller"
      badge="For kitchen partners"
      title="Hygiene guidelines"
      subtitle="Clear standards that keep customers safe and your kitchen visible on Atleast80."
    >
      {/* Feature banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#1a5c38] to-[#0a1f13] p-8 md:p-10 mb-14 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={32} className="text-secondary" />
          </div>
          <div className="flex-1">
            <h2 className="font-poppins font-bold text-2xl md:text-3xl">Daily video, daily trust</h2>
            <p className="font-nunito text-white/75 text-sm md:text-base mt-3 leading-relaxed max-w-2xl">
              Every approved kitchen uploads a short hygiene video within each 24-hour window.
              When your video is current, customers can order. If it expires, your kitchen may be
              hidden from search until you upload a new one.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline steps */}
      <section className="mb-16 md:mb-20">
        <SectionHeading
          eyebrow="Process"
          title="How it works"
          description="Four simple steps — repeat step 4 every day you accept orders."
          center
          className="mb-10 md:mb-12"
        />
        <div className="relative max-w-3xl mx-auto">
          <div className="absolute left-5 md:left-6 top-3 bottom-3 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent" />
          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative flex gap-5 md:gap-6 pl-0">
                <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary text-white font-poppins font-bold text-sm md:text-base flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
                  {i + 1}
                </div>
                <div className="pt-1 pb-2">
                  <h3 className="font-poppins font-bold text-dark text-lg">{step.title}</h3>
                  <p className="font-nunito text-gray text-sm md:text-base mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video tips — bento */}
      <section className="mb-16 md:mb-20">
        <SectionHeading
          eyebrow="Recording"
          title="Tips for a great video"
          className="mb-8"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          {VIDEO_TIPS.map((tip, i) => {
            const Icon = tip.icon
            return (
              <div
                key={tip.title}
                className={`group rounded-2xl p-6 transition-shadow hover:shadow-md ${
                  i === 0 ? "sm:col-span-2 bg-[#0a1f13] text-white" : "bg-white border border-gray-100"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                  i === 0 ? "bg-white/15" : "bg-emerald-50"
                }`}>
                  <Icon size={20} className={i === 0 ? "text-secondary" : "text-emerald-600"} />
                </div>
                <h3 className={`font-poppins font-bold text-base ${i === 0 ? "text-white" : "text-dark"}`}>
                  {tip.title}
                </h3>
                <p className={`font-nunito text-sm mt-2 leading-relaxed ${i === 0 ? "text-white/65" : "text-gray"}`}>
                  {tip.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Checklist */}
      <section className="mb-16 md:mb-20">
        <SectionHeading
          eyebrow="Before you record"
          title="Daily kitchen checklist"
          description="Your video should clearly show these standards are met."
          className="mb-8"
        />
        <div className="rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-sm">
          {DAILY_CHECKLIST.map((item, i) => (
            <div
              key={item}
              className={`flex items-start gap-4 px-6 py-4 md:py-5 ${i % 2 === 0 ? "bg-white" : "bg-cream/60"}`}
            >
              <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="font-nunito text-sm md:text-base text-[#363636] leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Areas */}
      <section className="mb-16 md:mb-20">
        <SectionHeading eyebrow="Coverage" title="What to show in your video" className="mb-8" />
        <div className="grid sm:grid-cols-3 gap-4">
          {AREAS.map((area) => {
            const Icon = area.icon
            return (
              <div key={area.label} className="text-center rounded-2xl bg-white border border-gray-100 p-6 hover:border-primary/20 hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-emerald-50 flex items-center justify-center mx-auto">
                  <Icon size={24} className="text-primary" />
                </div>
                <h3 className="font-poppins font-bold text-dark mt-4">{area.label}</h3>
                <p className="font-nunito text-sm text-gray mt-1">{area.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Do / Don't */}
      <section className="mb-14 grid md:grid-cols-2 gap-5 md:gap-6">
        <div className="rounded-3xl bg-emerald-50/80 border border-emerald-100/80 p-7 md:p-8">
          <h3 className="font-poppins font-bold text-emerald-800 text-lg flex items-center gap-2 mb-5">
            <CheckCircle2 size={20} /> Do
          </h3>
          <ul className="space-y-3.5">
            {DO_LIST.map((item) => (
              <li key={item} className="flex gap-3 font-nunito text-sm md:text-base text-emerald-900/80 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-rose-50/80 border border-rose-100/80 p-7 md:p-8">
          <h3 className="font-poppins font-bold text-rose-800 text-lg flex items-center gap-2 mb-5">
            <XCircle size={20} /> Don&apos;t
          </h3>
          <ul className="space-y-3.5">
            {DONT_LIST.map((item) => (
              <li key={item} className="flex gap-3 font-nunito text-sm md:text-base text-rose-900/80 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0 mt-2" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0a1f13] px-7 py-8 md:px-10 md:py-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,200,80,0.1),_transparent_60%)]" />
        <div className="relative">
          <p className="font-poppins text-secondary text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles size={14} /> Seller dashboard
          </p>
          <h3 className="font-poppins font-bold text-xl md:text-2xl mt-2">Ready to upload today&apos;s video?</h3>
          <p className="font-nunito text-white/55 text-sm mt-2">
            Open your dashboard → Hygiene section. Need help? Read our{" "}
            <Link to="/contact" className="text-secondary hover:underline">contact page</Link>.
          </p>
        </div>
        <Button
          onClick={() => navigate("/kitchen/dashboard")}
          className="relative !rounded-xl flex-shrink-0"
        >
          Open dashboard <ArrowRight size={16} />
        </Button>
      </div>
    </StaticPageLayout>
  )
}
