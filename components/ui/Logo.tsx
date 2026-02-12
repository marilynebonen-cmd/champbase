"use client";

import Link from "next/link";

type LogoProps = {
  /** "nav" = compact for navbar, "hero" = larger for homepage */
  variant?: "nav" | "hero";
  /** If true, wrap in Link to "/". Default true in nav, false in hero (hero is already on home). */
  link?: boolean;
};

/**
 * Champ logo: podium with 3 happy people + wordmark. Dark theme, accent highlight.
 * Les 3 boules (têtes) ont une animation bounce au chargement (cercles en position directe pour un rendu net).
 */
export function Logo({ variant = "nav", link = variant === "nav" }: LogoProps) {
  const isHero = variant === "hero";
  const size = isHero ? 48 : 32;
  const textSize = isHero ? "text-4xl md:text-5xl" : "text-xl";

  const content = (
    <>
      <style>{`
        @keyframes logo-head-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .logo-head-bounce {
          transform-origin: center center;
          animation: logo-head-bounce 0.5s ease-out 2 both;
        }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden
      >
        {/* Podium: 2nd (left), 1st (center), 3rd (right) */}
        <path
          d="M2 20h8v10H2V20z"
          fill="currentColor"
          opacity="0.5"
        />
        <path
          d="M12 14h8v16h-8V14z"
          fill="var(--accent)"
        />
        <path
          d="M22 18h8v12h-8V18z"
          fill="currentColor"
          opacity="0.5"
        />
        {/* 3 boules (têtes) dans un <g> pour que le bounce CSS s’applique correctement */}
        <circle cx="6" cy="16" r="2.5" fill="currentColor" className="logo-head-bounce" style={{ animationDelay: "0s" }} />
        <path d="M5.2 17.8a1 1 0 001.6 0" stroke="currentColor" strokeWidth="0.6" fill="none" strokeLinecap="round" />
        <path d="M4 15.2l-1 .8M8 15.2l1 .8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
        <circle cx="16" cy="10" r="2.8" fill="currentColor" className="logo-head-bounce" style={{ animationDelay: "0.1s" }} />
        <path d="M14.8 11.9a1.2 1.2 0 002.4 0" stroke="currentColor" strokeWidth="0.6" fill="none" strokeLinecap="round" />
        <path d="M13.2 9.5l-1.2 .8M18.8 9.5l1.2 .8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
        <circle cx="26" cy="15" r="2.5" fill="currentColor" className="logo-head-bounce" style={{ animationDelay: "0.2s" }} />
        <path d="M25.2 16.8a1 1 0 001.6 0" stroke="currentColor" strokeWidth="0.6" fill="none" strokeLinecap="round" />
        <path d="M24 14.2l-1 .8M28 14.2l1 .8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      </svg>
      <span className={`font-bold text-[var(--foreground)] ${textSize}`}>
        Champ
      </span>
    </>
  );

  const className = "flex items-center gap-2";
  if (link) {
    return (
      <Link href="/" className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
