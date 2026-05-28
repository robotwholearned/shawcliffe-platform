import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Phone, Mail, Globe, MapPin, Star, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LogoMark = () => (
  <div className="flex flex-col items-center gap-3">
    <svg width="96" height="96" viewBox="0 0 100 100" aria-label="Shawcliffe Digital logo" className="drop-shadow-sm">
      <path d="M69 13H35L20 28v26l16 10 10-12-14-8V34l9-9h28z" fill="#155ed6" />
      <path d="M31 87h34l15-15V46L64 36 54 48l14 8v10l-9 9H31z" fill="#061225" />
      <path d="M36 59l22-22 12 9-24 24z" fill="#ffffff" />
    </svg>
    <div className="text-center leading-none">
      <div className="text-4xl font-extrabold tracking-[0.12em] text-slate-950">SHAWCLIFFE</div>
      <div className="mt-3 text-2xl font-bold tracking-[0.36em] text-blue-700">DIGITAL</div>
    </div>
  </div>
);

const ContactRow = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-4 text-slate-900">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white">
      <Icon size={19} strokeWidth={2.2} />
    </div>
    <div className="h-7 w-px bg-slate-300" />
    <div className="text-lg">{children}</div>
  </div>
);

const Benefit = ({ icon: Icon, title, text }) => (
  <div className="flex gap-4">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-700 text-blue-700">
      <Icon size={21} />
    </div>
    <div>
      <h3 className="font-bold uppercase tracking-wide text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  </div>
);

const PackageCard = ({ name, price, description, items, featured }) => (
  <Card className={`rounded-2xl border ${featured ? "border-blue-700 shadow-xl" : "border-slate-200 shadow-sm"}`}>
    <CardContent className="p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-extrabold tracking-wide text-slate-950">{name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {featured && <span className="rounded-full bg-blue-700 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Popular</span>}
      </div>
      <div className="mt-7 flex items-end gap-1">
        <span className="text-4xl font-extrabold text-slate-950">{price}</span>
        <span className="pb-1 text-slate-500">/mo</span>
      </div>
      <ul className="mt-7 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export default function ShawcliffeDigitalWebsiteMockup() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7">
        <div className="flex items-center gap-4">
          <svg width="42" height="42" viewBox="0 0 100 100" aria-label="Shawcliffe Digital mark">
            <path d="M69 13H35L20 28v26l16 10 10-12-14-8V34l9-9h28z" fill="#155ed6" />
            <path d="M31 87h34l15-15V46L64 36 54 48l14 8v10l-9 9H31z" fill="#061225" />
            <path d="M36 59l22-22 12 9-24 24z" fill="#ffffff" />
          </svg>
          <div>
            <div className="text-xl font-extrabold tracking-[0.14em]">SHAWCLIFFE</div>
            <div className="text-sm font-bold tracking-[0.36em] text-blue-700">DIGITAL</div>
          </div>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-semibold uppercase tracking-wide text-slate-600 md:flex">
          <a href="#services">Services</a>
          <a href="#packages">Packages</a>
          <a href="#contact">Contact</a>
        </nav>
        <Button className="rounded-full bg-slate-950 px-6 hover:bg-blue-800">Book a Call</Button>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1fr_1px_1fr] lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-center lg:justify-start">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
            <LogoMark />
            <div className="mx-auto mt-10 h-px w-4/5 bg-slate-200" />
            <p className="mx-auto mt-9 max-w-sm text-center text-xl font-semibold uppercase leading-8 tracking-[0.16em] text-slate-950">
              Custom branded apps for <span className="text-blue-700">local contractors & owner operators</span>
            </p>
          </div>
        </motion.div>

        <div className="hidden h-[520px] bg-slate-200 lg:block" />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-700">Shawcliffe Digital</p>
          <h1 className="mt-5 max-w-2xl text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Your business. Your brand. In your customer’s pocket.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Minimal, professional app systems for contractors who want more leads, better follow-up, stronger reviews, and a cleaner customer experience.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Button size="lg" className="rounded-full bg-blue-700 px-8 hover:bg-blue-800">
              Get a Free App Blueprint <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-full border-slate-300 px-8">
              View Packages
            </Button>
          </div>

          <div id="contact" className="mt-12 grid gap-4">
            <ContactRow icon={Phone}>(289) 314-0591</ContactRow>
            <ContactRow icon={Mail}>hello@shawcliffedigital.com</ContactRow>
            <ContactRow icon={Globe}>shawcliffedigital.com</ContactRow>
            <ContactRow icon={MapPin}>Serving Local Businesses</ContactRow>
          </div>
        </motion.div>
      </section>

      <section id="services" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-4">
          <Benefit icon={Phone} title="More Leads" text="Make it simple for customers to request quotes, call, or send job details." />
          <Benefit icon={Star} title="More Reviews" text="Guide happy customers toward leaving reviews after completed jobs." />
          <Benefit icon={Clock} title="Save Time" text="Keep common requests, reminders, and follow-up actions organized." />
          <Benefit icon={Users} title="Look Professional" text="Give your local business a polished digital presence under your own brand." />
        </div>
      </section>

      <section id="packages" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-700">Simple Packages</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">Choose the app system that fits your business.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Built for contractors, home-service businesses, and owner-operators who want practical digital tools without unnecessary complexity.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <PackageCard
            name="Starter App"
            price="$99"
            description="For small owner-operators who want a simple branded app presence."
            items={["Branded app layout", "Contact buttons", "Services page", "Quote request form", "Review link", "Basic setup and support"]}
          />
          <PackageCard
            name="Growth App"
            price="$169"
            description="For contractors who want more leads, repeat business, and customer reminders."
            featured
            items={["Everything in Starter", "Push notifications", "Seasonal offers", "Maintenance reminders", "Lead/customer list", "Photo upload form"]}
          />
          <PackageCard
            name="Premium App"
            price="$249"
            description="For contractors who want a more complete customer system and advanced features."
            items={["Everything in Growth", "Admin dashboard", "Customer segments", "Loyalty/referral features", "Advanced forms", "Priority support"]}
          />
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-400">Free Contractor App Blueprint</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight">See what a branded app could look like for your business.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              We’ll map out the features that make sense for your service business, including quote requests, reminders, reviews, and customer follow-up.
            </p>
          </div>
          <Button size="lg" className="rounded-full bg-white px-8 text-slate-950 hover:bg-slate-100">
            Book Your Free Call <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row">
        <p>© Shawcliffe Digital</p>
        <p>Custom branded apps for local contractors & owner operators.</p>
      </footer>
    </main>
  );
}
