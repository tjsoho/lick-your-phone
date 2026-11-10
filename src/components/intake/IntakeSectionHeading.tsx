interface IntakeSectionHeadingProps {
  section: string;
  /** Says what the section is for, so "Access Audit" is not a mystery. */
  subtitle?: string | null;
}

/**
 * The heading that opens a block of onboarding questions.
 *
 * Lifted out of the form so the dashboard's two previews draw the client's
 * own heading rather than an admin's impression of it. The agency could not
 * picture "section" and "section subtitle" from the field names alone, and a
 * second copy of this markup would have drifted the first time either one
 * changed.
 *
 * No entry animation of its own: the form wraps this in a `Reveal` with its
 * place in the page's reading order, and a preview has no cascade to join.
 */
export default function IntakeSectionHeading({
  section,
  subtitle,
}: IntakeSectionHeadingProps) {
  return (
    <>
      <h2 className="font-heading text-2xl text-lyp-white md:text-3xl">
        {section}
      </h2>
      {subtitle && (
        <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-lyp-white/50">
          {subtitle}
        </p>
      )}
    </>
  );
}
