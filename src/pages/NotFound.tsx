import { Link } from "react-router-dom";

// Endereço que não existe: em português e com caminho de volta para o app
// (antes era "Oops! Page not found" com link para o painel administrativo).
const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 bg-sol-areia font-corpo text-sol-fundo text-center">
    <img src="/sol-mark.png" alt="Sol" className="w-16 h-16 object-contain" />
    <h1 className="m-0 font-display font-extrabold text-[22px] leading-tight">Página não encontrada</h1>
    <p className="m-0 max-w-[320px] text-[15px] leading-snug text-sol-texto2">Este endereço não existe ou mudou de lugar.</p>
    <Link to="/app" className="mt-2 flex items-center justify-center min-h-[48px] px-5 rounded-[14px] bg-sol-mar text-white text-[15px] font-bold no-underline">Ir para o início</Link>
  </div>
);

export default NotFound;
