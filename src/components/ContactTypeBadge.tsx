import { CONTACT_TYPE_LABELS, CONTACT_TYPE_BADGE_STYLES } from "../utils/contactConfig";
import type { ContactType } from "../utils/types";

export default function ContactTypeBadge({ type }: { type: ContactType }) {
  return (
    <span className="contact-type-badge" style={CONTACT_TYPE_BADGE_STYLES[type]}>
      {CONTACT_TYPE_LABELS[type]}
    </span>
  );
}
