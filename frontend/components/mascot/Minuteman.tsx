import Image from "next/image";

type Props = {
  size?: number;
  watch?: boolean;
  greet?: boolean;
  className?: string;
  label?: string;
};

export function Minuteman({ size = 160, className = "", label = "Sam the Minuteman" }: Props) {
  return (
    <Image
      src="/mascots/sam-minuteman-3d.png"
      alt={label}
      width={1024}
      height={1536}
      sizes={`${size}px`}
      className={`select-none object-contain ${className}`}
      style={{ width: size, height: size * 1.2 }}
    />
  );
}
