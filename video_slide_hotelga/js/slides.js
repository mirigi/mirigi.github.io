/*
  Deck data + driver for the MIRIGI 24/7 hotel deck.
  See ../CLAUDE.md for the outline, content rules, and rendering plan.

  ---------------------------------------------------------------------------
  Localization: ONE source of truth, not a copy per language.
  ---------------------------------------------------------------------------
  Every user-visible string below is either a plain string (identical in
  every language — brand name, a fixed non-English demo line) or a
  `{ en: '...', es: '...' }` object. The engine's `t(field)` helper (defined
  inside the IIFE, where the page's `lang` is known) picks the right one at
  render time. `lang` comes from `?lang=` in the URL, same convention as
  `/miniapps/CLAUDE.md` §2 (`data-i18n`) — this is that same "one
  localization pattern" adapted to a JS-object deck instead of DOM attributes,
  not a second mechanism. Adding a language means adding one more key to each
  `{en, es}` object here — never a second copy of this file.

  Each slide: { kind, variant, kicker, title, body, bg, miri, miriStyle, durationMs }
  - kind: 'title' | 'content'.
  - bg: repo-root-relative background photo. Image-first — nearly every slide
    carries one, rendered by the shared WebGL canvas (js/bg-webgl.js).
  - miri: optional chat popup, one of three shapes:
      action — { user, ask, status, confirmed, confirmWord? } : Miri
        PROPOSES ("ask", a question) and only acts once the guest visibly
        confirms. HOW that confirmation is shown depends on the channel,
        because that's how the two channels actually work:
          - `app` skin  -> a tappable Confirm chip (a button is a normal
            control inside Mirigi's own branded app); it visibly PULSES,
            awaiting the tap, before flipping to the confirmed status.
          - `whatsapp` skin -> the guest literally TYPES a reply (`confirmWord`,
            default UI_STRINGS[lang].yes) — WhatsApp has no custom UI buttons
            here, so confirmation has to be a real message. Rendered as a
            4-turn conversation: user asks -> Miri proposes -> user types the
            confirm word -> Miri confirms with `confirmed` (a full sentence;
            `status` is the short word used only for the app-skin chip).
        Never skip straight from "ask" to "done" — the guest is always shown
        approving it first, on whichever channel is live.
      answer — { user, answer } : a plain informational reply, no
        confirmation step, for moments where Miri isn't taking an action.
      conversation — { conversation: [turn, ...] } : a fully authored
        multi-turn exchange for the flagship storytelling slides (Temporal
        Stays, Housekeeping, Dining, Arrivals, Feedback). Each turn:
          { from: 'user'|'miri', text, meta?, pauseMs?, kind? }
        - meta: small caption above the line (e.g. a time-skip label).
        - pauseMs: overrides the default pre-turn pause.
        - kind: 'audio' renders a voice-note bubble instead of text (for
          replies with more data than fits a typed line — e.g. dictating a
          friend's name/ID/phone); needs `duration` (e.g. '0:14'). 'confirm'
          renders a structured read-back card instead of a sentence — Miri
          repeating captured data before acting on it; needs `text` (intro
          line), `fields: [{label, value}]`, and optional `footer`. `value`
          is data (a name, a rating), not deck chrome — usually a plain
          string, not translated. The "Every Language" slide's whole `miri`
          object is deliberately plain-string Portuguese (not `{en,es}`) on
          every field — it's a fixed feature demo, independent of the deck's
          own display language.
    Skin auto-cycles across the deck via nextMiriStyle(); set `miriStyle` to
    force one (both WhatsApp-module slides force `whatsapp`).
  - durationMs: optional override; when `miri` is set, the popup's own
    animation time is folded in automatically (see effectiveDuration) —
    computed against the CURRENT language's text length, so a longer
    Spanish sentence still gets fully typed before the slide advances.

  Content is deliberately de-duplicated (one slide per distinct capability)
  and grounded: every `miri` example maps to a real mirigi_* AI tool in
  mirigi-backend/app/resident/ws/v2/ai_chat.py (food ordering, valet
  requests, reservations, guest authorization, service requests, device
  scenes, polls) — not an invented capability. See CLAUDE.md for the
  per-slide grounding notes and the deliberate, user-approved exceptions
  (WhatsApp/Temporal-Stays, the Housekeeping staff-reply turn, the Feedback
  slide, the AI-camera Valet Queue slide).
*/

var DEFAULT_DURATION_MS = 4200;

// Miri popup pacing (mirrors the cadence in miniapps/features/ai-concierge).
var MIRI_POP_DELAY_MS = 900;    // slide active -> popup starts fading in
var MIRI_CHAR_MS = 32;          // per-character typing speed
var MIRI_PAUSE_MS = 400;        // previous turn ends -> next turn starts "thinking"/typing
var MIRI_THINK_MS = 650;        // typing-indicator dwell before a Miri line appears
var MIRI_CHIP_DELAY_MS = 350;   // Miri's ask finishes -> Confirm chip fades in
var MIRI_TAP_DELAY_MS = 950;    // chip visible (pulsing, awaiting tap) -> simulated guest tap
var MIRI_TAP_ANIM_MS = 260;     // tap -> chip flips to confirmed status
var MIRI_TAIL_MS = 5000;        // animation complete -> minimum hold before advancing
var MIRI_AUDIO_PLAY_MS = 1200;  // voice-note bubble: how long the "playing" state holds
var MIRI_CONFIRM_ROW_MS = 260;  // confirm card: stagger between each field row revealing
var AUDIO_WAVE_BARS = [35, 60, 45, 80, 55, 30, 70, 50, 65, 40, 75, 50, 35, 85, 45, 55];

// Small fixed UI labels that aren't per-slide content (popup header, default
// chip/confirm-word fallbacks). Add a language here, not a new file.
var UI_STRINGS = {
  en: { headerLabel: 'AI Concierge', confirm: 'Confirm', yes: 'Yes' },
  es: { headerLabel: 'IA Concierge', confirm: 'Confirmar', yes: 'Sí' },
};

