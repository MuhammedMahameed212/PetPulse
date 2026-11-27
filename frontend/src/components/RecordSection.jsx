import React, { useState } from "react";

/**
 * A section of the pet page whose title opens and closes it (closed at first).
 * `action` (e.g. an "Add" button) shows next to the title only while the section is open.
 */
export default function RecordSection({ id, title, action, children }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="med-section" aria-labelledby={`${id}-title`}>
      <div className="med-head">
        <h3 id={`${id}-title`} className="pet-records-title">
          <button type="button" className="section-toggle" aria-expanded={open} aria-controls={`${id}-body`}
            onClick={() => setOpen(!open)}>
            <span className="section-chevron" aria-hidden="true" />
            {title}
          </button>
        </h3>
        {open && action}
      </div>
      {/* kept mounted while closed, so the list is already loaded when it opens */}
      <div id={`${id}-body`} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
