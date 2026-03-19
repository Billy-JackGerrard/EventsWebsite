import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import type { Section } from "../utils/types";
import { useInView } from "../hooks/useInView";
import "./Home.css";

type HomeContent = {
  hero: { headline: string; subtitle: string };
  sections: Section[];
};

type AboutContent = {
  sections: Section[];
};

type Props = {
  isLoggedIn: boolean;
  onEdit: () => void;
  onNavigate: (view: "calendar") => void;
};

function renderParagraph(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

/* ── Feature card — slides in from alternating sides ── */
function FeatureCard({ section, index }: { section: Section; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.12 });
  const dir = index % 2 === 0 ? "left" : "right";
  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className={`home-feature-card scroll-reveal-slide-${dir}${isInView ? " in-view" : ""}`}
      style={{ transitionDelay: `${index * 0.08}s` }}
    >
      <div className="home-feature-accent" />
      <div className="home-feature-content">
        <h3 className="home-feature-title">{section.title}</h3>
        {section.paragraphs.map((para, j) => (
          <p key={j} className="home-feature-text">{renderParagraph(para)}</p>
        ))}
      </div>
    </section>
  );
}

/* ── About card — fades up with stagger ── */
function AboutCard({ section, index }: { section: Section; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.12 });
  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={`home-about-card scroll-reveal${isInView ? " in-view" : ""}`}
      style={{ transitionDelay: `${index * 0.1}s` }}
    >
      <h3 className="home-about-card-title">{section.title}</h3>
      {section.paragraphs.map((para, j) => (
        <p key={j} className="home-about-card-text">{renderParagraph(para)}</p>
      ))}
    </div>
  );
}

/* ── About section header ── */
function AboutHeader() {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={`home-about-header scroll-reveal${isInView ? " in-view" : ""}`}>
      <span className="home-about-label">About Us</span>
      <h2 className="home-about-title">Our Community</h2>
      <div className="home-about-divider" />
    </div>
  );
}

/* ── Bottom CTA band ── */
function BottomCTA({ onNavigate }: { onNavigate: () => void }) {
  const { ref, isInView } = useInView({ threshold: 0.25 });
  return (
    <div className="home-bottom-cta">
      <div className="home-bottom-cta-bg">
        <div className="home-hero-orb home-hero-orb--1" />
        <div className="home-hero-orb home-hero-orb--2" />
      </div>
      <div className="home-bottom-cta-mesh" />
      <div ref={ref as React.Ref<HTMLDivElement>} className={`home-bottom-cta-inner scroll-reveal${isInView ? " in-view" : ""}`}>
        <h2 className="home-bottom-cta-title">Ready to explore?</h2>
        <p className="home-bottom-cta-text">Discover BSL events happening in Edinburgh</p>
        <button className="home-cta-btn home-cta-btn--light" onClick={onNavigate}>
          <span>Browse Events</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function Home({ isLoggedIn, onEdit, onNavigate }: Props) {
  const [homeContent, setHomeContent] = useState<HomeContent | null>(null);
  const [aboutContent, setAboutContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  /* Fetch both home + about_us content */
  useEffect(() => {
    Promise.all([
      supabase.from("site_content").select("content").eq("key", "home").single(),
      supabase.from("site_content").select("content").eq("key", "about_us").single(),
    ]).then(([homeRes, aboutRes]) => {
      if (homeRes.error && aboutRes.error) setFetchError(true);
      if (homeRes.data) setHomeContent(homeRes.data.content as HomeContent);
      if (aboutRes.data) setAboutContent(aboutRes.data.content as AboutContent);
      setLoading(false);
    });
  }, []);

  /* Subtle parallax fade for hero content on scroll */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const onScroll = () => {
      const y = window.scrollY;
      hero.style.setProperty("--scroll-y", `${y * 0.3}px`);
      hero.style.setProperty("--scroll-opacity", `${Math.max(0, 1 - y / 600)}`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="home-page">
        <div className="home-hero" ref={heroRef}>
          <div className="home-hero-bg"><div className="home-hero-mesh" /></div>
          <div className="home-hero-inner">
            <div className="home-loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (fetchError) {
    return (
      <div className="home-page">
        <div className="home-hero" ref={heroRef}>
          <div className="home-hero-bg"><div className="home-hero-mesh" /></div>
          <div className="home-hero-inner">
            <p className="home-error">Failed to load content. Please try refreshing.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="home-page">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="home-hero" ref={heroRef}>
        <div className="home-hero-bg">
          <div className="home-hero-orb home-hero-orb--1" />
          <div className="home-hero-orb home-hero-orb--2" />
          <div className="home-hero-orb home-hero-orb--3" />
          <div className="home-hero-mesh" />
        </div>

        {isLoggedIn && (
          <button className="home-edit-btn" onClick={onEdit}>Edit</button>
        )}

        <div className="home-hero-inner">
          <h1 className="home-headline">
            <span className="home-headline-shimmer">
              {homeContent?.hero.headline || "Welcome"}
            </span>
          </h1>
          {homeContent?.hero.subtitle && (
            <p className="home-subtitle">{renderParagraph(homeContent.hero.subtitle)}</p>
          )}
          <button className="home-cta-btn" onClick={() => onNavigate("calendar")}>
            <span>Browse Events</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="home-scroll-indicator" aria-hidden="true">
          <div className="home-scroll-dot" />
        </div>
      </div>

      {/* ── Content Sections ─────────────────────────────── */}
      {homeContent?.sections && homeContent.sections.length > 0 && (
        <div className="home-sections">
          <div className="home-sections-container">
            {homeContent.sections.map((section, i) => (
              <FeatureCard key={i} section={section} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── About Us ─────────────────────────────────────── */}
      {aboutContent?.sections && aboutContent.sections.length > 0 && (
        <div className="home-about">
          <div className="home-about-container">
            <AboutHeader />
            <div className="home-about-grid">
              {aboutContent.sections.map((section, i) => (
                <AboutCard key={i} section={section} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom CTA ───────────────────────────────────── */}
      <BottomCTA onNavigate={() => onNavigate("calendar")} />
    </div>
  );
}
