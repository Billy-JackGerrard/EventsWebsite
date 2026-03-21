import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import type { Section } from "../utils/types";
import "./AdminHome.css";

type HomeContent = {
  hero: {
    headline: string;
    subtitle: string;
  };
  sections: Section[];
};

type Props = {
  onSaved: () => void;
  onCancel: () => void;
};

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export default function AdminHome({ onSaved, onCancel }: Props) {
  const [headline, setHeadline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [aboutSections, setAboutSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resizeAll = useCallback(() => {
    containerRef.current?.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(autoResize);
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.from("site_content").select("content").eq("key", "home").single(),
      supabase.from("site_content").select("content").eq("key", "about_us").single(),
    ]).then(([homeRes, aboutRes]) => {
      if (homeRes.error) setError("Failed to load content. Please try refreshing.");
      else if (homeRes.data) {
        const c = homeRes.data.content as HomeContent;
        setHeadline(c.hero?.headline ?? "");
        setSubtitle(c.hero?.subtitle ?? "");
        setSections(c.sections ?? []);
      }
      if (aboutRes.data) {
        setAboutSections((aboutRes.data.content as { sections: Section[] }).sections ?? []);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading) resizeAll();
  }, [loading, resizeAll]);

  useEffect(() => { resizeAll(); }, [sections, resizeAll]);
  useEffect(() => { resizeAll(); }, [aboutSections, resizeAll]);

  /* ── Home section helpers ── */
  const updateTitle = (i: number, value: string) => {
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, title: value } : s));
  };

  const updateParagraph = (sIdx: number, pIdx: number, value: string) => {
    setSections(prev => prev.map((s, idx) =>
      idx === sIdx ? { ...s, paragraphs: s.paragraphs.map((p, j) => j === pIdx ? value : p) } : s
    ));
  };

  const addParagraph = (sIdx: number) => {
    setSections(prev => prev.map((s, idx) =>
      idx === sIdx ? { ...s, paragraphs: [...s.paragraphs, ""] } : s
    ));
  };

  const removeParagraph = (sIdx: number, pIdx: number) => {
    setSections(prev => prev.map((s, idx) =>
      idx === sIdx ? { ...s, paragraphs: s.paragraphs.filter((_, j) => j !== pIdx) } : s
    ));
  };

  const removeSection = (i: number) => {
    setSections(prev => prev.filter((_, idx) => idx !== i));
  };

  const addSection = () => {
    setSections(prev => [...prev, { title: "", paragraphs: [""] }]);
  };

  /* ── About section helpers ── */
  const updateAboutTitle = (i: number, value: string) => {
    setAboutSections(prev => prev.map((s, idx) => idx === i ? { ...s, title: value } : s));
  };

  const updateAboutParagraph = (sIdx: number, pIdx: number, value: string) => {
    setAboutSections(prev => prev.map((s, idx) =>
      idx === sIdx ? { ...s, paragraphs: s.paragraphs.map((p, j) => j === pIdx ? value : p) } : s
    ));
  };

  const addAboutParagraph = (sIdx: number) => {
    setAboutSections(prev => prev.map((s, idx) =>
      idx === sIdx ? { ...s, paragraphs: [...s.paragraphs, ""] } : s
    ));
  };

  const removeAboutParagraph = (sIdx: number, pIdx: number) => {
    setAboutSections(prev => prev.map((s, idx) =>
      idx === sIdx ? { ...s, paragraphs: s.paragraphs.filter((_, j) => j !== pIdx) } : s
    ));
  };

  const removeAboutSection = (i: number) => {
    setAboutSections(prev => prev.filter((_, idx) => idx !== i));
  };

  const addAboutSection = () => {
    setAboutSections(prev => [...prev, { title: "", paragraphs: [""] }]);
  };

  /* ── Save both content entries ── */
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const homeContent: HomeContent = {
      hero: { headline, subtitle },
      sections,
    };
    const now = new Date().toISOString();
    const [homeResult, aboutResult] = await Promise.all([
      supabase.from("site_content").upsert({ key: "home", content: homeContent, updated_at: now }),
      supabase.from("site_content").upsert({ key: "about_us", content: { sections: aboutSections }, updated_at: now }),
    ]);
    setSaving(false);
    if (homeResult.error || aboutResult.error) {
      setError("Failed to save. Please try again.");
      return;
    }
    onSaved();
  };

  return (
    <div className="admin-home-page">
      <div className="admin-home-container" ref={containerRef}>
        <h2 className="admin-home-title">Edit Home &amp; About</h2>

        {error && <div className="form-error" role="alert">{error}</div>}

        {loading ? (
          <p className="admin-home-loading">Loading…</p>
        ) : (
          <>
            {/* ── Hero ── */}
            <div className="admin-home-section">
              <h3 className="admin-home-section-label">Hero</h3>
              <div className="admin-home-field">
                <label className="admin-home-label">Headline</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Main headline"
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                />
              </div>
              <div className="admin-home-field">
                <label className="admin-home-label">Subtitle</label>
                <textarea
                  className="form-input admin-home-textarea"
                  placeholder="Subtitle text (use **bold** for bold)"
                  value={subtitle}
                  onChange={e => {
                    autoResize(e.target);
                    setSubtitle(e.target.value);
                  }}
                />
              </div>
            </div>

            {/* ── Home Sections ── */}
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="admin-home-section">
                <div className="admin-home-section-header">
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Section title"
                    value={section.title}
                    onChange={e => updateTitle(sIdx, e.target.value)}
                  />
                  <button
                    className="admin-home-remove-section-btn"
                    onClick={() => removeSection(sIdx)}
                  >
                    Remove section
                  </button>
                </div>

                {section.paragraphs.map((para, pIdx) => (
                  <div key={pIdx} className="admin-home-para-row">
                    <textarea
                      className="form-input admin-home-textarea"
                      value={para}
                      placeholder="Paragraph text (use **bold** for bold)"
                      onChange={e => {
                        autoResize(e.target);
                        updateParagraph(sIdx, pIdx, e.target.value);
                      }}
                    />
                    <button
                      className="admin-home-remove-para-btn"
                      onClick={() => removeParagraph(sIdx, pIdx)}
                      title="Remove paragraph"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button className="admin-home-add-para-btn" onClick={() => addParagraph(sIdx)}>
                  + Add paragraph
                </button>
              </div>
            ))}

            <button className="admin-home-add-section-btn" onClick={addSection}>
              + Add section
            </button>

            {/* ── About Us divider ── */}
            <div className="admin-home-divider">
              <span>About Us</span>
            </div>

            {/* ── About Sections ── */}
            {aboutSections.map((section, sIdx) => (
              <div key={`about-${sIdx}`} className="admin-home-section">
                <div className="admin-home-section-header">
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Section title"
                    value={section.title}
                    onChange={e => updateAboutTitle(sIdx, e.target.value)}
                  />
                  <button
                    className="admin-home-remove-section-btn"
                    onClick={() => removeAboutSection(sIdx)}
                  >
                    Remove section
                  </button>
                </div>

                {section.paragraphs.map((para, pIdx) => (
                  <div key={pIdx} className="admin-home-para-row">
                    <textarea
                      className="form-input admin-home-textarea"
                      value={para}
                      placeholder="Paragraph text (use **bold** for bold)"
                      onChange={e => {
                        autoResize(e.target);
                        updateAboutParagraph(sIdx, pIdx, e.target.value);
                      }}
                    />
                    <button
                      className="admin-home-remove-para-btn"
                      onClick={() => removeAboutParagraph(sIdx, pIdx)}
                      title="Remove paragraph"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button className="admin-home-add-para-btn" onClick={() => addAboutParagraph(sIdx)}>
                  + Add paragraph
                </button>
              </div>
            ))}

            <button className="admin-home-add-section-btn" onClick={addAboutSection}>
              + Add about section
            </button>

            {/* ── Actions ── */}
            <div className="admin-home-actions">
              <button className="admin-home-cancel-btn" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
              <button className="admin-home-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <span className="btn-loading">
                    <span className="btn-spinner" aria-hidden="true" />
                    Saving…
                  </span>
                ) : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
