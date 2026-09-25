"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { RiMenu3Line, RiCloseLine, RiExternalLinkLine } from "react-icons/ri";

const LINKS = [
  { href: "/#about", label: "About" },
  { href: "/#programs", label: "Programmes" },
  { href: "/#facilities", label: "Facilities" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/contact", label: "Contact", exact: true },
];

// Sticky glass navbar. Student/Staff portal CTAs use env URLs when set and
// fall back to the live student.jmischool.com / staff.jmischool.com addresses.
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const studentPortal = process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL || "https://student.jmischool.com";
  const staffPortal = process.env.NEXT_PUBLIC_STAFF_PORTAL_URL || "https://staff.jmischool.com";

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/85 border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.jpg" alt="JMIS logo" width={40} height={40} className="rounded-full" priority />
          <span className="font-extrabold text-brand text-lg leading-tight">
            JMIS
            <span className="block text-[10px] font-semibold text-gray-500 tracking-wide">
              Jeshurun Montessori International School
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 ml-auto">
          {LINKS.map((l) =>
            l.exact ? (
              <Link key={l.href} href={l.href} className="text-sm font-semibold text-gray-700 hover:text-brand-light">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} className="text-sm font-semibold text-gray-700 hover:text-brand-light">
                {l.label}
              </a>
            )
          )}
          <Link href="/cbt" className="text-sm font-semibold text-brand-light hover:text-brand">
            CBT Portal
          </Link>
        </nav>

        <div className="hidden lg:flex items-center gap-2 ml-4">
          <a
            href={studentPortal}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold px-4 py-2 rounded-full border border-brand text-brand hover:bg-brand-soft inline-flex items-center gap-1"
          >
            Student Portal <RiExternalLinkLine />
          </a>
          <a
            href={staffPortal}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold px-4 py-2 rounded-full border border-brand text-brand hover:bg-brand-soft inline-flex items-center gap-1"
          >
            Staff Portal <RiExternalLinkLine />
          </a>
          <Link href="/admissions" className="text-sm font-bold px-4 py-2 rounded-full brand-gradient text-white hover:opacity-90">
            Enroll Your Child
          </Link>
        </div>

        <button type="button" aria-label="Menu" className="lg:hidden ml-auto text-2xl text-brand" onClick={() => setOpen((v) => !v)}>
          {open ? <RiCloseLine /> : <RiMenu3Line />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3">
          {LINKS.map((l) =>
            l.exact ? (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-semibold text-gray-700">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-semibold text-gray-700">
                {l.label}
              </a>
            )
          )}
          <Link href="/cbt" onClick={() => setOpen(false)} className="text-sm font-semibold text-brand-light">CBT Portal</Link>
          <a href={studentPortal} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="text-sm font-semibold text-brand">
            Student Portal ↗
          </a>
          <a href={staffPortal} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="text-sm font-semibold text-brand">
            Staff Portal ↗
          </a>
          <Link href="/admissions" onClick={() => setOpen(false)} className="text-sm font-bold px-4 py-2 rounded-full brand-gradient text-white text-center">
            Enroll Your Child
          </Link>
        </div>
      )}
    </header>
  );
}
