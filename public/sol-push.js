// Notificações do app (PWA): este arquivo é carregado pelo service worker.
// O servidor manda { titulo, texto, link, tag }; aqui vira a notificação do celular,
// e o toque abre o app na tela certa (sempre dentro de /app).
self.addEventListener("push", (evento) => {
  let d = {};
  try { d = evento.data ? evento.data.json() : {}; } catch (e) { d = { texto: evento.data ? evento.data.text() : "" }; }
  const titulo = typeof d.titulo === "string" && d.titulo ? d.titulo : "Sol";
  const link = typeof d.link === "string" && d.link.indexOf("/app") === 0 ? d.link : "/app";
  evento.waitUntil(self.registration.showNotification(titulo, {
    body: typeof d.texto === "string" ? d.texto : "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: typeof d.tag === "string" ? d.tag : "sol",
    data: { link: link },
  }));
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const link = (evento.notification.data && evento.notification.data.link) || "/app";
  evento.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of abertas) {
      if (new URL(c.url).origin === self.location.origin && "focus" in c) {
        await c.focus();
        if ("navigate" in c) { try { await c.navigate(link); } catch (e) { /* segue com a tela que estava */ } }
        return;
      }
    }
    await self.clients.openWindow(link);
  })());
});
