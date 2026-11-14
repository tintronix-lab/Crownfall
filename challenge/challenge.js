// The hand-over page for "Challenge a friend to this map". A challenge is a link that carries a match's settings,
// the map's seed and the sender's result as whole numbers. This page reads it exactly as the game does, says what it
// is, and hands it to the game by the game's own address. It keeps nothing and sends nothing: no request leaves it.
(function () {
  'use strict';

  var words = {
    'en': {
      title: "A friend's challenge",
      won: 'Your friend won this Crownfall map in {0}. Can you beat that?',
      lost: 'This Crownfall map beat your friend after {0}. Can you win it?',
      open: 'Open in Crownfall',
      have: "Don't have the game yet?",
      store: 'Get Crownfall on the App Store',
      needs: 'Challenges need Crownfall 1.2 or later.',
      note: "This link holds the map's settings and your friend's result, and nothing else. This page keeps nothing and sends nothing.",
      bad: 'This link is not a challenge.',
      again: 'Ask your friend to send it again from the end of a match.'
    },
    'de': {
      title: 'Herausforderung eines Freundes',
      won: 'Dein Freund hat diese Crownfall-Karte in {0} gewonnen. Schaffst du das schneller?',
      lost: 'Diese Crownfall-Karte hat deinen Freund nach {0} besiegt. Kannst du sie gewinnen?',
      open: 'In Crownfall öffnen',
      have: 'Du hast das Spiel noch nicht?',
      store: 'Crownfall im App Store laden',
      needs: 'Herausforderungen brauchen Crownfall 1.2 oder neuer.',
      note: 'Dieser Link enthält die Einstellungen der Karte und das Ergebnis deines Freundes, sonst nichts. Diese Seite speichert nichts und sendet nichts.',
      bad: 'Dieser Link ist keine Herausforderung.',
      again: 'Bitte deinen Freund, ihn am Ende einer Partie noch einmal zu senden.'
    },
    'fr': {
      title: "Le défi d'un ami",
      won: 'Ton ami a gagné cette carte de Crownfall en {0}. Tu fais mieux ?',
      lost: 'Cette carte de Crownfall a battu ton ami après {0}. Tu peux la gagner ?',
      open: 'Ouvrir dans Crownfall',
      have: "Tu n'as pas encore le jeu ?",
      store: "Télécharger Crownfall sur l'App Store",
      needs: 'Les défis demandent Crownfall 1.2 ou plus récent.',
      note: "Ce lien contient les réglages de la carte et le résultat de ton ami, rien d'autre. Cette page ne garde rien et n'envoie rien.",
      bad: "Ce lien n'est pas un défi.",
      again: "Demande à ton ami de le renvoyer à la fin d'une partie."
    },
    'es': {
      title: 'El reto de un amigo',
      won: 'Tu amigo ganó este mapa de Crownfall en {0}. ¿Puedes superarlo?',
      lost: 'Este mapa de Crownfall venció a tu amigo tras {0}. ¿Puedes ganarlo?',
      open: 'Abrir en Crownfall',
      have: '¿Aún no tienes el juego?',
      store: 'Consigue Crownfall en el App Store',
      needs: 'Los retos necesitan Crownfall 1.2 o posterior.',
      note: 'Este enlace contiene los ajustes del mapa y el resultado de tu amigo, nada más. Esta página no guarda ni envía nada.',
      bad: 'Este enlace no es un reto.',
      again: 'Pide a tu amigo que lo envíe de nuevo al final de una partida.'
    },
    'it': {
      title: 'La sfida di un amico',
      won: 'Il tuo amico ha vinto questa mappa di Crownfall in {0}. Riesci a fare meglio?',
      lost: 'Questa mappa di Crownfall ha battuto il tuo amico dopo {0}. Riesci a vincerla?',
      open: 'Apri in Crownfall',
      have: 'Non hai ancora il gioco?',
      store: "Scarica Crownfall sull'App Store",
      needs: 'Le sfide richiedono Crownfall 1.2 o successivo.',
      note: "Questo link contiene le impostazioni della mappa e il risultato del tuo amico, nient'altro. Questa pagina non conserva e non invia nulla.",
      bad: 'Questo link non è una sfida.',
      again: 'Chiedi al tuo amico di inviarlo di nuovo alla fine di una partita.'
    },
    'pt-BR': {
      title: 'O desafio de um amigo',
      won: 'Seu amigo venceu este mapa do Crownfall em {0}. Consegue fazer melhor?',
      lost: 'Este mapa do Crownfall venceu seu amigo depois de {0}. Consegue vencê-lo?',
      open: 'Abrir no Crownfall',
      have: 'Ainda não tem o jogo?',
      store: 'Baixar Crownfall na App Store',
      needs: 'Os desafios precisam do Crownfall 1.2 ou mais recente.',
      note: 'Este link contém os ajustes do mapa e o resultado do seu amigo, e nada mais. Esta página não guarda nem envia nada.',
      bad: 'Este link não é um desafio.',
      again: 'Peça ao seu amigo para enviar de novo no fim de uma partida.'
    },
    'sv': {
      title: 'En väns utmaning',
      won: 'Din vän vann den här Crownfall-kartan på {0}. Kan du slå det?',
      lost: 'Den här Crownfall-kartan slog din vän efter {0}. Kan du vinna den?',
      open: 'Öppna i Crownfall',
      have: 'Har du inte spelet än?',
      store: 'Hämta Crownfall i App Store',
      needs: 'Utmaningar kräver Crownfall 1.2 eller senare.',
      note: 'Länken innehåller kartans inställningar och din väns resultat, inget annat. Den här sidan sparar ingenting och skickar ingenting.',
      bad: 'Den här länken är ingen utmaning.',
      again: 'Be din vän skicka den igen i slutet av en match.'
    }
  };

  // The reader's language among the game's seven; English otherwise.
  function language() {
    var asked = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (var i = 0; i < asked.length; i++) {
      var tag = String(asked[i]);
      if (words[tag]) return tag;
      var first = tag.split('-')[0].toLowerCase();
      if (first === 'pt') return 'pt-BR';
      if (words[first]) return first;
    }
    return 'en';
  }

  // The parts of a challenge, in the game's order, each with the least and the most it may be (ChallengeLinks.cs).
  var parts = [
    ['v', 1, 1], ['m', 0, 4], ['d', 0, 2], ['s', 0, 3], ['r', 0, 3], ['seed', 1, 999999],
    ['l', 0, 1], ['a', 0, 1], ['q', 0, 1], ['w', 0, 1], ['t', 0, 86400]
  ];

  // Reads the question of a link. Whole numbers only, each part once, nothing else: null for anything the game would
  // refuse. What comes back is written again from the numbers, never copied from the address.
  function read(search) {
    if (typeof search !== 'string' || search.length < 2 || search.length > 400 || search.charAt(0) !== '?') return null;
    var found = {};
    var pairs = search.substring(1).split('&');
    if (pairs.length !== parts.length) return null;
    for (var i = 0; i < pairs.length; i++) {
      var match = /^([a-z]{1,4})=([0-9]{1,9})$/.exec(pairs[i]);
      if (!match || Object.prototype.hasOwnProperty.call(found, match[1])) return null;
      found[match[1]] = parseInt(match[2], 10);
    }
    var written = [];
    for (var p = 0; p < parts.length; p++) {
      var name = parts[p][0];
      if (!Object.prototype.hasOwnProperty.call(found, name)) return null;
      var value = found[name];
      if (value < parts[p][1] || value > parts[p][2]) return null;
      written.push(name + '=' + value);
    }
    // No two against two on a lake: the game has no such match to send.
    if (found.l === 1 && found.a === 1) return null;
    return { query: written.join('&'), won: found.w === 1, seconds: found.t };
  }

  // A time as the game writes it: minutes and two digits of seconds.
  function time(seconds) {
    var s = seconds % 60;
    return Math.floor(seconds / 60) + ':' + (s < 10 ? '0' : '') + s;
  }

  function put(id, text) {
    var element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  var chosen = language();
  var w = words[chosen];
  document.documentElement.lang = chosen;
  document.title = w.title + ' — Crownfall';
  put('title', w.title);
  put('have', w.have);
  put('store', w.store);
  put('needs', w.needs);
  put('note', w.note);

  var challenge = read(window.location.search);
  if (!challenge) {
    put('result', w.bad + ' ' + w.again);
    return;
  }
  put('result', (challenge.won ? w.won : w.lost).replace('{0}', time(challenge.seconds)));
  var open = document.getElementById('open');
  open.textContent = w.open;
  open.setAttribute('href', 'crownfall://challenge?' + challenge.query);
  document.getElementById('open-row').hidden = false;
})();
