import "./PrivacyPolicy.css";

export default function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      <div className="page-card privacy-card">

        <h2 className="privacy-title">Privacy Policy</h2>
        <p className="privacy-updated">Last updated: March 2026</p>

        <section className="privacy-section">
          <h3 className="privacy-section-title">Who we are</h3>
          <p className="privacy-body">
            Edinburgh BSL Community Events is a volunteer-run community platform for the BSL and
            Deaf community in Edinburgh. We are not affiliated with any organisation or charity.
            For questions about your data, use the{" "}
            <span className="privacy-inline-note">Contact</span> page.
          </p>
        </section>

        <section className="privacy-section">
          <h3 className="privacy-section-title">What data we collect</h3>
          <p className="privacy-body">We collect data in two ways:</p>
          <ul className="privacy-list">
            <li>
              <strong>Event submissions</strong> — when someone submits an event, we store the
              event details provided: title, description, location, dates, contact name, and
              contact email. This information is reviewed by an admin and, if approved, displayed
              publicly on the calendar.
            </li>
            <li>
              <strong>Contact messages</strong> — when you use the contact form, we store your
              message, the message type (general, bug, or suggestion), and optionally your name.
              We do not require or store your email address unless you choose to include it in
              your message.
            </li>
          </ul>
          <p className="privacy-body">
            We do not use cookies, analytics, tracking pixels, or any third-party tracking tools.
          </p>
        </section>

        <section className="privacy-section">
          <h3 className="privacy-section-title">Why we collect it</h3>
          <ul className="privacy-list">
            <li>Event submission data is collected to operate the community events calendar.</li>
            <li>Contact messages are collected to respond to enquiries and improve the site.</li>
          </ul>
          <p className="privacy-body">
            Our legal basis is <strong>legitimate interests</strong> — operating a community
            resource for the BSL and Deaf community in Edinburgh.
          </p>
        </section>

        <section className="privacy-section">
          <h3 className="privacy-section-title">How long we keep it</h3>
          <ul className="privacy-list">
            <li>Approved event listings are kept until they are deleted by an admin or the event organiser requests removal.</li>
            <li>Rejected or unapproved submissions are deleted periodically.</li>
            <li>Contact messages are kept for a reasonable period to allow follow-up, then deleted.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h3 className="privacy-section-title">Who can see it</h3>
          <ul className="privacy-list">
            <li>Approved event details (including organiser contact info) are visible to all visitors.</li>
            <li>Unapproved submissions and contact messages are only accessible to site admins.</li>
            <li>We do not sell, share, or transfer your data to third parties.</li>
          </ul>
          <p className="privacy-body">
            Our data is stored securely using{" "}
            <a className="privacy-link" href="https://supabase.com" target="_blank" rel="noopener noreferrer">
              Supabase
            </a>
            , which provides PostgreSQL hosting within the EU.
          </p>
        </section>

        <section className="privacy-section">
          <h3 className="privacy-section-title">Your rights</h3>
          <p className="privacy-body">
            Under UK GDPR you have the right to access, correct, or request deletion of any
            personal data we hold about you. To exercise these rights, contact us via the{" "}
            <span className="privacy-inline-note">Contact</span> page. We will respond within
            30 days.
          </p>
        </section>

      </div>
    </div>
  );
}
