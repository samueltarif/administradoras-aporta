<script setup lang="ts">
import type { LoadStrategy } from '~/composables/useCondoViewer'

// Visualizador 3D reutilizável (login e cadastro do condomínio). O pôster estático é renderizado
// no SSR com dimensões fixas (sem layout shift) e serve de fallback se WebGL/GLB falhar.
const props = withDefaults(defineProps<{
  autoRotate?: boolean
  interactive?: boolean
  loadOn?: LoadStrategy
  showReset?: boolean
  tone?: 'dark' | 'light'
}>(), { autoRotate: false, interactive: true, loadOn: 'visible', showReset: false, tone: 'light' })

const root = useTemplateRef<HTMLElement>('root')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const { state, start, reset } = useCondoViewer(root, canvas, props)
const message = computed(() => ({
  idle: '', loading: 'Carregando visualização 3D…', ready: 'Visualização 3D carregada. Arraste para girar e use a roda do mouse ou o gesto de pinça para aproximar.',
  unsupported: 'Seu navegador não oferece WebGL: exibindo imagem estática.', failed: 'Não foi possível carregar o modelo 3D: exibindo imagem estática.',
})[state.value])
const btn = computed(() => (props.tone === 'dark'
  ? 'bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20'
  : 'bg-white/90 text-brand-blue ring-1 ring-border hover:bg-white'))
</script>

<template>
  <div ref="root" class="relative size-full select-none" role="img" aria-label="Representação 3D genérica de um condomínio residencial">
    <img
src="/animation/condominio_3d_poster.webp" alt="" width="960" height="640" decoding="async"
      class="pointer-events-none absolute inset-0 size-full object-contain transition-opacity duration-500"
      :class="state === 'ready' ? 'opacity-0' : 'opacity-100'">
    <canvas
ref="canvas" class="absolute inset-0 size-full transition-opacity duration-500"
      :class="[state === 'ready' ? 'opacity-100' : 'opacity-0', interactive && state === 'ready' ? 'cursor-grab touch-none active:cursor-grabbing' : 'pointer-events-none']" />
    <div class="absolute right-3 bottom-3 flex gap-2">
      <button v-if="state === 'idle' && loadOn === 'click'" type="button" class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium backdrop-blur" :class="btn" @click="start">
        <Icon name="lucide:rotate-3d" class="size-4" /> Ver em 3D
      </button>
      <span v-if="state === 'loading'" class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs backdrop-blur" :class="btn">
        <Icon name="lucide:loader-circle" class="size-4 animate-spin" /> Carregando 3D
      </span>
      <button v-if="state === 'ready' && showReset" type="button" class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium backdrop-blur" :class="btn" @click="reset">
        <Icon name="lucide:rotate-ccw" class="size-4" /> Reiniciar visualização
      </button>
    </div>
    <p class="sr-only" aria-live="polite">{{ message }}</p>
    <p v-if="state === 'unsupported' || state === 'failed'" class="absolute bottom-3 left-3 rounded-md px-2 py-1 text-[11px] backdrop-blur" :class="btn">
      Imagem estática (3D indisponível)
    </p>
  </div>
</template>
