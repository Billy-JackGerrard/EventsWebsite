import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
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

/* ── Animated counter ── */
function AnimatedNumber({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const { ref, isInView } = useInView({ threshold: 0.5 });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1800;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.floor(eased * target);
      setCount(start);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return <span ref={ref as React.Ref<HTMLSpanElement>}>{count}+</span>;
}

/* ── Feature card icons ── */
const featureIcons = [
  /* Calendar / events */
  <svg key="cal" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  /* People / community */
  <svg key="ppl" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  /* Map pin / location */
  <svg key="loc" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  /* Heart / inclusion */
  <svg key="hrt" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  /* Star */
  <svg key="star" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  /* Book / learning */
  <svg key="book" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
];

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
        <div className="home-feature-icon">
          {featureIcons[index % featureIcons.length]}
        </div>
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
      <span className="home-about-card-number">{String(index + 1).padStart(2, "0")}</span>
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

/* ── Stats bar ── */
function StatsBar() {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const stats = [
    { number: 100, label: "Events Hosted" },
    { number: 500, label: "Community Members" },
    { number: 20, label: "Venues across Edinburgh" },
  ];

  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={`home-stats scroll-reveal${isInView ? " in-view" : ""}`}>
      <div className="home-stats-inner">
        {stats.map((stat, i) => (
          <div key={i} className="home-stat">
            <span className="home-stat-number">
              <AnimatedNumber target={stat.number} />
            </span>
            <span className="home-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
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
        <span className="home-bottom-cta-badge">Join the community</span>
        <h2 className="home-bottom-cta-title">Ready to explore?</h2>
        <p className="home-bottom-cta-text">Discover BSL events happening in Edinburgh and become part of something special.</p>
        <div className="home-cta-group">
          <button className="home-cta-btn home-cta-btn--light" onClick={onNavigate}>
            <span>Browse Events</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
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

  /* Parallax — scroll-linked transforms on hero orbs and content */
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const orb1Y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const orb2Y = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const orb3Y = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroContentY = useTransform(scrollYProgress, [0, 0.6], [0, -35]);

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
          <motion.div style={{ y: orb1Y, position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div className="home-hero-orb home-hero-orb--1" />
          </motion.div>
          <motion.div style={{ y: orb2Y, position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div className="home-hero-orb home-hero-orb--2" />
          </motion.div>
          <motion.div style={{ y: orb3Y, position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div className="home-hero-orb home-hero-orb--3" />
          </motion.div>
          <div className="home-hero-mesh" />
        </div>

        {isLoggedIn && (
          <button className="home-edit-btn" onClick={onEdit}>Edit</button>
        )}

        <motion.div
          className="home-hero-inner"
          style={{ opacity: heroOpacity, y: heroContentY }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="home-hero-badge">
            <span className="home-hero-badge-dot" />
            Edinburgh BSL Community
          </span>
          <h1 className="home-headline">
            <span className="home-headline-shimmer">
              {homeContent?.hero.headline || "Welcome"}
            </span>
          </h1>
          {homeContent?.hero.subtitle && (
            <p className="home-subtitle">{renderParagraph(homeContent.hero.subtitle)}</p>
          )}
          <div className="home-cta-group">
            <button className="home-cta-btn home-cta-btn--solid" onClick={() => onNavigate("calendar")}>
              <span>Browse Events</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="home-cta-btn" onClick={() => {
              document.querySelector('.home-about')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <span>Learn More</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 4v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </motion.div>

        <div className="home-scroll-indicator" aria-hidden="true">
          <div className="home-scroll-dot" />
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────── */}
      <StatsBar />

      {/* ── Content Sections ─────────────────────────────── */}
      {homeContent?.sections && homeContent.sections.length > 0 && (
        <div className="home-sections">
          <div className="home-sections-header scroll-reveal">
            <span className="home-sections-label">What We Offer</span>
            <h2 className="home-sections-title">Everything you need</h2>
          </div>
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