var SLIDES = [
  // ---------- Act 1 — Hook ----------
  {
    kind: 'title',
    variant: 'gold',
    bg: '/img_mirigi/header.jpg',
    wordmark: 'MIRIGI 24/7',
    tagline: {
      en: 'From the <span class="legacy">hotel app</span> to the<br><span class="future">hotel Artificial Intelligence assistant</span>',
      es: 'Del <span class="legacy">app del hotel</span> al<br><span class="future">asistente de Inteligencia Artificial del hotel</span>',
    },
    subline: { en: 'Miri: the AI that acts.', es: 'Miri: la IA que actúa.' },
    durationMs: 5000,
  },
  {
    kind: 'content',
    variant: 'dark',
    centered: true,
    bg: '/img_mirigi/bg-masthead.jpg',
    kicker: { en: 'The problem', es: 'El problema' },
    title: { en: 'Guests expect instant, always-on service.', es: 'Los huéspedes esperan un servicio instantáneo, siempre disponible.' },
    body: { en: 'Front desk, concierge, housekeeping, valet, F&B: all stretched thin.', es: 'Recepción, conserjería, limpieza, valet, gastronomía: todos al límite.' },
  },
  {
    kind: 'content',
    centered: true,
    bg: '/img_mirigi/touchpanelJadesignature.jpg',
    kicker: { en: 'A New Model', es: 'Un Nuevo Modelo' },
    title: {
      en: 'From <span class="legacy">app-first</span> to <span class="future">Artificial Intelligence-first</span>',
      es: 'De <span class="legacy">la app primero</span> a la <span class="future">Inteligencia Artificial primero</span>',
    },
    body: { en: 'Guests don’t hunt for a button in an app. They just ask Miri.', es: 'Los huéspedes no buscan un botón en una app. Simplemente le preguntan a Miri.' },
  },
  {
    kind: 'content',
    centered: true,
    bg: '/img_mirigi/ai-concierge.jpg',
    kicker: { en: 'Artificial Intelligence Concierge', es: 'Conserjería con Inteligencia Artificial' },
    title: { en: 'Meet Miri.', es: 'Conocé a Miri.' },
    body: {
      en: 'She <span class="future">acts</span>, not just answers, always with the guest’s OK.',
      es: 'Ella <span class="future">actúa</span>, no solo responde, siempre con el visto bueno del huésped.',
    },
  },

  // ---------- New modules ----------
  {
    kind: 'content',
    bg: '/img_mirigi/additional_v2.jpg',
    kicker: { en: 'New: Miri on WhatsApp', es: 'Nuevo: Miri en WhatsApp' },
    title: { en: 'No app to install. No interface to learn.', es: 'Sin apps que instalar. Sin interfaz que aprender.' },
    miriStyle: 'whatsapp',
    miri: {
      user: { en: 'Hi Miri, can you book the gym for me tomorrow at 8am?', es: 'Hola Miri, ¿podés reservarme el gimnasio para mañana a las 8am?' },
      ask: { en: 'Book the gym tomorrow at 8:00 AM?', es: '¿Reservo el gimnasio para mañana a las 8:00 AM?' },
      status: { en: 'Booked', es: 'Reservado' },
      confirmed: { en: 'Booked. See you at 8:00 AM.', es: 'Reservado. Nos vemos a las 8:00 AM.' },
    },
  },
  {
    kind: 'content',
    bg: '/img/features/visitors.jpg',
    kicker: { en: 'New: Temporal Stays', es: 'Nuevo: Estadías Temporales' },
    title: { en: 'Renting your unit? Your guests get full access, too.', es: '¿Alquilás tu unidad? Tus huéspedes también tienen acceso completo.' },
    miriStyle: 'whatsapp',
    miri: {
      conversation: [
        { from: 'miri', text: { en: 'You’re registered as our guest, Day 1–10. Enter your confirmation code to begin.', es: 'Estás registrado como nuestro huésped, del día 1 al 10. Ingresá tu código de confirmación para comenzar.' } },
        { from: 'user', text: 'J123C' },
        { from: 'miri', text: { en: 'Welcome! You’re all set: ask me anything, anytime.', es: '¡Bienvenido! Ya está todo listo: preguntame lo que quieras, cuando quieras.' } },
        { from: 'user', text: { en: 'I’ll arrive around 9. What time is check-in?', es: 'Llego cerca de las 9. ¿A qué hora es el check-in?' } },
        { from: 'miri', text: { en: 'Check-in is at 11, but you can leave your luggage at reception. Want to wait at our restaurant and see the menu? Or book the gym while you wait?', es: 'El check-in es a las 11, pero podés dejar tu equipaje en recepción. ¿Querés esperar en nuestro restaurante y ver el menú? ¿O reservar el gimnasio mientras esperás?' } },
      ],
    },
  },

  // ---------- Act 2 — Guest journey (one slide per capability) ----------
  {
    kind: 'content', bg: '/img_mirigi/restaurants2.png',
    kicker: { en: 'Dining', es: 'Gastronomía' },
    title: { en: 'Order breakfast, dinner, room service: Miri places it.', es: 'Pedí desayuno, cena, servicio a la habitación: Miri lo hace por vos.' },
    miri: {
      conversation: [
        { from: 'user', text: { en: 'Can I get a club sandwich sent to my room?', es: '¿Podés enviarme un club sándwich a mi habitación?' } },
        { from: 'miri', text: { en: 'Of course, would you like a beverage with that?', es: 'Claro, ¿te gustaría alguna bebida?' } },
        { from: 'user', text: { en: 'Yes, an iced tea, please.', es: 'Sí, un té helado, por favor.' } },
        { from: 'miri', text: { en: 'Club sandwich and iced tea, on their way to Room 812.', es: 'Club sándwich y té helado, en camino a la Habitación 812.' } },
      ],
    },
  },
  {
    kind: 'content', bg: '/img_mirigi/valet.jpg',
    kicker: { en: 'Valet', es: 'Valet' },
    title: { en: 'Call the car. Track it arriving. Done.', es: 'Solicitá el auto. Seguí su llegada. Listo.' },
    miri: {
      user: { en: 'Bring my car around, please.', es: 'Traé mi auto a la entrada, por favor.' },
      ask: { en: 'Call the valet now?', es: '¿Llamo al valet ahora?' },
      status: { en: 'On the way', es: 'En camino' },
      confirmed: { en: 'On the way to the front entrance.', es: 'En camino a la entrada principal.' },
    },
  },
  {
    kind: 'content', bg: '/img_mirigi/amenities2.jpg',
    kicker: { en: 'Amenities', es: 'Amenidades' },
    title: { en: 'Spa, pool, gym, courts: booked in one line.', es: 'Spa, pileta, gimnasio, canchas: reservados en una sola línea.' },
    miri: {
      user: { en: 'Book me a massage at 5pm today.', es: 'Reservame un masaje hoy a las 5pm.' },
      ask: { en: 'Reserve the spa at 5:00 PM?', es: '¿Reservo el spa a las 5:00 PM?' },
      status: { en: 'Booked', es: 'Reservado' },
      confirmed: { en: 'Booked. See you at 5:00 PM.', es: 'Reservado. Nos vemos a las 5:00 PM.' },
    },
  },
  {
    kind: 'content', bg: '/img_mirigi/delivery2.jpg',
    kicker: { en: 'Deliveries', es: 'Entregas' },
    title: { en: 'Notified the moment a package lands.', es: 'Te avisamos en el momento en que llega un paquete.' },
    miri: {
      user: { en: 'Did my package arrive yet?', es: '¿Ya llegó mi paquete?' },
      answer: { en: 'Yes, it’s at the front desk, on its way up now.', es: 'Sí, está en recepción, ya va camino a tu habitación.' },
    },
  },
  {
    kind: 'content', bg: '/img/features/visitors.jpg',
    kicker: { en: 'Arrivals', es: 'Llegadas' },
    title: { en: 'Authorize a guest before they reach the door.', es: 'Autorizá a un visitante antes de que llegue a la puerta.' },
    miri: {
      conversation: [
        { from: 'user', text: { en: 'My friend is arriving later. Can you register her?', es: 'Mi amiga llega más tarde. ¿Podés registrarla?' } },
        { from: 'miri', text: { en: 'Sure, tell me her name and ID number. Her phone number too, if you have it.', es: 'Claro, decime su nombre y número de documento. También su teléfono, si lo tenés.' } },
        { from: 'user', kind: 'audio', duration: '0:14' },
        {
          from: 'miri', kind: 'confirm',
          text: { en: 'Got it, confirming:', es: 'Listo, confirmando:' },
          fields: [
            { label: { en: 'Name', es: 'Nombre' }, value: 'Sofía Fernández' },
            { label: { en: 'ID', es: 'Documento' }, value: 'ID-48213' },
            { label: { en: 'Phone', es: 'Teléfono' }, value: '+1 555 0142' },
          ],
          footer: { en: 'Added to tonight’s guest list.', es: 'Agregada a la lista de invitados de esta noche.' },
        },
      ],
    },
  },
  {
    kind: 'content', bg: '/img_mirigi/blueliving.jpg',
    kicker: { en: 'Housekeeping', es: 'Mantenimiento' },
    title: { en: 'Every request, tracked to done.', es: 'Cada solicitud, seguida hasta resolverse.' },
    miri: {
      conversation: [
        { from: 'user', text: { en: 'My A/C isn’t working.', es: 'Mi aire acondicionado no funciona.' } },
        { from: 'miri', text: { en: 'Should I report this to maintenance?', es: '¿Aviso a mantenimiento para que lo revisen enseguida?' } },
        { from: 'user', text: { en: 'Yes', es: 'Sí' }, pauseMs: 600 },
        { from: 'miri', text: { en: 'Sent. Your request has been logged.', es: 'Listo, ya avisé a mantenimiento. Tu solicitud quedó registrada.' } },
        { from: 'miri', text: { en: 'The staff answered: “Can you try the second remote? Either way, a technician is on the way, there in 5 minutes.”', es: 'El equipo de mantenimiento respondió: mientras tanto, ¿podrías probar con el segundo control remoto? De todas formas, ya viene en camino un técnico, llega en 5 minutos.' }, pauseMs: 2000 },
      ],
    },
  },
  { kind: 'content', bg: '/img/features/panic_button.webp', kicker: { en: 'Guest Safety', es: 'Seguridad del Huésped' }, title: { en: 'One button. Instant response.', es: 'Un botón. Respuesta instantánea.' } },
  { kind: 'content', bg: '/img/features/camera-1.jpg', kicker: { en: 'Security', es: 'Seguridad' }, title: { en: 'Every corner of the property, watched.', es: 'Cada rincón de la propiedad, vigilado.' } },
  {
    kind: 'content', bg: '/img_mirigi/kitchen.jpg',
    kicker: { en: 'In-Room Controls', es: 'Controles de la Habitación' },
    title: { en: 'Lights, climate, curtains: one request away.', es: 'Luces, clima, cortinas: a una sola solicitud de distancia.' },
    miri: {
      user: { en: 'Can you set the room up for relaxing this evening?', es: '¿Podés preparar la habitación para relajarme esta noche?' },
      ask: { en: 'Run the Relax scene: lights low, A/C cool?', es: '¿Activo la escena Relax: luces tenues, aire fresco?' },
      status: { en: 'Done', es: 'Listo' },
      confirmed: { en: 'Done. Enjoy your evening.', es: 'Listo. Que disfrutes tu noche.' },
    },
  },
  {
    kind: 'content', bg: '/img_mirigi/table_zoom.jpg',
    kicker: { en: 'In-Room Guide', es: 'Guía de la Habitación' },
    title: { en: 'No laminated binders. Just ask.', es: 'Sin carpetas plastificadas. Solo preguntá.' },
    miri: {
      user: { en: 'What time does the pool close?', es: '¿A qué hora cierra la pileta?' },
      answer: { en: 'The pool closes at 10 PM tonight.', es: 'La pileta cierra hoy a las 10 PM.' },
    },
  },
  {
    kind: 'content', bg: '/img/features/polls.webp',
    kicker: { en: 'Feedback', es: 'Comentarios' },
    title: { en: 'Real-time guest satisfaction, one voice note.', es: 'Satisfacción del huésped en tiempo real, con un solo audio.' },
    miri: {
      conversation: [
        { from: 'user', text: { en: 'I really want to congratulate the team: this stay was a pleasure.', es: 'Realmente quiero felicitar al equipo: esta estadía fue un placer.' } },
        { from: 'miri', text: { en: 'That’s wonderful to hear! Would you like to fill out a satisfaction form?', es: '¡Qué lindo escuchar eso! ¿Te gustaría completar un formulario de satisfacción?' } },
        { from: 'user', text: { en: 'Yes', es: 'Sí' }, pauseMs: 500 },
        { from: 'miri', text: { en: 'How was your experience (Miri, the restaurant, housekeeping) from 1 to 5?', es: '¿Cómo calificarías tu experiencia (Miri, el restaurante, la limpieza) del 1 al 5?' } },
        { from: 'user', kind: 'audio', duration: '0:11' },
        {
          from: 'miri', kind: 'confirm',
          text: { en: 'Got it, here’s your form:', es: 'Listo, aquí está tu formulario:' },
          fields: [
            { label: { en: 'Miri', es: 'Miri' }, value: '★★★★★' },
            { label: { en: 'Restaurant', es: 'Restaurante' }, value: '★★★★★' },
            { label: { en: 'Housekeeping', es: 'Limpieza' }, value: '★★★★★' },
          ],
          footer: { en: 'Thank you for the kind words!', es: '¡Gracias por tus lindas palabras!' },
        },
      ],
    },
  },
  {
    kind: 'content', bg: '/img/features/fully-customizable.jpg',
    kicker: { en: 'Your Brand', es: 'Tu Marca' },
    title: {
      en: 'Your name, your <span class="future">Artificial Intelligence</span>, your app.',
      es: 'Tu nombre, tu <span class="future">Inteligencia Artificial</span>, tu app.',
    },
  },
  {
    kind: 'content', bg: '/img/features/expenses.jpg',
    kicker: { en: 'Billing', es: 'Facturación' },
    title: { en: 'Charges and balances, always in view.', es: 'Cargos y saldos, siempre a la vista.' },
    miri: {
      user: { en: 'What’s my balance, and when is it due?', es: '¿Cuál es mi saldo, y cuándo vence?' },
      answer: { en: 'You’re all settled, nothing due until checkout.', es: 'Estás al día, no hay nada pendiente hasta el checkout.' },
    },
  },
  { kind: 'content', bg: '/img/features/bespoke.jpg', kicker: { en: 'Reports', es: 'Reportes' }, title: { en: 'Tailored dashboards, for every property.', es: 'Paneles a medida, para cada propiedad.' } },
  { kind: 'content', bg: '/img_mirigi/amenities_original.jpg', kicker: { en: 'Bespoke', es: 'A Medida' }, title: { en: 'Built around what this property actually needs.', es: 'Diseñado en torno a lo que esta propiedad realmente necesita.' } },
  {
    kind: 'content', bg: '/img_mirigi/pool_water.jpg',
    kicker: { en: 'Every Language', es: 'Cada Idioma' },
    title: { en: 'Guests, served in their own words.', es: 'Huéspedes, atendidos en sus propias palabras.' },
    // Deliberately plain-string Portuguese on every miri field — a fixed
    // feature demo, not translated along with the deck's own display language.
    miri: {
      user: 'Posso pedir o café da manhã no quarto?',
      ask: 'Enviar o café da manhã para o seu quarto?',
      status: 'Enviado',
      confirmed: 'Enviado — bom apetite.',
      confirmWord: 'Sim',
    },
  },
  { kind: 'content', bg: '/img_mirigi/bg-masthead.jpg', kicker: { en: 'Trust', es: 'Confianza' }, title: { en: 'Secure by design, every interaction.', es: 'Seguro por diseño, en cada interacción.' } },
  { kind: 'content', bg: '/img_mirigi/additional.jpg', kicker: { en: 'Recap', es: 'Resumen' }, title: { en: 'One guest journey. One app. One Miri.', es: 'Un solo recorrido del huésped. Una sola app. Una sola Miri.' } },

  // ---------- Act 3 — Staff operations (no Miri popups: different persona/mode) ----------
  { kind: 'content', bg: '/img_mirigi/staff-frontdesk.webp', kicker: { en: 'Staff Console', es: 'Consola del Personal' }, title: { en: 'One real-time ops screen for the whole team.', es: 'Una pantalla operativa en tiempo real para todo el equipo.' } },
  { kind: 'content', bg: '/img_mirigi/header.jpg', kicker: { en: 'Front Desk', es: 'Recepción' }, title: { en: 'Every arrival, request, and handoff: in view.', es: 'Cada llegada, solicitud y traspaso: a la vista.' } },
  { kind: 'content', bg: '/img_mirigi/ai-concierge.jpg', kicker: { en: 'Concierge', es: 'Conserjería' }, title: { en: 'Guest requests, routed the moment they land.', es: 'Solicitudes de huéspedes, enrutadas en el momento en que llegan.' } },
  {
    kind: 'content', bg: '/img_mirigi/valet.jpg',
    kicker: { en: 'Valet Queue', es: 'Cola de Valet' },
    title: { en: 'An AI camera spots the car. Staff just park it.', es: 'Una cámara con IA detecta el auto. El personal solo lo estaciona.' },
    body: { en: 'License plate read, photos captured, record created: no typing.', es: 'Patente leída, fotos capturadas, registro creado: sin tipear.' },
  },
  { kind: 'content', bg: '/img_mirigi/blueliving.jpg', kicker: { en: 'Housekeeping', es: 'Mantenimiento' }, title: { en: 'Maintenance and housekeeping, tracked to close.', es: 'Mantenimiento y limpieza, seguidos hasta su cierre.' } },
  { kind: 'content', bg: '/img/features/camera-2.jpg', kicker: { en: 'Security', es: 'Seguridad' }, title: { en: 'Property-wide visibility, one console.', es: 'Visibilidad de toda la propiedad, en una sola consola.' } },
  { kind: 'content', bg: '/img_mirigi/table.jpg', kicker: { en: 'Management', es: 'Administración' }, title: { en: 'Occupancy and operations, at a glance.', es: 'Ocupación y operaciones, de un vistazo.' } },
  { kind: 'content', bg: '/img_mirigi/staff-frontdesk.webp', kicker: { en: 'Role-Based Access', es: 'Acceso por Rol' }, title: { en: 'The right screen for every team member.', es: 'La pantalla correcta para cada miembro del equipo.' } },

  // ---------- Act 4 — Proof + CTA ----------
  { kind: 'content', bg: '/img_mirigi/touchpanelJadesignature.jpg', kicker: { en: 'Trusted By', es: 'Confían en Nosotros' }, title: { en: 'Luxury properties run on Mirigi.', es: 'Propiedades de lujo funcionan con Mirigi.' } },
  { kind: 'content', bg: '/img_mirigi/pool_slide.jpg', kicker: { en: 'Why Mirigi', es: 'Por Qué Mirigi' }, title: { en: 'Faster service. Lighter staff load. Happier guests.', es: 'Servicio más rápido. Menos carga para el personal. Huéspedes más felices.' } },
  { kind: 'content', bg: '/img_mirigi/bg-masthead.jpg', kicker: { en: 'Contact', es: 'Contacto' }, title: 'mirigi.com', qrFocus: true, durationMs: 6000 },
  {
    kind: 'title',
    variant: 'gold',
    bg: '/img_mirigi/header.jpg',
    wordmark: 'MIRIGI 24/7',
    tagline: { en: 'Every guest. Every request. Every hour.', es: 'Cada huésped. Cada solicitud. Cada hora.' },
    durationMs: 5000,
  },
];

