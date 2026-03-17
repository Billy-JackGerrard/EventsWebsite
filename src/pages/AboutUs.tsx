import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./AboutUs.css";

type Section = {
  title: string;
  paragraphs: string[];
};

type AboutContent = {
  sections: Section[];
};

function renderParagraph(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

type Props = {
  isLoggedIn: boolean;
  onEdit: () => void;
};

export default function AboutUs({ isLoggedIn, onEdit }: Props) {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("content")
      .eq("key", "about_us")
      .single()
      .then(({ data }) => {
        setContent(data ? (data.content as AboutContent) : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="about-page">
      <div className="page-card about-card">

        <div className="about-header">
          <h2 className="about-title">About Us</h2>
          {isLoggedIn && (
            <button className="about-edit-btn" onClick={onEdit}>Edit</button>
          )}
        </div>

        {loading ? (
          <p className="about-body">Loading…</p>
        ) : !content || content.sections.length === 0 ? (
          <p className="about-body about-empty">No content yet.</p>
        ) : (
          content.sections.map((section, i) => (
            <section key={i} className="about-section">
              <h3 className="about-section-title">{section.title}</h3>
              {section.paragraphs.map((para, j) => (
                <p key={j} className="about-body">
                  {renderParagraph(para)}
                </p>
              ))}
            </section>
          ))
        )}

      </div>
    </div>
  );
}
