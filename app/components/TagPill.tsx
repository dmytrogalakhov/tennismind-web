export default function TagPill({
  tag,
  textColor,
  background,
  border,
}: {
  tag: string;
  textColor?: string;
  background?: string;
  border?: string;
}) {
  return (
    <span style={{
      fontFamily: "var(--font-sans), system-ui, sans-serif",
      fontSize: 11,
      fontWeight: 500,
      color: textColor ?? "var(--color-green)",
      background: background ?? "var(--color-sand)",
      borderRadius: "999px",
      padding: "2px 8px",
      display: "inline-block",
      border: border ?? "none",
    }}>
      {tag}
    </span>
  );
}
