<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Contatore from '../components/Contatore.vue'
import { useLingua } from '../composables/useLingua'

const { isItalian, t } = useLingua()
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
    erroreCodice.value = isItalian.value
      ? 'Inserisci un codice stanza valido (es. K9X-2M)'
      : 'Enter a valid room code (e.g. K9X-2M)'
    return
  }
  erroreCodice.value = ''
  staVerificando.value = true

  try {
    const res = await fetch(`${API_BASE}/api/rooms/check?app=drop&room=${encodeURIComponent(pulito)}`)
    if (!res.ok) {
      erroreCodice.value = isItalian.value
        ? 'Impossibile verificare la stanza. Riprova.'
        : 'Unable to verify room. Please retry.'
      return
    }
    const data = await res.json()
    if (!data.exists) {
      erroreCodice.value = isItalian.value
        ? 'Stanza non trovata. Controlla il codice inserito o creane una nuova.'
        : 'Room not found. Check the code or create a new room.'
      return
    }
    router.push(`/room/${pulito}`)
  } catch (err) {
    erroreCodice.value = isItalian.value
      ? 'Errore di connessione al server delle stanze.'
      : 'Connection error to room server.'
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
          {{ t('home.badge') }}
        </div>
        <Contatore />
      </div>

      <h1 class="titolo-hero">
        {{ t('home.titolo') }}
      </h1>

      <p class="sottotitolo-hero">
        {{ t('home.sottotitolo') }}
      </p>

      <!-- Azioni Rapide Stanza -->
      <div class="scheda-azione-stanza">
        <div class="blocco-crea">
          <button type="button" class="btn-primario" :disabled="staCreando" @click="creaNuovaStanza">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {{ staCreando ? t('home.creando') : t('home.crea') }}
          </button>
          <span class="nota-crea">{{ t('home.notaCrea') }}</span>
        </div>

        <div class="divisore-o">
          <span>{{ t('home.oppure') }}</span>
        </div>

        <form class="blocco-unisciti" @submit.prevent="entraInStanza">
          <div class="input-gruppo">
            <input
              v-model="codiceInserito"
              type="text"
              :placeholder="t('home.placeholderCodice')"
              maxlength="12"
              class="input-codice"
              :disabled="staVerificando"
            />
            <button type="submit" class="btn-secondario" :disabled="staVerificando">
              {{ staVerificando ? t('home.verificando') : t('home.entra') }}
            </button>
          </div>
          <span v-if="erroreCodice" class="testo-errore">{{ erroreCodice }}</span>
          <span v-else class="nota-crea">{{ t('home.notaEntra') }}</span>
        </form>
      </div>
    </section>

    <!-- Pilastri / Caratteristiche Chiave -->
    <section id="come-funziona" class="sezione-pilastri">
      <h2 class="titolo-sezione">{{ t('home.sezFunziona') }}</h2>
      <div class="griglia-pilastri">
        <div class="scheda-pilastro">
          <div class="icona-box">⚡</div>
          <h3>{{ t('home.f1Titolo') }}</h3>
          <p>{{ t('home.f1Desc') }}</p>
        </div>

        <div class="scheda-pilastro">
          <div class="icona-box">📁</div>
          <h3>{{ t('home.f2Titolo') }}</h3>
          <p>{{ t('home.f2Desc') }}</p>
        </div>

        <div class="scheda-pilastro">
          <div class="icona-box">🔒</div>
          <h3>{{ t('home.f3Titolo') }}</h3>
          <p>{{ t('home.f3Desc') }}</p>
        </div>
      </div>
    </section>

    <!-- Sezione Sicurezza -->
    <section id="sicurezza" class="sezione-sicurezza">
      <div class="box-sicurezza">
        <div class="sicurezza-testo">
          <h3>{{ t('home.secTitolo') }}</h3>
          <p v-html="t('home.secDesc')"></p>
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
