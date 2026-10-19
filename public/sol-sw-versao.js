// Incluído no service worker (vite.config.ts → workbox.importScripts).
//
// Transição do app antigo (que se atualizava sozinho e não tem o botão
// "Atualizar") para o atual. Se a versão ativa no aparelho for a antiga, a nova
// entra direto e o app antigo recarrega sozinho já na versão nova. A partir daí
// a versão ativa deixa esta marca, e as próximas esperam o toque em "Atualizar".
var SOL_MARCA_BOTAO = "sol-app-com-botao-atualizar";

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.has(SOL_MARCA_BOTAO).then(function (temBotao) {
      if (!temBotao) return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.open(SOL_MARCA_BOTAO));
});
