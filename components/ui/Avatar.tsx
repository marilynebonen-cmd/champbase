"use client";

/**
 * Photo de profil : image ou initiales (prénom/nom ou displayName).
 */
export function Avatar({
  photoURL,
  displayName,
  firstName,
  lastName,
  size = "md",
  className = "",
}: {
  photoURL?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-24 h-24 text-2xl",
  };
  const initials =
    [firstName, lastName].filter(Boolean).length > 0
      ? [firstName, lastName]
          .map((s) => (s ?? "").trim().charAt(0))
          .join("")
          .toUpperCase()
          .slice(0, 2) || (displayName ?? "").trim().slice(0, 2).toUpperCase()
      : (displayName ?? "").trim().slice(0, 2).toUpperCase() || "?";

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[var(--card-border)] text-[var(--muted)] font-semibold ${sizeClasses[size]} ${className}`}
      aria-hidden
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials || "?"}</span>
      )}
    </div>
  );
}