(function () {
  var params = new URLSearchParams(location.search);
  var autoplay = params.get('auto') !== '0';
  // capture=1: used by scripts/render-hotelga-video.js's frame-exact capture
  // pipeline, which pauses Chromium's virtual clock, so nothing (including
  // this deck's first show(0) call, and therefore every setTimeout it
  // schedules) may run until that clock is deliberately started. Without
  // this gate, show(0) below would fire immediately in real time, before
  // the render script has a chance to freeze the clock, desyncing frame 0
  // from the render script's timeline.
  var deferStart = params.get('capture') === '1';
  var lang = (params.get('lang') || 'en').toLowerCase();
  if (['en', 'es'].indexOf(lang) === -1) lang = 'en';
  document.documentElement.lang = lang;
  var ui = UI_STRINGS[lang] || UI_STRINGS.en;

  // The single translation lookup used everywhere below: plain strings (and
  // fixed-language demo content) pass through unchanged; {en,es} objects
  // resolve to the current `lang`, falling back to English.
  function t(field) {
    if (field == null) return field;
    if (typeof field === 'object') return field[lang] != null ? field[lang] : field.en;
    return field;
  }

  var deck = document.getElementById('deck');
  var progress = document.getElementById('progress');
  var qrBadge = document.getElementById('qr-badge');
  var current = 0;
  var bgLayerCounter = 0;
  var timer = null;
  var miriTimers = [];
  var MIRI_STYLES = ['app', 'whatsapp'];
  var miriCycle = 0;

  function nextMiriStyle() {
    var style = MIRI_STYLES[miriCycle % MIRI_STYLES.length];
    miriCycle++;
    return style;
  }

  function isAction(miri) { return !!(miri.ask && miri.status); }
  function turnCountOf(miri, skin) {
    if (miri.conversation) return miri.conversation.length;
    return isAction(miri) && skin === 'whatsapp' ? 4 : 2;
  }

  // WhatsApp has no custom UI buttons, so an `action` miri on the whatsapp
  // skin is rendered as a real typed confirmation instead of a tappable chip.
  function whatsappTurns(miri) {
    return [
      { from: 'user', text: miri.user },
      { from: 'miri', text: miri.ask },
      { from: 'user', text: miri.confirmWord || ui.yes, pauseMs: 600 },
      { from: 'miri', text: miri.confirmed },
    ];
  }

  function turnDurationMs(turn) {
    if (turn.kind === 'audio') return MIRI_AUDIO_PLAY_MS;
    if (turn.kind === 'confirm') {
      var d = (turn.from === 'miri' ? MIRI_THINK_MS : 0) + (t(turn.text) || '').length * MIRI_CHAR_MS;
      d += (turn.fields ? turn.fields.length : 0) * MIRI_CONFIRM_ROW_MS + 250;
      d += turn.footer ? 700 : 300;
      return d;
    }
    return (turn.from === 'miri' ? MIRI_THINK_MS : 0) + (t(turn.text) || '').length * MIRI_CHAR_MS;
  }

  function turnsDurationMs(turns) {
    var total = MIRI_POP_DELAY_MS;
    turns.forEach(function (turn, i) {
      total += i === 0 ? 0 : (turn.pauseMs != null ? turn.pauseMs : MIRI_PAUSE_MS);
      total += turnDurationMs(turn);
    });
    return total + MIRI_TAIL_MS;
  }

  function miriDurationMs(miri, skin) {
    if (miri.conversation) return turnsDurationMs(miri.conversation);
    if (isAction(miri) && skin === 'whatsapp') return turnsDurationMs(whatsappTurns(miri));

    var userLen = (t(miri.user) || '').length;
    if (isAction(miri)) {
      var askLen = (t(miri.ask) || '').length;
      return MIRI_POP_DELAY_MS + userLen * MIRI_CHAR_MS + MIRI_PAUSE_MS +
        MIRI_THINK_MS + askLen * MIRI_CHAR_MS + MIRI_CHIP_DELAY_MS +
        MIRI_TAP_DELAY_MS + MIRI_TAP_ANIM_MS + MIRI_TAIL_MS;
    }
    var answerLen = (t(miri.answer) || '').length;
    return MIRI_POP_DELAY_MS + userLen * MIRI_CHAR_MS + MIRI_PAUSE_MS +
      MIRI_THINK_MS + answerLen * MIRI_CHAR_MS + MIRI_TAIL_MS;
  }

  function effectiveDuration(slide) {
    var base = slide.durationMs || DEFAULT_DURATION_MS;
    if (!slide.miri) return base;
    return Math.max(base, miriDurationMs(slide.miri, slide._skin));
  }

  function bubbleHtml(turn) {
    var from = turn.from;
    var meta = t(turn.meta);
    if (turn.kind === 'audio') {
      return '<div class="bubble bubble--' + from + ' bubble--audio">' +
        (meta ? '<span class="bubble__meta">' + meta + '</span>' : '') +
        '<span class="audio-play">&#9654;</span>' +
        '<span class="audio-wave">' + AUDIO_WAVE_BARS.map(function (h) { return '<i style="--h:' + h + '"></i>'; }).join('') + '</span>' +
        '<span class="audio-duration">' + (turn.duration || '') + '</span>' +
      '</div>';
    }
    if (turn.kind === 'confirm') {
      var rows = (turn.fields || []).map(function (f) {
        return '<div class="confirm-row"><span class="confirm-label">' + t(f.label) + '</span><span class="confirm-value"></span></div>';
      }).join('');
      return '<div class="bubble bubble--' + from + ' bubble--confirm">' +
        (meta ? '<span class="bubble__meta">' + meta + '</span>' : '') +
        (from === 'miri' ? '<span class="bubble__typing"><i></i><i></i><i></i></span>' : '') +
        '<span class="bubble__text"></span>' +
        '<div class="confirm-fields">' + rows + '</div>' +
        (turn.footer ? '<span class="confirm-footer"></span>' : '') +
      '</div>';
    }
    return '<div class="bubble bubble--' + from + '">' +
      (meta ? '<span class="bubble__meta">' + meta + '</span>' : '') +
      (from === 'miri' ? '<span class="bubble__typing"><i></i><i></i><i></i></span>' : '') +
      '<span class="bubble__text"></span>' +
    '</div>';
  }

  // Header always reads "Miri · <AI Concierge>" (per-language) so the
  // identity is unambiguous everywhere she appears, on every skin.
  function miriPopupHtml(miri, skin) {
    var body;
    if (miri.conversation) {
      body = miri.conversation.map(bubbleHtml).join('');
    } else if (isAction(miri) && skin === 'whatsapp') {
      body = whatsappTurns(miri).map(bubbleHtml).join('');
    } else {
      body = bubbleHtml({ from: 'user' }) + bubbleHtml({ from: 'miri' }) +
        (isAction(miri)
          ? '<button type="button" class="miri-chip" tabindex="-1" aria-hidden="true">' +
              '<span class="miri-chip__check">✓</span><span class="miri-chip__label">' + (t(miri.confirm) || ui.confirm) + '</span>' +
            '</button>'
          : '');
    }
    return '<div class="miri-pop__head">' +
        '<span class="miri-pop__avatar">✦</span>' +
        '<b class="miri-pop__headtext">Miri &middot; ' + ui.headerLabel + '</b>' +
      '</div>' +
      '<div class="miri-pop__body">' + body + '</div>';
  }

  function slideEl(slide, index) {
    var el = document.createElement('section');
    var classes = ['slide'];
    if (slide.variant) classes.push('slide--' + slide.variant);
    if (slide.bg) {
      classes.push('has-bg');
      if (slide.kind === 'title' || slide.centered) classes.push('slide--full-bg');
    }
    el.className = classes.join(' ');
    el.dataset.index = index;

    // No `.bg`/`.scrim` divs here — photo-driven slides get their
    // background (Ken Burns pan + dithered scrim gradient) from the shared
    // WebGL canvas (js/bg-webgl.js), reparented into the active slide by
    // show() below. See that file for why this moved off plain CSS.
    var bgHtml = '';

    if (slide.kind === 'title') {
      el.innerHTML = bgHtml +
        '<div class="wordmark">' + t(slide.wordmark) + '</div>' +
        '<div class="tagline">' + t(slide.tagline) + '</div>' +
        (slide.subline ? '<div class="subline">' + t(slide.subline) + '</div>' : '');
    } else {
      el.innerHTML = bgHtml +
        (slide.kicker ? '<div class="kicker">' + t(slide.kicker) + '</div>' : '') +
        (slide.title ? '<h1>' + t(slide.title) + '</h1>' : '') +
        (slide.body ? '<p class="body">' + t(slide.body) + '</p>' : '');
    }

    if (slide.miri) {
      var skin = slide.miriStyle || nextMiriStyle();
      slide._skin = skin; // cached so play/duration logic renders the same channel later
      var classNames = 'miri-pop miri-pop--' + skin;
      if (turnCountOf(slide.miri, skin) > 2) classNames += ' miri-pop--long';
      var pop = document.createElement('div');
      pop.className = classNames;
      pop.innerHTML = miriPopupHtml(slide.miri, skin);
      el.appendChild(pop);
    }

    return el;
  }

  SLIDES.forEach(function (slide, i) {
    deck.appendChild(slideEl(slide, i));
    var dot = document.createElement('div');
    dot.className = 'dot';
    dot.dataset.index = i;
    progress.appendChild(dot);
  });

  var slideNodes = deck.querySelectorAll('.slide');
  var dotNodes = progress.querySelectorAll('.dot');

  function typeInto(node, text, onDone) {
    var i = 0;
    function step() {
      i++;
      node.textContent = text.slice(0, i);
      if (i < text.length) {
        miriTimers.push(setTimeout(step, MIRI_CHAR_MS));
      } else if (onDone) {
        onDone();
      }
    }
    step();
  }

  function resetMiriPopup(slideNode) {
    var pop = slideNode.querySelector('.miri-pop');
    if (!pop) return;
    pop.classList.remove('is-visible');
    pop.querySelectorAll('.bubble').forEach(function (b) {
      b.classList.remove('is-visible', 'is-playing');
      var text = b.querySelector('.bubble__text');
      if (text) text.textContent = '';
      var typing = b.querySelector('.bubble__typing');
      if (typing) typing.classList.remove('is-visible');
      b.querySelectorAll('.confirm-row').forEach(function (row) {
        row.classList.remove('is-visible');
        var value = row.querySelector('.confirm-value');
        if (value) value.textContent = '';
      });
      var footer = b.querySelector('.confirm-footer');
      if (footer) { footer.classList.remove('is-visible'); footer.textContent = ''; }
    });
    var chip = pop.querySelector('.miri-chip');
    if (chip) {
      chip.classList.remove('is-visible', 'is-tapped', 'is-confirmed');
      chip.querySelector('.miri-chip__label').textContent = ui.confirm;
    }
  }

  function playTextTurn(bubbleEl, turn, onDone) {
    var textEl = bubbleEl.querySelector('.bubble__text');
    var typingEl = bubbleEl.querySelector('.bubble__typing');
    if (turn.from === 'miri') {
      if (typingEl) typingEl.classList.add('is-visible');
      miriTimers.push(setTimeout(function () {
        if (typingEl) typingEl.classList.remove('is-visible');
        typeInto(textEl, t(turn.text), onDone);
      }, MIRI_THINK_MS));
    } else {
      typeInto(textEl, t(turn.text), onDone);
    }
  }

  function playAudioTurn(bubbleEl, onDone) {
    miriTimers.push(setTimeout(function () {
      bubbleEl.classList.add('is-playing');
      miriTimers.push(setTimeout(onDone, MIRI_AUDIO_PLAY_MS));
    }, 150));
  }

  function playConfirmTurn(bubbleEl, turn, onDone) {
    var reveal = function () {
      var textEl = bubbleEl.querySelector('.bubble__text');
      typeInto(textEl, t(turn.text), function () {
        var rows = bubbleEl.querySelectorAll('.confirm-row');
        (turn.fields || []).forEach(function (f, fi) {
          miriTimers.push(setTimeout(function () {
            rows[fi].querySelector('.confirm-value').textContent = t(f.value);
            rows[fi].classList.add('is-visible');
          }, fi * MIRI_CONFIRM_ROW_MS));
        });
        var afterRows = (turn.fields ? turn.fields.length : 0) * MIRI_CONFIRM_ROW_MS + 250;
        var footerEl = bubbleEl.querySelector('.confirm-footer');
        if (footerEl && turn.footer) {
          miriTimers.push(setTimeout(function () {
            footerEl.textContent = t(turn.footer);
            footerEl.classList.add('is-visible');
            miriTimers.push(setTimeout(onDone, 400));
          }, afterRows));
        } else {
          miriTimers.push(setTimeout(onDone, afterRows + 300));
        }
      });
    };
    if (turn.from === 'miri') {
      var typingEl = bubbleEl.querySelector('.bubble__typing');
      typingEl.classList.add('is-visible');
      miriTimers.push(setTimeout(function () { typingEl.classList.remove('is-visible'); reveal(); }, MIRI_THINK_MS));
    } else {
      reveal();
    }
  }

  function playTurns(pop, turns) {
    var bubbleEls = pop.querySelectorAll('.miri-pop__body .bubble');

    function playTurn(i) {
      if (i >= turns.length) return;
      var turn = turns[i];
      var bubbleEl = bubbleEls[i];
      var delay = i === 0 ? 0 : (turn.pauseMs != null ? turn.pauseMs : MIRI_PAUSE_MS);
      var next = function () { playTurn(i + 1); };

      miriTimers.push(setTimeout(function () {
        bubbleEl.classList.add('is-visible');
        if (turn.kind === 'audio') return playAudioTurn(bubbleEl, next);
        if (turn.kind === 'confirm') return playConfirmTurn(bubbleEl, turn, next);
        return playTextTurn(bubbleEl, turn, next);
      }, delay));
    }

    miriTimers.push(setTimeout(function () {
      pop.classList.add('is-visible');
      playTurn(0);
    }, MIRI_POP_DELAY_MS));
  }

  // Chip-confirmation flow (app skin only): Miri asks, the chip appears and
  // visibly PULSES — awaiting the guest's tap — and only after that
  // (simulated) tap does it flip to the confirmed status. See
  // css/slides.css .miri-chip for the pulse animation that sells the wait.
  function playChipConfirm(pop, miri) {
    var userBubble = pop.querySelector('.bubble--user');
    var userText = userBubble.querySelector('.bubble__text');
    var miriBubble = pop.querySelector('.bubble--miri');
    var miriText = miriBubble.querySelector('.bubble__text');
    var typing = miriBubble.querySelector('.bubble__typing');
    var chip = pop.querySelector('.miri-chip');

    miriTimers.push(setTimeout(function () {
      pop.classList.add('is-visible');
      userBubble.classList.add('is-visible');
      typeInto(userText, t(miri.user), function () {
        miriTimers.push(setTimeout(function () {
          miriBubble.classList.add('is-visible');
          typing.classList.add('is-visible');
          miriTimers.push(setTimeout(function () {
            typing.classList.remove('is-visible');
            typeInto(miriText, t(miri.ask), function () {
              miriTimers.push(setTimeout(function () {
                chip.classList.add('is-visible');
                miriTimers.push(setTimeout(function () {
                  chip.classList.add('is-tapped');
                  miriTimers.push(setTimeout(function () {
                    chip.classList.remove('is-tapped');
                    chip.classList.add('is-confirmed');
                    chip.querySelector('.miri-chip__label').textContent = t(miri.status);
                  }, MIRI_TAP_ANIM_MS));
                }, MIRI_TAP_DELAY_MS));
              }, MIRI_CHIP_DELAY_MS));
            });
          }, MIRI_THINK_MS));
        }, MIRI_PAUSE_MS));
      });
    }, MIRI_POP_DELAY_MS));
  }

  function playAnswer(pop, miri) {
    var userBubble = pop.querySelector('.bubble--user');
    var userText = userBubble.querySelector('.bubble__text');
    var miriBubble = pop.querySelector('.bubble--miri');
    var miriText = miriBubble.querySelector('.bubble__text');
    var typing = miriBubble.querySelector('.bubble__typing');

    miriTimers.push(setTimeout(function () {
      pop.classList.add('is-visible');
      userBubble.classList.add('is-visible');
      typeInto(userText, t(miri.user), function () {
        miriTimers.push(setTimeout(function () {
          miriBubble.classList.add('is-visible');
          typing.classList.add('is-visible');
          miriTimers.push(setTimeout(function () {
            typing.classList.remove('is-visible');
            typeInto(miriText, t(miri.answer));
          }, MIRI_THINK_MS));
        }, MIRI_PAUSE_MS));
      });
    }, MIRI_POP_DELAY_MS));
  }

  function playMiriPopup(slideNode, miri, skin) {
    var pop = slideNode.querySelector('.miri-pop');
    if (!pop) return;

    if (miri.conversation) return playTurns(pop, miri.conversation);
    if (isAction(miri) && skin === 'whatsapp') return playTurns(pop, whatsappTurns(miri));
    if (isAction(miri)) return playChipConfirm(pop, miri);
    return playAnswer(pop, miri);
  }

  // Kept in sync with .slide's `transition: opacity <ms> linear` in slides.css.
  var SHOW_FADE_MS = 450;
  // The incoming slide starts fading in once the outgoing one has faded
  // this far down (0.9 = 90% through its fade-out, i.e. at 10% opacity) —
  // not fully to 0 first. Overlapping only that last, darkest sliver
  // avoids both a jarring full cross-dissolve and a dead instant of solid
  // black between slides.
  var SHOW_FADE_OVERLAP = 0.9;

  function show(index) {
    var outgoingEl = slideNodes[current];
    var wasActive = !!(outgoingEl && outgoingEl.classList.contains('is-active'));
    var nextIndex = ((index % SLIDES.length) + SLIDES.length) % SLIDES.length;

    // Mostly-sequential fade: fade the outgoing slide down to ~10% opacity,
    // THEN start fading the incoming slide in — the two only overlap for
    // the final sliver of the outgoing fade instead of the whole thing.
    if (wasActive) outgoingEl.classList.remove('is-active');

    function activateNext() {
      miriTimers.forEach(clearTimeout);
      miriTimers = [];
      if (outgoingEl) resetMiriPopup(outgoingEl);

      current = nextIndex;
      slideNodes.forEach(function (el, i) { el.classList.toggle('is-active', i === current); });
      dotNodes.forEach(function (el, i) { el.classList.toggle('is-active', i === current); });

      var slide = SLIDES[current];
      if (qrBadge) qrBadge.classList.toggle('is-focused', !!slide.qrFocus);
      // Two alternating WebGL layers, not one shared canvas: the outgoing
      // slide keeps whichever layer it already has attached — still
      // rendering its own photo — until it's fully faded out, instead of
      // losing its background the instant the incoming slide claims it
      // (which is what caused an earlier black-flash bug). See
      // js/bg-webgl.js's file header for the full explanation.
      if (window.BgWebGL && window.BgWebGL.supported && slide.bg) {
        var bgLayer = window.BgWebGL.layers[bgLayerCounter % 2];
        bgLayerCounter++;
        bgLayer.attachTo(slideNodes[current]);
        bgLayer.setBackground(slide.bg, slideNodes[current].classList.contains('slide--full-bg'), performance.now());
      }
      if (slide.miri) playMiriPopup(slideNodes[current], slide.miri, slide._skin);
      if (autoplay) scheduleNext();
    }

    if (wasActive) {
      setTimeout(activateNext, SHOW_FADE_MS * SHOW_FADE_OVERLAP);
    } else {
      activateNext();
    }
  }

  function scheduleNext() {
    clearTimeout(timer);
    timer = setTimeout(function () { show(current + 1); }, effectiveDuration(SLIDES[current]));
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { clearTimeout(timer); show(current + 1); }
    if (e.key === 'ArrowLeft') { clearTimeout(timer); show(current - 1); }
  });

  dotNodes.forEach(function (dot) {
    dot.addEventListener('click', function () {
      clearTimeout(timer);
      show(parseInt(dot.dataset.index, 10));
    });
  });

  if (deferStart) {
    window.__startCapture = function () { show(0); };
  } else {
    show(0);
  }

  // Exposed for the render script (scripts/render-hotelga-video.js): the
  // exact total playback time (ms) of one full pass through the deck, so
  // the recording stops right after the last slide's animation completes
  // instead of guessing a fixed duration. Includes the SHOW_FADE_MS *
  // SHOW_FADE_OVERLAP delay show() now inserts before every transition but
  // the first (the incoming slide only becomes current once the outgoing
  // one has faded down to 10%) — omitting it would make renders stop
  // slightly before the deck actually finishes playing.
  window.MIRIGI_TOTAL_DURATION_MS = SLIDES.reduce(function (sum, s) { return sum + effectiveDuration(s); }, 0) +
    (SLIDES.length - 1) * SHOW_FADE_MS * SHOW_FADE_OVERLAP;
})();
