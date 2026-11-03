import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Link vindo de fora (banco, IA, API): só abre se for http(s); nada de "javascript:"
export function urlSegura(url: string | null | undefined): string | null {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}
