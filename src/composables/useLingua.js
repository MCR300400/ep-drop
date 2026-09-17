import { ref, computed } from 'vue'

const LINGUA_KEY = 'ep_lingua'

function ottieniLinguaIniziale() {
  if (typeof window === 'undefined') return 'it'
  try {
    const salvata = localStorage.getItem(LINGUA_KEY)
    if (salvata === 'it' || salvata === 'en') return salvata
    const browserLang = navigator.language || navigator.userLanguage || ''
    if (browserLang.startsWith('it')) return 'it'
    return 'it'
  } catch (e) {
    console.debug('Impossibile accedere a localStorage per la lingua:', e)
    return 'it'
  }
}

const lingua = ref(ottieniLinguaIniziale())

export function useLingua() {
  const isItalian = computed(() => lingua.value === 'it')
  const isEnglish = computed(() => lingua.value === 'en')

  function applicaLingua(nuovaLingua) {
    lingua.value = nuovaLingua
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', nuovaLingua)
      try {
        localStorage.setItem(LINGUA_KEY, nuovaLingua)
      } catch (e) {
        console.warn('Impossibile salvare la lingua in localStorage:', e)
      }
    }
  }

  function toggleLingua() {
    applicaLingua(lingua.value === 'it' ? 'en' : 'it')
  }

  function t(valore) {
    if (!valore) return ''
    if (typeof valore === 'object') {
      return valore[lingua.value] || valore.it || ''
    }
    return dizionario[valore]?.[lingua.value] || valore
  }

  return {
    lingua,
    isItalian,
    isEnglish,
    setLingua: applicaLingua,
    toggleLingua,
    t
  }
}

