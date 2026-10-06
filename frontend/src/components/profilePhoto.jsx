import { useState } from "react";

const initials = name =>
  String(name || "Tutor")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(x => x[0])
    .join("")
    .toUpperCase();

export default function ProfilePhoto({ src, name, size = 78, verified = false, className = "" }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const hasImage = !!src && !broken;

  const click = e => {
    e?.stopPropagation?.();
    if (hasImage) setOpen(true);
  };

  return <>
    <button
      type="button"
      className={`round-profile-photo ${className}`}
      style={{ width:size, height:size }}
      onClick={click}
      aria-label={hasImage ? `View ${name}'s profile photo` : `${name} profile`}
    >
      {hasImage
        ? <img src={src} alt={name || "Tutor"} onError={() => setBroken(true)} />
        : <span>{initials(name)}</span>}
      {verified && <i className="photo-verified" title="Verified tutor">✓</i>}
    </button>

    {open && <div className="photo-modal" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
      <button className="photo-modal-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
      <img src={src} alt={name || "Tutor"} onClick={e => e.stopPropagation()} />
      <b>{name}</b>
    </div>}
  </>;
}
