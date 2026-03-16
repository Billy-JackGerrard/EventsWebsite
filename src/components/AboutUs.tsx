import "./AboutUs.css";

export default function AboutUs() {
  return (
    <div className="about-page">
      <div className="page-card about-card">

        <h2 className="about-title">About Us</h2>

        <section className="about-section">
          <h3 className="about-section-title">Who Are We?</h3>
          <p className="about-body">
            Edinburgh BSL Community Events is an independent community platform — not affiliated with
            any organisation, charity, or governing body. It was created by a Deaf person to make it
            easier for the BSL and Deaf community in Edinburgh to find and share events in one place.
          </p>
          <p className="about-body">
            We're a small, volunteer-run group with no formal structure. We're just people who wanted
            a simple, community-owned space to raise awareness of local events — BSL classes, social
            meetups, Deaf-led performances, interpreting workshops, and anything else the community
            might find useful.
          </p>
        </section>

        <section className="about-section">
          <h3 className="about-section-title">What We're Here For</h3>
          <p className="about-body">
            This site exists so that events can be shared with the wider BSL and Deaf community in
            Edinburgh, and so that community members can discover what's going on around them. Anyone
            can submit an event for consideration — we just review submissions before they go live to
            keep things relevant and appropriate.
          </p>
        </section>

        <section className="about-section">
          <h3 className="about-section-title">Disclaimer</h3>
          <p className="about-body">
            We are a platform, not a publisher. The events listed on this site are submitted by
            organisers and community members, and we do not independently verify the accuracy of
            event details such as dates, times, locations, prices, or descriptions.
          </p>
          <p className="about-body">
            <strong>Responsibility for the accuracy and content of any event listing lies solely
            with the person or organisation who submitted it.</strong> We are not liable for any
            misinformation, changes, cancellations, or issues arising from events listed here.
            Always check directly with the event organiser before attending.
          </p>
          <p className="about-body">
            If you spot an error or have a concern about a listing, please use the{" "}
            <span className="about-inline-link">Contact</span> page to let us know.
          </p>
        </section>

      </div>
    </div>
  );
}
