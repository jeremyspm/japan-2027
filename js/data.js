/* ============================================================
   data.js — constants + seeded starter data (JT.data)
   The seed bakes in verified Japan / February 2027 research so
   the tracker is useful the moment it's opened. Everything here
   is editable or deletable in the UI.
   ============================================================ */
window.JT = window.JT || {};
JT.data = (function () {
  const u = JT.util;

  /* Ordered ticket-status pipeline for the Event tracker (Japan lottery model) */
  const TICKET_STATES = ['Not on sale', 'Lottery open', 'Entered', 'Won', 'Lost', 'General sale', 'Purchased', 'Have tickets'];
  const DATE_STATES = ['tbd', 'window', 'confirmed']; // tbd = waiting on announcement

  const EVENT_CATEGORIES = ['festival', 'concert', 'anime/idol', 'gaming/esports', 'sports', 'other'];
  const PLACE_TYPES = [
    { key: 'sightseeing', label: 'Sightseeing', icon: '⛩️' },
    { key: 'food', label: 'Food & Drink', icon: '🍜' },
    { key: 'nightlife', label: 'Nightlife', icon: '🍸' },
    { key: 'misc', label: 'Activities', icon: '🎏' }
  ];
  const PLACE_STATUS = ['idea', 'shortlisted', 'scheduled', 'visited'];
  const CITIES = ['Tokyo', 'Kyoto', 'Osaka', 'Sapporo / Hokkaido', 'Otaru', 'Hakone', 'Nara', 'Hiroshima', 'Kanazawa', 'Nagoya', 'Okayama', 'Other'];
  const PRIORITIES = ['must', 'high', 'maybe'];
  const EXPENSE_CATEGORIES = ['Flights', 'Lodging', 'Transport', 'Events/Tickets', 'Food', 'Activities', 'Shopping', 'Other'];

  function base(extra) {
    return Object.assign({ id: u.uid(), addedBy: '', createdAt: u.nowISO(), updatedAt: u.nowISO(), comments: [], votes: {} }, extra);
  }

  function seed() {
    return {
      meta: {
        version: 3,
        tripName: 'Japan — February 2027',
        startDate: '2027-02-05',
        endDate: '2027-02-16',
        route: 'dashboard',
        createdAt: u.nowISO(),
        updatedAt: u.nowISO(),
        lastEditedBy: ''
      },
      settings: {
        theme: 'dark',
        userName: '',
        partnerName: '',
        homeCurrency: 'USD',
        jpyRate: 150,            // 1 home-currency unit ≈ this many JPY (editable)
        budgetCapJPY: 0,
        sync: { enabled: false, url: '', key: '', room: '', passphrase: '' }
      },

      /* ---------- Event & ticket tracker (the headline feature) ---------- */
      events: [
        base({
          title: 'Sapporo Snow Festival (Yuki Matsuri)', category: 'festival',
          dateStatus: 'window', dateStart: '2027-02-04', dateEnd: '2027-02-11',
          city: 'Sapporo / Hokkaido', venue: 'Odori Park · Susukino · Tsudome',
          ticketStatus: 'na', priority: 'high', watch: true,
          source: 'https://www.japan-guide.com/e/e5311.html',
          notes: 'Flagship event. Dates approximate (early–mid Feb, ~1 week) — confirm when the committee announces. Overlaps Lunar New Year crowds; book Sapporo lodging EARLY.'
        }),
        base({
          title: 'Asahikawa Winter Festival', category: 'festival',
          dateStatus: 'window', dateStart: '2027-02-06', dateEnd: '2027-02-11',
          city: 'Sapporo / Hokkaido', venue: 'Asahikawa (Asahibashi)',
          ticketStatus: 'na', priority: 'maybe', watch: true,
          notes: 'Overlaps Sapporo — easy to combine. Dates to confirm.'
        }),
        base({
          title: 'Otaru Snow Light Path', category: 'festival',
          dateStatus: 'window', dateStart: '2027-02-06', dateEnd: '2027-02-14',
          city: 'Otaru', venue: 'Otaru Canal', ticketStatus: 'na', priority: 'maybe', watch: true,
          notes: 'Nightly ~17:00–21:00. Beautiful canal illumination, ~40 min from Sapporo. Dates to confirm.'
        }),
        base({
          title: 'Setsubun (bean-throwing)', category: 'festival',
          dateStatus: 'confirmed', dateStart: '2027-02-03', dateEnd: '2027-02-03',
          city: 'Tokyo', venue: 'Sensoji / Zojoji (Tokyo) · Yasaka Shrine (Kyoto, geisha)',
          ticketStatus: 'na', priority: 'maybe',
          notes: 'Near-fixed date (Feb 3). Falls just before our placeholder window — adjust trip dates if you want to catch it.'
        }),
        base({
          title: 'Saidaiji Eyo "Naked Man" Festival', category: 'festival',
          dateStatus: 'window', dateStart: '2027-02-20', dateEnd: '2027-02-20',
          city: 'Okayama', venue: 'Saidaiji Temple', ticketStatus: 'na', priority: 'maybe', watch: true,
          notes: '⚠️ Date uncertain: now usually the 3rd Saturday (~Feb 20, 2027) but some sources still list the old fixed Feb 3 date. Verify with the temple before planning around it.'
        }),
        base({
          title: 'Plum (ume) blossom season', category: 'festival',
          dateStatus: 'window', dateStart: '2027-02-15', dateEnd: '2027-03-10',
          city: 'Tokyo', venue: 'Yushima Tenjin (Tokyo) · Kairakuen, Mito',
          ticketStatus: 'na', priority: 'maybe',
          notes: 'Peak late Feb, weather-dependent. The winter alternative to cherry blossoms.'
        }),
        base({
          title: '⭐ Example: concert / event we are waiting on', category: 'concert',
          dateStatus: 'tbd', dateStart: '', dateEnd: '',
          city: 'Tokyo', venue: '', ticketStatus: 'Not on sale', priority: 'must', watch: true,
          lotteryOpen: '', lotteryClose: '', resultDate: '', paymentDeadline: '',
          ticketUrl: 'https://ib.eplus.jp/', pricePer: '', qty: 2,
          notes: 'Template for an event with no announced date yet. Flip "Date status" to Confirmed once announced, then walk the ticket pipeline: Not on sale → Lottery open → Entered → Won/Lost → Purchased → Have tickets. Set the lottery-close & payment-deadline dates and they appear on the Dashboard. Delete this once you add your real one.'
        })
      ],

      /* ---------- Lists (sightseeing / food / nightlife / activities) ---------- */
      places: [],

      /* ---------- Idea inbox ---------- */
      ideas: [
        base({ text: 'Paste Instagram / TikTok / blog links here, or jot any loose idea. Triage later → promote to a list or event.', type: 'idea', status: 'inbox' })
      ],

      /* ---------- Itinerary ---------- */
      itinerary: [],   // slots: {id,date,time,durationMin,title,note,refType,refId,done}
      days: {},        // 'YYYY-MM-DD' -> {base, note}

      /* ---------- Budget ---------- */
      expenses: [],

      /* ---------- Deadlines (dashboard countdowns) ---------- */
      deadlines: [
        dl('Book Sapporo / Hokkaido lodging', '2026-09-30', 'booking', 'HARD deadline. Central Sapporo sells out ~6 months ahead for Snow Festival week; budget rooms gone by Dec. Highest priority.'),
        dl('Register ticket-platform accounts (eplus, Pia, Lawson)', '2026-10-15', 'tickets', 'Set up accounts BEFORE lotteries open — some need extra verification. e+ (eplus) has English + accepts overseas cards.'),
        dl('JR Pass price rises ~5–6%', '2026-10-01', 'transport', 'Nationwide pass usually NOT worth it for a city loop. For a Sapporo-focused trip, a regional Hokkaido pass often is. Compare once legs are fixed.'),
        dl('In-store tax-free shopping ends', '2026-11-01', 'info', 'From this date, tax refunds are processed at the airport on departure only. Keep receipts; plan big purchases accordingly.'),
        dl('Lunar New Year — crowd & price spike', '2027-02-06', 'warning', 'Big inbound surge, worst for Hokkaido/ski lodging. Overlaps Sapporo Snow Festival week = peak crowding. The ~Feb 12–22 window dodges the worst.'),
        dl('Osaka March sumo tickets on sale', '2027-02-07', 'tickets', 'Only if extending to the March basho (Osaka, ~Mar 14–28). Buy ONLY via official Ticket Oosumo (sumo.pia.jp/en) — avoid resellers.'),
        dl('National Foundation Day (holiday)', '2027-02-11', 'info', 'Domestic crowds, some closures.'),
        dl('Emperor\'s Birthday (holiday)', '2027-02-23', 'info', 'Domestic crowds, some closures.')
      ],

      /* ---------- Logistics ---------- */
      logistics: {
        flights: [],
        lodging: [],
        transport: [],
        documents: [],
        packing: [
          'Heavy down / insulated jacket', 'Thermal base layers (top & bottom)',
          'Insulated waterproof boots with good grip', 'Ice cleats / crampons (Hokkaido streets get icy)',
          'Warm gloves, hat, scarf', 'Hand & toe warmers', 'Moisturiser / lip balm (dry winter air)',
          'Universal power adapter (Japan = Type A, 100V)', 'Portable battery pack',
          'Passport + photocopy', 'Travel-insurance card', 'Foreign-transaction-fee-free card',
          'Comfortable walking shoes (cities)', 'Small day backpack', 'Reusable shopping bag'
        ].map(t => ({ id: u.uid('pk'), text: t, done: false })),
        checklist: [
          ck('Check passport valid for the whole trip (carry it at all times in Japan — legally required)'),
          ck('Book Sapporo / Hokkaido lodging by ~Sept 2026'),
          ck('Book international flights (3–6 months out; sooner near Lunar New Year)'),
          ck('Register ticket accounts (eplus / Pia / Lawson) before lotteries open'),
          ck('Decide JR Pass vs regional Hokkaido pass vs individual tickets'),
          ck('Set up Mobile Suica (Apple/Google Wallet) — top up with Mastercard/Amex, NOT Visa in Apple Wallet'),
          ck('Buy eSIM (Ubigi = best rural coverage, Airalo = cheap, Holafly = unlimited) ~1–2 weeks before'),
          ck('Get travel insurance'),
          ck('Complete Visit Japan Web & have the QR ready ≥6 hrs before landing'),
          ck('Download offline maps for each city + this tracker for offline use'),
          ck('Carry ¥20,000–30,000 cash buffer (rural Hokkaido is still cash-heavy)')
        ]
      },

      /* ---------- Discovery (curated seeds; promote to lists) ---------- */
      discovery: discoverySeed()
    };
  }

  function dl(title, date, kind, detail) { return { id: u.uid('dl'), title, date, kind, detail, done: false }; }
  function ck(text) { return { id: u.uid('ck'), text, done: false }; }
  function disc(title, city, type, note, tags) { return { id: u.uid('ds'), title, city, type, note, tags: tags || [] }; }

  function discoverySeed() {
    return [
      // Tokyo
      disc('Senso-ji & Asakusa', 'Tokyo', 'sightseeing', 'Iconic temple + old-town streets; great for Setsubun.', ['temple', 'classic']),
      disc('teamLab Planets / Borderless', 'Tokyo', 'sightseeing', 'Immersive digital art — book timed tickets in advance.', ['reserve', 'rainy-day']),
      disc('Shibuya Sky', 'Tokyo', 'sightseeing', 'Open-air rooftop deck; clear, dry Feb skies are ideal.', ['view']),
      disc('Tsukiji Outer Market', 'Tokyo', 'food', 'Morning street food & seafood. Go early.', ['breakfast', 'street-food']),
      disc('Golden Gai (Shinjuku)', 'Tokyo', 'nightlife', 'Warren of tiny themed bars; some have seat charges/locals-only.', ['bars', 'classic']),
      disc('Shibuya / Shimokitazawa live houses', 'Tokyo', 'nightlife', 'Small-venue gigs — overlaps your event hunt.', ['live-music']),
      // Kyoto
      disc('Fushimi Inari (early morning)', 'Kyoto', 'sightseeing', 'Thousands of torii gates; arrive at dawn to beat crowds.', ['shrine', 'classic']),
      disc('Arashiyama Bamboo Grove + Tenryu-ji', 'Kyoto', 'sightseeing', 'Pair with a riverside stroll; gorgeous in crisp winter light.', ['nature']),
      disc('Nishiki Market', 'Kyoto', 'food', 'Covered food street — great rainy/cold-day option.', ['street-food', 'rainy-day']),
      disc('Pontocho Alley', 'Kyoto', 'nightlife', 'Atmospheric lantern-lit dining/drinking lane by the river.', ['dinner', 'atmosphere']),
      // Osaka
      disc('Dotonbori', 'Osaka', 'food', 'Neon canal, takoyaki & okonomiyaki central.', ['street-food', 'classic']),
      disc('Osaka Castle', 'Osaka', 'sightseeing', 'Plum grove nearby blooms late Feb.', ['castle']),
      disc('Namba / Amerikamura bars', 'Osaka', 'nightlife', 'Lively, less formal than Tokyo nightlife.', ['bars']),
      // Sapporo / Hokkaido
      disc('Susukino (Sapporo)', 'Sapporo / Hokkaido', 'nightlife', 'Hokkaido\'s biggest nightlife & ramen district; ice sculptures during the festival.', ['bars', 'ramen']),
      disc('Sapporo soup curry & miso ramen', 'Sapporo / Hokkaido', 'food', 'Regional must-eats in deep winter.', ['ramen', 'local']),
      disc('Niseko day / ski', 'Sapporo / Hokkaido', 'misc', 'World-class powder in Feb. Books out earliest over Lunar New Year.', ['ski', 'reserve']),
      disc('Otaru Canal & glassworks', 'Otaru', 'sightseeing', 'Pretty canal town; pair with the Snow Light Path at night.', ['day-trip'])
    ];
  }

  return {
    seed, base,
    TICKET_STATES, DATE_STATES, EVENT_CATEGORIES, PLACE_TYPES, PLACE_STATUS,
    CITIES, PRIORITIES, EXPENSE_CATEGORIES
  };
})();
