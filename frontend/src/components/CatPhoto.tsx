type Props = { name: string; url: string | null; className: string; emojiClass: string };

/** A cat's photo, or the 🐈 placeholder while it has none. */
export function CatPhoto({ name, url, className, emojiClass }: Props) {
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-amber-100 ${className} ${emojiClass}`} aria-hidden>
        🐈
      </div>
    );
  }
  return <img src={url} alt={`Photo of ${name}`} loading="lazy" className={`object-cover ${className}`} />;
}
