import type { Ref } from 'vue'
import type { CondoScene } from '~/lib/three/condo-scene'
import { hasWebGL, prefersReducedMotion } from '~/lib/three/webgl'

export type ViewerState = 'idle' | 'loading' | 'ready' | 'unsupported' | 'failed'
export type LoadStrategy = 'idle' | 'visible' | 'click'

interface Options { autoRotate: boolean, interactive: boolean, loadOn: LoadStrategy }

/**
 * Orquestra o visualizador: baixa three.js + GLB só quando necessário, pausa a renderização
 * fora da tela/aba oculta e libera GPU/memória ao desmontar. Falhas nunca quebram a página.
 */
export function useCondoViewer(root: Ref<HTMLElement | null>, canvas: Ref<HTMLCanvasElement | null>, opts: Options) {
  const state = ref<ViewerState>('idle')
  let scene: CondoScene | null = null
  let visible = false
  let io: IntersectionObserver | undefined
  let ro: ResizeObserver | undefined
  let idleHandle: number | undefined
  let disposed = false

  const syncActive = () => scene?.setActive(visible && document.visibilityState === 'visible')

  async function start() {
    if (state.value !== 'idle' || !canvas.value) return
    // Instância oculta por CSS (ex.: versão desktop no celular) não inicia sozinha: no máximo um WebGL por tela.
    if (opts.loadOn !== 'click' && !root.value?.offsetWidth) return
    if (!hasWebGL()) { state.value = 'unsupported'; return }
    state.value = 'loading'
    try {
      const { createCondoScene } = await import('~/lib/three/condo-scene')
      const created = await createCondoScene(canvas.value, {
        autoRotate: opts.autoRotate, interactive: opts.interactive, reducedMotion: prefersReducedMotion(),
        maxPixelRatio: 1.5, shadows: window.innerWidth >= 768,
      })
      if (disposed) { created.dispose(); return }
      scene = created
      state.value = 'ready'
      syncActive()
    }
    catch (e) {
      console.warn('[3D] visualização indisponível:', e instanceof Error ? e.message : e)
      state.value = 'failed'
    }
  }

  onMounted(() => {
    if (!root.value) return
    io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      if (visible && opts.loadOn === 'visible') start()
      syncActive()
    }, { rootMargin: '100px' })
    io.observe(root.value)
    ro = new ResizeObserver(() => scene?.resize())
    ro.observe(root.value)
    document.addEventListener('visibilitychange', syncActive)
    if (opts.loadOn === 'idle') {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      idleHandle = ric ? ric(() => start(), { timeout: 2500 }) : window.setTimeout(start, 1200)
    }
  })

  onBeforeUnmount(() => {
    disposed = true
    io?.disconnect()
    ro?.disconnect()
    document.removeEventListener('visibilitychange', syncActive)
    if (idleHandle !== undefined) {
      const cic = (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback
      if (cic) cic(idleHandle)
      else clearTimeout(idleHandle)
    }
    scene?.dispose()
    scene = null
  })

  return { state, start, reset: () => scene?.reset() }
}
