import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import type { Section } from "../utils/types";
import "./AdminAboutUs.css";

type Props = {
  onSaved: () => void;
  onCancel: () => void;
};

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export default function AdminAboutUs({ onSaved, onCancel }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resizeAll = useCallback(() => {
    containerRef.current?.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(autoResize);
  }, []);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("content")
      .eq("key", "about_us")
      .single()
      .then(({ data, error }) => {
        if (error) setError("Failed to load content. Please try refreshing.");
        else if (data) setSections((data.content as { sections: Section[] }).sections);
        setLoading(false);
      });
  }, []);

  // Resize all textareas once content has loaded into the DOM
  useEffect(() => {
    if (!loading) resizeAll();
  }, [loading, resizeAll]);

  // Resize all textareas whenever sections change (e.g. after adding/removing)
  useEffect(() => {
    resizeAll();
  }, [sections, resizeAll]);

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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: dbError } = await supabase
      .from("site_content")
      .upsert({ key: "about_us", content: { sections }, updated_at: new Date().toISOString() });
    setSaving(false);
    if (dbError) {
      setError("Failed to save. Please try again.");
      return;
    }
    onSaved();
  };

  return (
    <div className="admin-about-page">
      <div className="admin-about-container" ref={containerRef}>
        <h2 className="admin-about-title">Edit About Us</h2>

        {error && <div className="form-error" role="alert">{error}</div>}

        {loading ? (
          <p className="admin-about-loading">Loading…</p>
        ) : (
          <>
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="admin-about-section">
                <div className="admin-about-section-header">
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Section title"
                    value={section.title}
                    onChange={e => updateTitle(sIdx, e.target.value)}
                  />
                  <button
                    className="admin-about-remove-section-btn"
                    onClick={() => removeSection(sIdx)}
                  >
                    Remove section
                  </button>
                </div>

                {section.paragraphs.map((para, pIdx) => (
                  <div key={pIdx} className="admin-about-para-row">
                    <textarea
                      className="form-input admin-about-textarea"
                      value={para}
                      placeholder="Paragraph text (use **bold** for bold)"
                      onChange={e => {
                        autoResize(e.target);
                        updateParagraph(sIdx, pIdx, e.target.value);
                      }}
                    />
                    <button
                      className="admin-about-remove-para-btn"
                      onClick={() => removeParagraph(sIdx, pIdx)}
                      title="Remove paragraph"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button className="admin-about-add-para-btn" onClick={() => addParagraph(sIdx)}>
                  + Add paragraph
                </button>
              </div>
            ))}

            <button className="admin-about-add-section-btn" onClick={addSection}>
              + Add section
            </button>

            <div className="admin-about-actions">
              <button className="admin-about-cancel-btn" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
              <button className="admin-about-save-btn" onClick={handleSave} disabled={saving}>
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
