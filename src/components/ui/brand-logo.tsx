"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: number;
  alt?: string;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ size = 24, alt = "BossFit", className, priority = false }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      <Image src="/icon-512.png" alt={alt} width={size} height={size} className="bossfit-logo-light object-contain" priority={priority} />
      <Image
        src="/icon-512sinfondo.png"
        alt={alt}
        width={size}
        height={size}
        className="bossfit-logo-dark object-contain"
        priority={priority}
      />
    </span>
  );
}
