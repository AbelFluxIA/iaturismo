import { Navigate, useParams } from "react-router-dom";
import { guardarConvite } from "@/lib/convite";

// Link de convite: guarda o código e leva para o app. Quem já tem conta só abre o app
// (sem benefício, RA-IND-02); quem é novo vê o aviso na tela de entrada.
export default function Convite() {
  const { codigo } = useParams();
  let logado = false;
  try { logado = !!localStorage.getItem("sol_client_token"); } catch { /* sem armazenamento */ }
  if (logado) return <Navigate to="/app" replace />;
  if (codigo) guardarConvite(codigo);
  return <Navigate to="/app/entrar" replace state={{ aviso: "Você foi convidado para a Sol! Entre com o seu WhatsApp e ganhe 1 dia de Guia Sol na sua próxima viagem." }} />;
}