export const dizionario = {
  // Navigazione
  'nav.home': { it: 'Home', en: 'Home' },
  'nav.comeFunziona': { it: 'Come Funziona', en: 'How it Works' },
  'nav.sicurezza': { it: 'Crittografia P2P', en: 'P2P Security' },
  'nav.temaChiaro': { it: 'Chiaro', en: 'Light' },
  'nav.temaScuro': { it: 'Scuro', en: 'Dark' },
  'nav.menu': { it: 'Menu', en: 'Menu' },
  'nav.chiudi': { it: 'Chiudi', en: 'Close' },
  'nav.nuovaStanza': { it: 'Home & Nuova Stanza', en: 'Home & New Room' },

  // Contatore
  'contatore.tooltip': {
    it: 'Visitatori unici totali tracciati nel rispetto della privacy',
    en: 'Total unique visitors tracked with privacy-first analytics'
  },
  'contatore.singolare': { it: 'visitatore unico', en: 'unique visitor' },
  'contatore.plurale': { it: 'visitatori unici', en: 'unique visitors' },

  // Home Hero
  'home.badge': { it: 'WebSockets + WebRTC P2P Transfer', en: 'WebSockets + WebRTC P2P Transfer' },
  'home.titolo': { it: 'Condividi file e appunti tra dispositivi all\'istante.', en: 'Share files and clipboard between devices instantly.' },
  'home.sottotitolo': {
    it: 'Senza registrazione, senza salvare nulla su server esterni. Apri la stessa stanza su laptop e telefono per scambiarti testi, link o trasferire file ad alta velocità direttamente browser-to-browser.',
    en: 'No accounts, zero data saved on external servers. Open the same room on your laptop and phone to exchange text snippets, links, or stream files directly browser-to-browser.'
  },
  'home.crea': { it: 'Crea Nuova Stanza Istantanea', en: 'Create Instant Room' },
  'home.creando': { it: 'Creazione in corso...', en: 'Creating...' },
  'home.notaCrea': { it: 'Genera una stanza temporanea protetta', en: 'Generates a secure disposable room' },
  'home.oppure': { it: 'oppure', en: 'or' },
  'home.placeholderCodice': { it: 'Es. K9X-2M', en: 'e.g. K9X-2M' },
  'home.entra': { it: 'Entra', en: 'Join' },
  'home.verificando': { it: 'Verifica...', en: 'Verifying...' },
  'home.notaEntra': { it: 'Inserisci il codice mostrato sull\'altro dispositivo', en: 'Enter the code displayed on the other device' },
  'home.errLunghezza': { it: 'Inserisci un codice stanza valido (es. K9X-2M)', en: 'Enter a valid room code (e.g. K9X-2M)' },
  'home.errNonTrovata': { it: 'Stanza non trovata. Controlla il codice inserito o creane una nuova.', en: 'Room not found. Check the code or create a new room.' },
  'home.errVerifica': { it: 'Impossibile verificare la stanza. Riprova.', en: 'Unable to verify room. Please retry.' },
  'home.errConnessione': { it: 'Errore di connessione al server delle stanze.', en: 'Connection error to room signaling server.' },

  // Home Pilastri
  'home.sezFunziona': { it: 'Come Funziona ep-drop', en: 'How ep-drop Works' },
  'home.f1Titolo': { it: 'Live Clipboard Sincronizzata', en: 'Synced Live Clipboard' },
  'home.f1Desc': {
    it: 'Incolli un codice, un link o un appunto sul telefono e appare istantaneamente sul tuo computer in tempo reale con copia in 1 click.',
    en: 'Paste code snippets, links, or notes on your phone and they instantly appear on your computer in real-time with 1-click copying.'
  },
  'home.f2Titolo': { it: 'Drag & Drop File Streaming', en: 'Drag & Drop File Streaming' },
  'home.f2Desc': {
    it: 'Trascina documenti, immagini, video o archivi compressi. Il file viene frazionato in chunk crittografati e inviato senza limiti di dimensione artificiali.',
    en: 'Drag documents, photos, videos, or archives. Files are split into encrypted chunks and streamed without artificial size limits.'
  },
  'home.f3Titolo': { it: 'Crittografia & Zero Persistence', en: 'Encryption & Zero Persistence' },
  'home.f3Desc': {
    it: 'Nessun file o testo viene salvato su database. Il canale WebRTC è diretto e i pacchetti WebSocket risiedono esclusivamente nella memoria volatile (RAM) durante il passaggio.',
    en: 'No files or text are stored in any database. WebRTC channels are direct and WebSocket frames exist exclusively in volatile memory (RAM).'
  },
  'home.secTitolo': { it: 'Architettura Edge & Cloudflare Durable Objects', en: 'Edge Architecture & Cloudflare Durable Objects' },
  'home.secDesc': {
    it: 'Il coordinamento delle stanze di <strong>ep-drop</strong> è gestito da un Cloudflare Worker a bassissima latenza che sfrutta <strong>Durable Objects</strong> con WebSockets bidirezionali. Una volta scambiata la segnalazione, il trasferimento dei dati avviene preferibilmente via WebRTC DataChannel p2p per garantire il massimo throughput.',
    en: 'Room signaling in <strong>ep-drop</strong> is orchestrated by an ultra-low latency Cloudflare Worker using <strong>Durable Objects</strong> with bidirectional WebSockets. Once signaled, data streams peer-to-peer via WebRTC DataChannels for maximum throughput.'
  },

  // QR Modal
  'qr.titolo': { it: 'Inquadra con la Fotocamera', en: 'Scan with Camera' },
  'qr.istruzioni': {
    it: 'Scansiona questo codice con il tuo smartphone o tablet per entrare istantaneamente nella stanza',
    en: 'Scan this QR code with your phone or tablet to instantly join room'
  },

  // Stanza
  'stanza.connessione': { it: 'Connessione al server edge...', en: 'Connecting to edge server...' },
  'stanza.disconnesso': { it: 'Disconnesso. Riconnessione in corso...', en: 'Disconnected. Reconnecting...' },
  'stanza.nonTrovata': { it: 'Stanza non trovata o scaduta', en: 'Room not found or expired' },
  'stanza.tornaHome': { it: 'Torna alla Home', en: 'Return to Home' },
  'stanza.stanza': { it: 'Stanza', en: 'Room' },
  'stanza.dispositiviConnessi': { it: 'Dispositivi connessi', en: 'Connected devices' },
  'stanza.questoDispositivo': { it: 'Questo dispositivo', en: 'This device' },
  'stanza.mostraQR': { it: 'Mostra QR Code', en: 'Show QR Code' },
  'stanza.copiaLink': { it: 'Copia Link Stanza', en: 'Copy Room Link' },
  'stanza.linkCopiato': { it: 'Link Copiato!', en: 'Link Copied!' },
  'stanza.nessunPeer': {
    it: 'In attesa di altri dispositivi. Apri questo link su un altro telefono o PC per iniziare.',
    en: 'Waiting for other devices. Open this link on another phone or computer to begin.'
  },
  'stanza.appunti': { it: 'Live Clipboard', en: 'Live Clipboard' },
  'stanza.inviaAppunti': { it: 'Invia', en: 'Send' },
  'stanza.copiaTesto': { it: 'Copia Testo', en: 'Copy Text' },
  'stanza.testoCopiato': { it: 'Copiato negli appunti!', en: 'Copied to clipboard!' },
  'stanza.placeholderAppunti': { it: 'Scrivi o incolla un appunto o link da condividere...', en: 'Type or paste a note or link to share...' },
  'stanza.fileTransfer': { it: 'Trasferimento File', en: 'File Transfer' },
  'stanza.trascinaFile': { it: 'Trascina i file qui o clicca per sfogliare', en: 'Drag and drop files here or click to browse' },
  'stanza.fileInviato': { it: 'File inviato con successo', en: 'File sent successfully' },
  'stanza.fileRicevuto': { it: 'File ricevuto', en: 'File received' },
  'stanza.scarica': { it: 'Scarica', en: 'Download' }
}
