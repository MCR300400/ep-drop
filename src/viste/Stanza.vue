<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCodeModal from '../components/QRCodeModal.vue'

const route = useRoute()
const router = useRouter()

const codiceStanza = computed(() => (route.params.code || '').toUpperCase())
const urlStanza = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/room/${codiceStanza.value}`
})

const WS_BASE = import.meta.env.VITE_WS_URL || 'wss://ep-ws.edoardopippi00.workers.dev'

// Stato peer locale
const peerId = crypto.randomUUID()
const nomeDispositivo = ref(rilevaDispositivo())
const tipoDispositivo = ref(rilevaIconaDispositivo())

// Stato connessione WebSocket
const ws = ref(null)
const statoConnessione = ref('connessione') // connessione, connesso, disconnesso
const peersConnessi = ref([])

// Live Clipboard
const testoClipboard = ref('')
const ultimoTestoRicevuto = ref('')
const autoreUltimoTesto = ref('')
const copiatoSuccesso = ref(false)

// File Sharing
const fileInInvio = ref(null)
const progressoInvio = ref(0)
const fileInRicezione = ref(null)
const progressoRicezione = ref(0)
const fileCompletati = ref([])
const trascinamentoAttivo = ref(false)

// Modal QR Code
const mostraQRCode = ref(false)
const linkCopiato = ref(false)

// Chunks in ricezione
let bufferRicezione = {}

function rilevaDispositivo() {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone/iPad'
  if (/Macintosh|Mac OS X/.test(ua)) return 'MacBook'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'PC Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Browser'
}

function rilevaIconaDispositivo() {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'mobile'
  if (/Android/.test(ua)) return 'mobile'
  if (/Macintosh|Mac OS X/.test(ua)) return 'laptop'
  if (/Windows/.test(ua)) return 'desktop'
  return 'screen'
}

function connettiWebSocket() {
  statoConnessione.value = 'connessione'
  const wsUrl = `${WS_BASE}/ws?room=${encodeURIComponent(codiceStanza.value)}&app=drop`

  try {
    const socket = new WebSocket(wsUrl)
    ws.value = socket

    socket.onopen = () => {
      statoConnessione.value = 'connesso'
      inviaMessaggio({
        tipo: 'peer-join',
        peerId,
        nome: nomeDispositivo.value,
        dispositivo: tipoDispositivo.value
      })
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        gestisciMessaggio(msg)
      } catch (err) {
        console.error('Messaggio WS non JSON:', err)
      }
    }

    socket.onclose = () => {
      statoConnessione.value = 'disconnesso'
      // Riconnessione automatica dopo 3 secondi
      setTimeout(() => {
        if (statoConnessione.value === 'disconnesso') {
          connettiWebSocket()
        }
      }, 3000)
    }

    socket.onerror = () => {
      statoConnessione.value = 'disconnesso'
    }
  } catch (err) {
    statoConnessione.value = 'disconnesso'
  }
}

function inviaMessaggio(dati) {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify(dati))
  }
}

function gestisciMessaggio(msg) {
  switch (msg.tipo) {
    case 'peer-join':
      // Se un nuovo peer entra, gli rispondiamo con la nostra presenza
      if (msg.peerId !== peerId) {
        if (!peersConnessi.value.some(p => p.id === msg.peerId)) {
          peersConnessi.value.push({
            id: msg.peerId,
            nome: msg.nome,
            dispositivo: msg.dispositivo
          })
        }
        inviaMessaggio({
          tipo: 'peer-presence',
          peerId,
          nome: nomeDispositivo.value,
          dispositivo: tipoDispositivo.value
        })
      }
      break

    case 'peer-presence':
      if (msg.peerId !== peerId && !peersConnessi.value.some(p => p.id === msg.peerId)) {
        peersConnessi.value.push({
          id: msg.peerId,
          nome: msg.nome,
          dispositivo: msg.dispositivo
        })
      }
      break

    case 'peer-left':
      peersConnessi.value = peersConnessi.value.filter(p => p.id !== msg.peerId)
      break

    case 'clipboard-sync':
      if (msg.peerId !== peerId) {
        ultimoTestoRicevuto.value = msg.testo
        autoreUltimoTesto.value = msg.nomeMittente || 'Altro dispositivo'
        testoClipboard.value = msg.testo
      }
      break

    case 'file-start':
      if (msg.peerId !== peerId) {
        bufferRicezione[msg.fileId] = {
          nome: msg.nome,
          dimensione: msg.dimensione,
          tipo: msg.mimeTipo,
          totaleChunk: msg.totaleChunk,
          chunkRicevuti: []
        }
        fileInRicezione.value = {
          nome: msg.nome,
          dimensione: msg.dimensione,
          da: msg.nomeMittente
        }
        progressoRicezione.value = 0
      }
      break

    case 'file-chunk':
      if (msg.peerId !== peerId && bufferRicezione[msg.fileId]) {
        const item = bufferRicezione[msg.fileId]
        item.chunkRicevuti[msg.indice] = msg.datiBase64
        progressoRicezione.value = Math.round((item.chunkRicevuti.filter(Boolean).length / item.totaleChunk) * 100)

        if (item.chunkRicevuti.filter(Boolean).length === item.totaleChunk) {
          assemblaFileScaricabile(msg.fileId)
        }
      }
      break
  }
}

// Invia aggiornamento Live Clipboard
function sincronizzaAppunti() {
  if (!testoClipboard.value.trim()) return
  inviaMessaggio({
    tipo: 'clipboard-sync',
    peerId,
    nomeMittente: nomeDispositivo.value,
    testo: testoClipboard.value
  })
}

async function copiaNegliAppunti(testo) {
  try {
    await navigator.clipboard.writeText(testo)
    copiatoSuccesso.value = true
    setTimeout(() => {
      copiatoSuccesso.value = false
    }, 2000)
  } catch (err) {
    console.error('Impossibile copiare negli appunti:', err)
  }
}

async function copiaLinkStanza() {
  try {
    await navigator.clipboard.writeText(urlStanza.value)
    linkCopiato.value = true
    setTimeout(() => {
      linkCopiato.value = false
    }, 2000)
  } catch (err) {}
}

// Invio File frazionato in Chunk da 32KB
const CHUNK_SIZE = 32 * 1024

async function gestisciSelezioneFile(event) {
  const files = event.target.files
  if (!files || files.length === 0) return
  for (const file of files) {
    await inviaSingoloFile(file)
  }
}

async function gestisciDrop(event) {
  trascinamentoAttivo.value = false
  const files = event.dataTransfer.files
  if (!files || files.length === 0) return
  for (const file of files) {
    await inviaSingoloFile(file)
  }
}

async function inviaSingoloFile(file) {
  const fileId = crypto.randomUUID()
  const totaleChunk = Math.ceil(file.size / CHUNK_SIZE)

  fileInInvio.value = {
    nome: file.name,
    dimensione: file.size
  }
  progressoInvio.value = 0

  inviaMessaggio({
    tipo: 'file-start',
    fileId,
    peerId,
    nomeMittente: nomeDispositivo.value,
    nome: file.name,
    dimensione: file.size,
    mimeTipo: file.type || 'application/octet-stream',
    totaleChunk
  })

  for (let i = 0; i < totaleChunk; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const slice = file.slice(start, end)
    const base64 = await convertiBlobInBase64(slice)

    inviaMessaggio({
      tipo: 'file-chunk',
      fileId,
      peerId,
      indice: i,
      datiBase64: base64
    })

    progressoInvio.value = Math.round(((i + 1) / totaleChunk) * 100)
    // Piccolo throttle per non saturare il buffer del socket
    await new Promise(r => setTimeout(r, 12))
  }

  fileCompletati.value.unshift({
    id: fileId,
    nome: file.name,
    dimensione: file.size,
    data: new Date().toLocaleTimeString(),
    direzione: 'inviato'
  })

  fileInInvio.value = null
  progressoInvio.value = 0
}

function convertiBlobInBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1]
      resolve(base64data)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function assemblaFileScaricabile(fileId) {
  const item = bufferRicezione[fileId]
  if (!item) return

  const byteCharacters = item.chunkRicevuti.map(b64 => atob(b64)).join('')
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: item.tipo })
  const url = URL.createObjectURL(blob)

  fileCompletati.value.unshift({
    id: fileId,
    nome: item.nome,
    dimensione: item.dimensione,
    url,
    data: new Date().toLocaleTimeString(),
    direzione: 'ricevuto'
  })

  fileInRicezione.value = null
  progressoRicezione.value = 0
  delete bufferRicezione[fileId]

  // Notifica visiva / download automatico
  scaricaFile(url, item.nome)
}

function scaricaFile(url, nome) {
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function formattaDimensione(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

onMounted(() => {
  connettiWebSocket()
})

onUnmounted(() => {
  if (ws.value) {
    inviaMessaggio({ tipo: 'peer-left', peerId })
    ws.value.close()
  }
})
</script>

<template>
  <div class="pagina-stanza">
    <!-- Testata Stanza & Azioni Rapide -->
    <div class="testata-stanza">
      <div class="info-stanza-sinistra">
        <button type="button" class="btn-ritorno" @click="router.push('/')">
          &larr; Esci
        </button>
        <div class="badge-codice-stanza">
          <span class="label-stanza">STANZA:</span>
          <span class="valore-stanza">{{ codiceStanza }}</span>
        </div>
        <div class="stato-dot-connessione" :class="statoConnessione" :title="`Stato: ${statoConnessione}`">
          <span class="dot-ws"></span>
          <span class="testo-ws">{{ statoConnessione }}</span>
        </div>
      </div>

      <div class="info-stanza-destra">
        <button type="button" class="btn-stanza-azione" @click="copiaLinkStanza">
          {{ linkCopiato ? 'Link Copiato! ✓' : 'Copia Link Stanza' }}
        </button>
        <button type="button" class="btn-stanza-azione btn-qr" @click="mostraQRCode = true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          QR Code Smartphone
        </button>
      </div>
    </div>

    <!-- Barra Dispositivi Connessi (Radar P2P) -->
    <section class="sezione-radar">
      <div class="radar-box">
        <div class="radar-header">
          <span class="radar-titolo">Dispositivi Connessi in Stanza ({{ peersConnessi.length + 1 }})</span>
          <span class="radar-sub">Condivisione attiva in tempo reale</span>
        </div>

        <div class="radar-dispositivi-grid">
          <!-- Dispositivo Corrente -->
          <div class="scheda-dispositivo me">
            <div class="icona-device-box">
              <span class="device-badge">Tu</span>
              💻
            </div>
            <span class="nome-device">{{ nomeDispositivo }}</span>
            <span class="ip-device">Dispositivo locale</span>
          </div>

          <!-- Altri Peer nella Stanza -->
          <div
            v-for="peer in peersConnessi"
            :key="peer.id"
            class="scheda-dispositivo peer"
          >
            <div class="icona-device-box">
              <span class="device-badge online">P2P</span>
              📱
            </div>
            <span class="nome-device">{{ peer.nome }}</span>
            <span class="ip-device">Pronto per lo scambio</span>
          </div>

          <!-- Placeholder se nessun altro peer è connesso -->
          <div v-if="peersConnessi.length === 0" class="scheda-attesa">
            <div class="animazione-radar-onda"></div>
            <p>In attesa di un altro dispositivo...</p>
            <span class="nota-attesa">Apri questo link o inquadra il QR Code dal telefono</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Griglia a 2 Colonne: Live Clipboard & File Drop -->
    <div class="griglia-scambio">
      <!-- Colonna 1: Live Clipboard Sincronizzata -->
      <section class="colonna-scambio">
        <div class="pannello-scheda">
          <div class="pannello-top">
            <div class="titolo-pannello-box">
              <span class="icona-sez">📋</span>
              <h3>Live Clipboard Istantanea</h3>
            </div>
            <button
              v-if="testoClipboard"
              type="button"
              class="btn-copia-clip"
              @click="copiaNegliAppunti(testoClipboard)"
            >
              {{ copiatoSuccesso ? 'Copiato! ✓' : 'Copia Testo' }}
            </button>
          </div>

          <p class="desc-pannello">
            Incolla testo, link, credenziali temporanee o snippet di codice. Si sincronizza in tempo reale con tutti i dispositivi nella stanza.
          </p>

          <textarea
            v-model="testoClipboard"
            placeholder="Scrivi o incolla qui il testo da inviare all'altro dispositivo..."
            class="textarea-clipboard"
            rows="7"
            @input="sincronizzaAppunti"
          ></textarea>

          <div class="footer-clipboard">
            <span class="conteggio-char">{{ testoClipboard.length }} caratteri</span>
            <button type="button" class="btn-invia-manuale" @click="sincronizzaAppunti">
              Invia & Sincronizza &rarr;
            </button>
          </div>

          <div v-if="ultimoTestoRicevuto" class="banner-ricevuto">
            <span class="badge-mittente">Ricevuto da {{ autoreUltimoTesto }}</span>
            <p class="testo-preview">{{ ultimoTestoRicevuto }}</p>
          </div>
        </div>
      </section>

      <!-- Colonna 2: Drag & Drop File Sharing -->
      <section class="colonna-scambio">
        <div class="pannello-scheda">
          <div class="pannello-top">
            <div class="titolo-pannello-box">
              <span class="icona-sez">📁</span>
              <h3>Trasferimento File P2P</h3>
            </div>
          </div>

          <p class="desc-pannello">
            Trascina qualsiasi file qui dentro oppure sfoglia dal tuo dispositivo per avviare il trasferimento streaming diretto.
          </p>

          <!-- Zona Drag & Drop -->
          <div
            class="drop-zone"
            :class="{ attiva: trascinamentoAttivo }"
            @dragover.prevent="trascinamentoAttivo = true"
            @dragleave.prevent="trascinamentoAttivo = false"
            @drop.prevent="gestisciDrop"
          >
            <input
              type="file"
              multiple
              class="input-file-nascosto"
              id="file-input-stanza"
              @change="gestisciSelezioneFile"
            />
            <label for="file-input-stanza" class="label-drop-zone">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icona-upload">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span class="testo-drop-primario">Trascina i file qui dentro</span>
              <span class="testo-drop-secondario">oppure <strong class="link-sfoglia">sfoglia dal dispositivo</strong></span>
            </label>
          </div>

          <!-- Barra di Progresso Invio -->
          <div v-if="fileInInvio" class="progresso-box invio">
            <div class="progresso-info">
              <span class="nome-fl">Invio: {{ fileInInvio.nome }}</span>
              <span class="perc-fl">{{ progressoInvio }}%</span>
            </div>
            <div class="traccia-prog">
              <div class="barra-prog" :style="{ width: `${progressoInvio}%` }"></div>
            </div>
          </div>

          <!-- Barra di Progresso Ricezione -->
          <div v-if="fileInRicezione" class="progresso-box ricezione">
            <div class="progresso-info">
              <span class="nome-fl">Ricezione: {{ fileInRicezione.nome }} ({{ formattaDimensione(fileInRicezione.dimensione) }})</span>
              <span class="perc-fl">{{ progressoRicezione }}%</span>
            </div>
            <div class="traccia-prog">
              <div class="barra-prog prog-verde" :style="{ width: `${progressoRicezione}%` }"></div>
            </div>
          </div>

          <!-- Cronologia File Trasferiti nella Sessione -->
          <div v-if="fileCompletati.length > 0" class="cronologia-file">
            <span class="titolo-crono">File Trasferiti ({{ fileCompletati.length }})</span>
            <div class="lista-crono">
              <div
                v-for="item in fileCompletati"
                :key="item.id"
                class="item-file-crono"
              >
                <div class="crono-sinistra">
                  <span class="icona-crono">{{ item.direzione === 'inviato' ? '📤' : '📥' }}</span>
                  <div>
                    <span class="crono-nome">{{ item.nome }}</span>
                    <span class="crono-meta">{{ formattaDimensione(item.dimensione) }} • {{ item.data }}</span>
                  </div>
                </div>

                <button
                  v-if="item.url"
                  type="button"
                  class="btn-scarica-crono"
                  @click="scaricaFile(item.url, item.nome)"
                >
                  Scarica
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Modal QR Code -->
    <QRCodeModal
      :mostra="mostraQRCode"
      :url="urlStanza"
      :codice-stanza="codiceStanza"
      @chiudi="mostraQRCode = false"
    />
  </div>
</template>

<style scoped>
.pagina-stanza {
  padding: 2rem 0 4rem;
  max-width: 980px;
  margin: 0 auto;
}

/* Testata Stanza */
.testata-stanza {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 14px;
  padding: 0.95rem 1.4rem;
  margin-bottom: 1.75rem;
  box-shadow: var(--ombra-scheda);
  flex-wrap: wrap;
  gap: 1rem;
}

.info-stanza-sinistra {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-ritorno {
  background: none;
  border: 1px solid var(--bordo-sottile);
  color: var(--testo-secondario);
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-ritorno:hover {
  border-color: var(--accento-bordo);
  color: var(--accento);
}

.badge-codice-stanza {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.label-stanza {
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  color: var(--testo-terziario);
}

.valore-stanza {
  font-family: ui-monospace, monospace;
  font-size: 1.15rem;
  font-weight: 850;
  color: var(--accento);
  letter-spacing: 0.05em;
}

.stato-dot-connessione {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.76rem;
  font-weight: 650;
  text-transform: capitalize;
}

.dot-ws {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.stato-dot-connessione.connesso .dot-ws {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.7);
}

.stato-dot-connessione.connessione .dot-ws {
  background: #f59e0b;
}

.stato-dot-connessione.disconnesso .dot-ws {
  background: #ef4444;
}

.info-stanza-destra {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.btn-stanza-azione {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  color: var(--testo-primario);
  padding: 0.42rem 0.85rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-stanza-azione:hover {
  border-color: var(--accento-bordo);
  color: var(--accento);
}

.btn-qr {
  background: var(--accento-sfondo);
  border-color: var(--accento-bordo);
  color: var(--accento);
}

/* Radar Dispositivi */
.sezione-radar {
  margin-bottom: 2rem;
}

.radar-box {
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-sottile);
  border-radius: 14px;
  padding: 1.4rem;
}

.radar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.radar-titolo {
  font-size: 0.95rem;
  font-weight: 750;
  color: var(--testo-primario);
}

.radar-sub {
  font-size: 0.8rem;
  color: var(--testo-terziario);
}

.radar-dispositivi-grid {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.scheda-dispositivo {
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 140px;
  gap: 0.35rem;
  position: relative;
}

.scheda-dispositivo.me {
  border-color: var(--accento-bordo);
  background: var(--accento-sfondo);
}

.icona-device-box {
  font-size: 1.6rem;
  position: relative;
  margin-bottom: 0.2rem;
}

.device-badge {
  position: absolute;
  top: -6px;
  right: -16px;
  background: var(--accento);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
}

.device-badge.online {
  background: #10b981;
}

.nome-device {
  font-size: 0.86rem;
  font-weight: 750;
  color: var(--testo-primario);
}

.ip-device {
  font-size: 0.72rem;
  color: var(--testo-terziario);
}

.scheda-attesa {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.4rem;
  background: var(--bg-primario);
  border: 1px dashed var(--bordo-medio);
  border-radius: 12px;
  color: var(--testo-secondario);
  font-size: 0.88rem;
  flex: 1;
  min-width: 260px;
}

.animazione-radar-onda {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accento);
  box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7);
  animation: radar-pulse 2s infinite;
}

@keyframes radar-pulse {
  0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
  100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
}

.nota-attesa {
  font-size: 0.75rem;
  color: var(--testo-terziario);
  display: block;
}

/* Griglia Scambio */
.griglia-scambio {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.pannello-scheda {
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-sottile);
  border-radius: 16px;
  padding: 1.6rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pannello-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.titolo-pannello-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.titolo-pannello-box h3 {
  font-size: 1.15rem;
  font-weight: 750;
  color: var(--testo-primario);
}

.icona-sez {
  font-size: 1.3rem;
}

.desc-pannello {
  font-size: 0.85rem;
  color: var(--testo-secondario);
  line-height: 1.5;
  margin-bottom: 1.15rem;
}

/* Clipboard */
.textarea-clipboard {
  width: 100%;
  background: var(--bg-primario);
  border: 1px solid var(--bordo-medio);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  color: var(--testo-primario);
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  margin-bottom: 0.6rem;
}

.textarea-clipboard:focus {
  border-color: var(--accento-bordo);
}

.footer-clipboard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.conteggio-char {
  font-size: 0.75rem;
  color: var(--testo-terziario);
}

.btn-invia-manuale {
  background: var(--accento);
  color: #ffffff;
  border: none;
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-invia-manuale:hover {
  background: var(--accento-hover);
}

.btn-copia-clip {
  background: var(--accento-sfondo);
  border: 1px solid var(--accento-bordo);
  color: var(--accento);
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.banner-ricevuto {
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  margin-top: auto;
}

.badge-mittente {
  font-size: 0.7rem;
  font-weight: 750;
  text-transform: uppercase;
  color: var(--accento);
  display: block;
  margin-bottom: 0.3rem;
}

.testo-preview {
  font-size: 0.85rem;
  color: var(--testo-primario);
  word-break: break-word;
}

/* File Drop Zone */
.drop-zone {
  border: 2px dashed var(--bordo-medio);
  border-radius: 12px;
  background: var(--bg-primario);
  padding: 2.25rem 1.5rem;
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 1.25rem;
}

.drop-zone:hover, .drop-zone.attiva {
  border-color: var(--accento);
  background: var(--accento-sfondo);
}

.input-file-nascosto {
  display: none;
}

.label-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.icona-upload {
  color: var(--accento);
  margin-bottom: 0.25rem;
}

.testo-drop-primario {
  font-size: 0.95rem;
  font-weight: 750;
  color: var(--testo-primario);
}

.testo-drop-secondario {
  font-size: 0.82rem;
  color: var(--testo-terziario);
}

.link-sfoglia {
  color: var(--accento);
  text-decoration: underline;
}

/* Progress bar */
.progresso-box {
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.progresso-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 650;
  color: var(--testo-primario);
  margin-bottom: 0.4rem;
}

.traccia-prog {
  height: 6px;
  background: var(--bg-primario);
  border-radius: 999px;
  overflow: hidden;
}

.barra-prog {
  height: 100%;
  background: var(--accento);
  transition: width 0.15s ease;
}

.barra-prog.prog-verde {
  background: #10b981;
}

/* Cronologia */
.cronologia-file {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.titolo-crono {
  font-size: 0.76rem;
  font-weight: 750;
  text-transform: uppercase;
  color: var(--testo-terziario);
  letter-spacing: 0.05em;
}

.lista-crono {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 180px;
  overflow-y: auto;
}

.item-file-crono {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-primario);
  border: 1px solid var(--bordo-sottile);
  border-radius: 8px;
  padding: 0.55rem 0.85rem;
}

.crono-sinistra {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  overflow: hidden;
}

.icona-crono {
  font-size: 1.1rem;
}

.crono-nome {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--testo-primario);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.crono-meta {
  font-size: 0.7rem;
  color: var(--testo-terziario);
}

.btn-scarica-crono {
  background: var(--accento-sfondo);
  border: 1px solid var(--accento-bordo);
  color: var(--accento);
  padding: 0.25rem 0.6rem;
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 768px) {
  .griglia-scambio {
    grid-template-columns: 1fr;
  }
}
</style>
