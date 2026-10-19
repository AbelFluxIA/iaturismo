// Incluído no service worker (vite.config.ts → workbox.importScripts).
//
// Transição do app antigo (que se atualizava sozinho e não tem o botão
// "Atualizar") para o atual. Se a versão ativa no aparelho for a antiga, a nova
// entra direto e as telas abertas recarregam já na versão nova. A partir daí a
// versão ativa deixa uma marca, e as próximas esperam o toque em "Atualizar".
var SOL_MARCA_BOTAO = "sol-app-com-botao-atualizar";
var SOL_TRANSICAO = "sol-transicao-pendente";

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.has(SOL_MARCA_BOTAO).then(function (temBotao) {
      if (temBotao) return;
      // Só recarrega as telas se havia uma versão antiga (não na primeira visita)
      var marcar = self.registration.active ? caches.open(SOL_TRANSICAO) : Promise.resolve();
      return marcar.then(function () { return self.skipWaiting(); });
    })
  );
});

self.addEventListener("activate", function (event) {
  var pronto = caches.open(SOL_MARCA_BOTAO).then(function () {
    return caches.has(SOL_TRANSICAO);
  });
  event.waitUntil(pronto);
  // Fora do waitUntil: recarregar antes de terminar a ativação travaria a navegação
  pronto.then(function (transicao) {
    if (!transicao) return;
    return caches.delete(SOL_TRANSICAO)
      .then(function () { return self.clients.claim(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (telas) {
        telas.forEach(function (tela) {
          if (tela.navigate) tela.navigate(tela.url).catch(function () {});
        });
      });
  }).catch(function () {});
});
