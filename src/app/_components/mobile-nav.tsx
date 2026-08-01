"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight, Package } from "lucide-react";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-5">
        <a href="#commander" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#C8963E] to-[#a07832] text-white font-semibold px-5 py-2 text-sm shadow-md shadow-[#722F37]/30 hover:from-[#d4a94e] hover:to-[#C8963E] transition-all">
          <Package className="w-4 h-4" />
          Commander
        </a>
        <a href="#fonctionnement" className="text-sm text-stone-400 hover:text-white transition-colors">Comment ça marche</a>
        <a href="#fonctionnalites" className="text-sm text-stone-400 hover:text-white transition-colors">Fonctionnalités</a>
        <a href="#tarifs" className="text-sm text-stone-400 hover:text-white transition-colors">Tarifs</a>
        <Link href="/dashboard/login" className="text-sm font-semibold text-stone-300 hover:text-white transition-colors flex items-center gap-1">
          Connexion <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Mobile hamburger button */}
      <button onClick={() => setOpen(!open)} className="md:hidden w-10 h-10 rounded-xl bg-stone-800/60 flex items-center justify-center text-stone-300 hover:text-white transition-colors" aria-label="Menu">
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 w-72 h-full bg-stone-950 border-l border-stone-800 p-6 flex flex-col gap-1" style={{ animation: "slideInRight 0.25s ease-out" }}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Image src="/icon-192.png" alt="Resto SaaS" width={28} height={28} className="rounded-lg" />
                <span className="font-semibold text-sm text-white">Resto SaaS</span>
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <a onClick={() => setOpen(false)} href="#commander" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#C8963E] font-semibold hover:bg-[#722F37]/30 transition-colors">
              <Package className="w-5 h-5" />
              Commander
            </a>
            <a onClick={() => setOpen(false)} href="#fonctionnement" className="flex items-center gap-3 px-4 py-3 rounded-xl text-stone-300 hover:bg-stone-800 transition-colors">
              Comment ça marche
            </a>
            <a onClick={() => setOpen(false)} href="#fonctionnalites" className="flex items-center gap-3 px-4 py-3 rounded-xl text-stone-300 hover:bg-stone-800 transition-colors">
              Fonctionnalités
            </a>
            <a onClick={() => setOpen(false)} href="#tarifs" className="flex items-center gap-3 px-4 py-3 rounded-xl text-stone-300 hover:bg-stone-800 transition-colors">
              Tarifs
            </a>

            <div className="border-t border-stone-800 my-4" />

            <Link href="/dashboard/login" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-stone-300 hover:bg-stone-800 transition-colors">
              Connexion <ArrowRight className="w-4 h-4 ml-auto" />
            </Link>

            <div className="mt-auto">
              <a
                href="https://wa.me/2250575343846?text=Bonjour%2C%20je%20souhaite%20essayer%20Resto%20SaaS%20pour%20mon%20restaurant."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 text-white font-semibold py-3 text-sm hover:bg-emerald-500 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Contacter sur WhatsApp
              </a>
            </div>
          </div>

          <style jsx>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
