type Props = {
  /** Full `https://calendar.google.com/calendar/embed?...` URL */
  src: string;
  title: string;
};

/**
 * Google-hosted calendar week view. Requires the calendar to be embeddable
 * (Google account settings); otherwise the iframe may prompt to sign in or stay empty.
 */
export function GoogleCalendarEmbed({ src, title }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <iframe
        title={title}
        src={src}
        className="h-[min(70vh,720px)] w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
