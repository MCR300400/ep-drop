<script setup>
import { computed } from 'vue'
import { useLingua } from '../composables/useLingua'

const { isItalian, t } = useLingua()

const props = defineProps({
  mostra: {
    type: Boolean,
    default: false
  },
  url: {
    type: String,
    required: true
  },
  codiceStanza: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['chiudi'])

// QR code generato via API rapida per massima affidabilità e zero dipendenze pesanti
const qrImageUrl = computed(() => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(props.url)}&bgcolor=ffffff&color=121316&margin=2`
})
</script>

<template>
  <div v-if="mostra" class="modal-overlay" @click.self="emit('chiudi')">
    <div class="modal-card">
      <div class="modal-top">
        <h3>{{ t('qr.titolo') }}</h3>
        <button type="button" class="btn-chiudi" :aria-label="isItalian ? 'Chiudi' : 'Close'" @click="emit('chiudi')">&times;</button>
      </div>

      <p class="modal-istruzioni">
        {{ t('qr.istruzioni') }} <strong>{{ codiceStanza }}</strong>.
      </p>

      <div class="qr-box">
        <img :src="qrImageUrl" :alt="isItalian ? 'QR Code di accesso alla stanza' : 'Room access QR code'" class="qr-img" width="220" height="220" />
      </div>

      <div class="url-condivisione">
        <input type="text" readonly :value="url" class="input-url" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1.5rem;
}

.modal-card {
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 16px;
  width: 100%;
  max-width: 380px;
  padding: 1.6rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.modal-top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.modal-top h3 {
  font-size: 1.15rem;
  font-weight: 750;
  color: var(--testo-primario);
}

.btn-chiudi {
  background: none;
  border: none;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--testo-terziario);
  cursor: pointer;
  padding: 0.2rem;
}

.btn-chiudi:hover {
  color: var(--accento);
}

.modal-istruzioni {
  font-size: 0.88rem;
  color: var(--testo-secondario);
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.modal-istruzioni strong {
  color: var(--accento);
}

.qr-box {
  background: #ffffff;
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid var(--bordo-medio);
  box-shadow: var(--ombra-scheda);
  margin-bottom: 1.25rem;
}

.qr-img {
  display: block;
  border-radius: 6px;
}

.url-condivisione {
  width: 100%;
}

.input-url {
  width: 100%;
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  color: var(--testo-secondario);
  padding: 0.55rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-family: ui-monospace, monospace;
  text-align: center;
  outline: none;
}
</style>
