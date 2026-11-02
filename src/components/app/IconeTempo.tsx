import { Cloud, CloudLightning, CloudRain, CloudSun, Sun } from "lucide-react";
import { tipoDeTempo } from "@/lib/geo";

export function IconeTempo({ codigo, size = 18, className = "" }: { codigo: number; size?: number; className?: string }) {
  const t = tipoDeTempo(codigo);
  const Icone = t === "sol" ? Sun : t === "nuvens" ? CloudSun : t === "nublado" ? Cloud : t === "trovoada" ? CloudLightning : CloudRain;
  return <Icone size={size} className={className} aria-hidden />;
}
