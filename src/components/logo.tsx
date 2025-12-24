import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "icon";
}

export function Logo({ className, variant = "full" }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {variant === "full" ? (
        <>
          {/* Light */}
          <Image
            src="/brand/logo.svg"
            alt="Platoo"
            width={160}
            height={40}
            priority
            className="h-10 w-auto dark:hidden"
          />

          {/* Dark */}
          <Image
            src="/brand/logo-white.svg"
            alt="Platoo"
            width={160}
            height={40}
            priority
            className="hidden h-10 w-auto dark:block"
          />
        </>
      ) : (
        <>
          {/* Light */}
          <Image
            src="/brand/logo-icon.svg"
            alt="Platoo"
            width={36}
            height={36}
            className="h-9 w-9 dark:hidden"
          />

          {/* Dark */}
          <Image
            src="/brand/logo-icon-white.svg"
            alt="Platoo"
            width={36}
            height={36}
            className="hidden h-13 w-13 dark:block"
          />
        </>
      )}
    </div>
  );
}
