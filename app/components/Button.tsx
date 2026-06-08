import Link from "next/link";

type Props = {
  variant?: "primary" | "secondary";
  href?: string;
  size?: "default" | "lg";
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

const BASE =
  "inline-flex items-center justify-center font-sans font-semibold rounded-full transition-colors no-underline";

const SIZE = {
  default: "px-8 py-3.5 text-base",
  lg:      "px-10 py-4 text-lg",
};

const VARIANT = {
  primary:   "bg-green text-sand hover:bg-green-deep",
  secondary: "bg-transparent text-clay border border-[1.5px] border-clay hover:bg-clay hover:text-sand",
};

export default function Button({
  variant = "primary",
  href,
  size = "default",
  children,
  className = "",
  onClick,
  disabled,
}: Props) {
  const cls = `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`.trim();

  if (href) {
    return <Link href={href} className={cls}>{children}</Link>;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${cls} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
