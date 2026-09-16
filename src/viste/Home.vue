<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Contatore from '../components/Contatore.vue'

const router = useRouter()
const codiceInserito = ref('')
const erroreCodice = ref('')
const staCreando = ref(false)
const staVerificando = ref(false)

const WS_BASE = import.meta.env.VITE_WS_URL || 'wss://ep-ws.edoardopippi00.workers.dev'
const API_BASE = WS_BASE.replace(/^ws(s)?:/, 'http$1:')

function generaCodiceStanza() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let part1 = ''
  let part2 = ''
  for (let i = 0; i < 3; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length))
  for (let i = 0; i < 3; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length))
  return `${part1}-${part2}`
}

async function creaNuovaStanza() {
  if (staCreando.value) return
  staCreando.value = true
  const code = generaCodiceStanza()
  try {
    await fetch(`${API_BASE}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: 'drop', room: code })
    })
  } catch (err) {
    console.error('Errore creazione stanza:', err)
  } finally {
    staCreando.value = false
    router.push(`/room/${code}`)
  }
}

async function entraInStanza() {
  const pulito = codiceInserito.value.trim().toUpperCase().replace(/\s+/g, '')
  if (!pulito || pulito.length < 3) {
    erroreCodice.value = 'Inserisci un codice stanza valido (es. K9X-2M)'
    return
  }
  erroreCodice.value = ''
  staVerificando.value = true

  try {
    const res = await fetch(`${API_BASE}/api/rooms/check?app=drop&room=${encodeURIComponent(pulito)}`)
    if (!res.ok) {
      erroreCodice.value = 'Impossibile verificare la stanza. Riprova.'
      return
    }
    const data = await res.json()
    if (!data.exists) {
      erroreCodice.value = 'Stanza non trovata. Controlla il codice inserito o creane una nuova.'
      return
    }
    router.push(`/room/${pulito}`)
  } catch (err) {
    erroreCodice.value = 'Errore di connessione al server delle stanze.'
  } finally {
    staVerificando.value = false
  }
}
</script>

<template>
  <div class="pagina-home">
    <section class="sezione-hero">
      <!-- Badge e Contatore Visitatori Unici (SOLO nella pagina iniziale) -->
      <div class="testata-hero-badge">
        <div class="badge-tag">
          <span class="dot"></span>
          WebSockets + WebRTC P2P Transfer
        </div>
        <Contatore />
      </div>

      <h1 class="titolo-hero">
        Condividi file e appunti tra dispositivi all'istante.
      </h1>

      <p class="sottotitolo-hero">
        Senza registrazione, senza salvare nulla su server esterni. Apri la stessa stanza su laptop e telefono per scambiarti testi, link o trasferire file ad alta velocità direttamente browser-to-browser.
      </p>

      <!-- Azioni Rapide Stanza -->
      <div class="scheda-azione-stanza">
        <div class="blocco-crea">
          <button type="button" class="btn-primario" :disabled="staCreando" @click="creaNuovaStanza">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {{ staCreando ? 'Creazione in corso...' : 'Crea Nuova Stanza Istantanea' }}
          </button>
          <span class="nota-crea">Genera una stanza temporanea protetta</span>
        </div>

        <div class="divisore-o">
          <span>oppure</span>
        </div>

        <form class="blocco-unisciti" @submit.prevent="entraInStanza">
          <div class="input-gruppo">
            <input
              v-model="codiceInserito"
              type="text"
              placeholder="Es. K9X-2M"
              maxlength="12"
              class="input-codice"
              :disabled="staVerificando"
            />
            <button type="submit" class="btn-secondario" :disabled="staVerificando">
              {{ staVerificando ? 'Verifica...' : 'Entra' }}
            </button>
          </div>
          <span v-if="erroreCodice" class="testo-errore">{{ erroreCodice }}</span>
          <span v-else class="nota-crea">Inserisci il codice mostrato sull'altro dispositivo</span>
        </form>
      </div>
    </section>

    <!-- Pilastri / Caratteristiche Chiave -->
    <section id="come-funziona" class="sezione-pilastri">
      <h2 class="titolo-sezione">Come Funziona ep-drop</h2>
      <div class="griglia-pilastri">
        <div class="scheda-pilastro">
          <div class="icona-box">⚡</div>
          <h3>Live Clipboard Sincronizzata</h3>
          <p>Incolli un codice, un link o un appunto sul telefono e appare istantaneamente sul tuo computer in tempo reale con copia in 1 click.</p>
        </div>

        <div class="scheda-pilastro">
          <div class="icona-box">📁</div>
          <h3>Drag & Drop File Streaming</h3>
          <p>Trascina documenti, immagini, video o archivi compressi. Il file viene frazionato in chunk crittografati e inviato senza limiti di dimensione artificiali.</p>
        </div>

        <div class="scheda-pilastro">
          <div class="icona-box">🔒</div>
          <h3>Crittografia & Zero Persistence</h3>
          <p>Nessun file o testo viene salvato su database. Il canale WebRTC è diretto e i pacchetti WebSocket risiedono esclusivamente nella memoria volatile (RAM) durante il passaggio.</p>
        </div>
      </div>
    </section>

    <!-- Sezione Sicurezza -->
    <section id="sicurezza" class="sezione-sicurezza">
      <div class="box-sicurezza">
        <div class="sicurezza-testo">
          <h3>Architettura Edge & Cloudflare Durable Objects</h3>
          <p>
            Il coordinamento delle stanze di <strong>ep-drop</strong> è gestito da un Cloudflare Worker a bassissima latenza che sfrutta <strong>Durable Objects</strong> con WebSockets bidirezionali. Una volta scambiata la segnalazione, il trasferimento dei dati avviene preferibilmente via WebRTC DataChannel p2p per garantire il massimo throughput.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pagina-home {
  padding: 2.5rem 0 4rem;
  max-width: 900px;
  margin: 0 auto;
}

.sezione-hero {
  padding: 2rem 0 3.5rem;
}

.testata-hero-badge {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
  margin-bottom: 1.4rem;
}

.badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.32rem 0.8rem;
  background: var(--accento-sfondo);
  color: var(--accento);
  border: 1px solid var(--accento-bordo);
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--accento);
}

.titolo-hero {
  font-size: 2.6rem;
  font-weight: 850;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--testo-primario);
  margin-bottom: 1.15rem;
}

.sottotitolo-hero {
  font-size: 1.1rem;
  line-height: 1.65;
  color: var(--testo-secondario);
  margin-bottom: 2.5rem;
  max-width: 740px;
}

/* Scheda Azione Stanza */
.scheda-azione-stanza {
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: var(--ombra-scheda);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
}

.blocco-crea, .blocco-unisciti {
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-primario {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: var(--accento);
  color: #ffffff;
  border: none;
  padding: 0.85rem 1.4rem;
  border-radius: 10px;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 4px 14px var(--accento-sfondo-forte);
}

.btn-primario:hover {
  background: var(--accento-hover);
  transform: translateY(-1px);
}

.nota-crea {
  font-size: 0.78rem;
  color: var(--testo-terziario);
}

.divisore-o {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--testo-terziario);
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
}

.input-gruppo {
  display: flex;
  gap: 0.5rem;
}

.input-codice {
  flex: 1;
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: var(--testo-primario);
  font-family: ui-monospace, monospace;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  outline: none;
}

.input-codice:focus {
  border-color: var(--accento-bordo);
  box-shadow: 0 0 0 2px var(--accento-sfondo);
}

.btn-secondario {
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  color: var(--testo-primario);
  padding: 0 1.25rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondario:hover {
  border-color: var(--accento-bordo);
  color: var(--accento);
}

.testo-errore {
  font-size: 0.78rem;
  color: #ef4444;
  font-weight: 600;
}

/* Pilastri */
.sezione-pilastri {
  padding: 3rem 0;
  border-top: 1px solid var(--bordo-sottile);
}

.titolo-sezione {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--testo-primario);
  letter-spacing: -0.02em;
  margin-bottom: 1.75rem;
}

.griglia-pilastri {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.scheda-pilastro {
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-sottile);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.scheda-pilastro:hover {
  border-color: var(--bordo-medio);
  transform: translateY(-2px);
}

.icona-box {
  font-size: 1.6rem;
  margin-bottom: 0.85rem;
}

.scheda-pilastro h3 {
  font-size: 1.1rem;
  font-weight: 750;
  color: var(--testo-primario);
  margin-bottom: 0.5rem;
}

.scheda-pilastro p {
  font-size: 0.92rem;
  color: var(--testo-secondario);
  line-height: 1.55;
}

/* Sicurezza */
.sezione-sicurezza {
  padding: 1.5rem 0 3rem;
}

.box-sicurezza {
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  border-radius: 14px;
  padding: 1.75rem;
}

.sicurezza-testo h3 {
  font-size: 1.15rem;
  font-weight: 750;
  color: var(--testo-primario);
  margin-bottom: 0.5rem;
}

.sicurezza-testo p {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--testo-secondario);
}

@media (max-width: 680px) {
  .titolo-hero {
    font-size: 2.1rem;
  }
  .scheda-azione-stanza {
    flex-direction: column;
    align-items: stretch;
  }
  .divisore-o {
    margin: 0.5rem 0;
  }
}
</style>
