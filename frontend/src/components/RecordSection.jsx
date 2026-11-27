import React, { useEffect, useRef, useState } from "react";

/**
 * A section of the pet page whose title opens and closes it (closed at first).
 * `action` (e.g. an "Add" button) shows next to the title only while the section is open.
 * `onOpen` runs each time the section opens.
 * A link to `#<id>-section` (e.g. from the medical file) opens the section and scrolls to it.
 */
export default function RecordSection({ id, title, action, onOpen, children }) {
  const [open, setOpen] = useState(false);
  const sectionRef = useRef(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  function toggle() {
    if (!open) onOpenRef.current?.();
    setOpen(!open);
  }

  useEffect(() => {
    function openFromLink() {
      if (window.location.hash !== `#${id}-section`) return;
      onOpenRef.current?.();
      setOpen(true);
      // clear the hash so the same link works again, and another pet's page doesn't open this section
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    window.addEventListener("hashchange", openFromLink);
    return () => window.removeEventListener("hashchange", openFromLink);
  }, [id]);

  return (
    <section ref={sectionRef} id={`${id}-section`} className="med-section" aria-labelledby={`${id}-title`}>
      <div className="med-head">
        <h3 id={`${id}-title`} className="pet-records-title">
          <button type="button" className="section-toggle" aria-expanded={open} aria-controls={`${id}-body`} onClick={toggle}>
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
