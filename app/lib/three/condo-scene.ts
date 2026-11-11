// Cena 3D do condomínio (three.js). Carregada só no cliente e sob demanda (import dinâmico).
// Render sob demanda: o loop só roda com rotação automática/amortecimento ativos e componente visível.
import type { Mesh} from 'three';
import {
  BufferAttribute, Box3, Color, DirectionalLight, HemisphereLight, MathUtils, MeshStandardMaterial,
  PCFShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export const CONDO_MODEL_URL = '/animation/condominio_3d_modelo.glb'

export interface CondoSceneOptions {
  autoRotate: boolean
  interactive: boolean
  reducedMotion: boolean
  maxPixelRatio?: number
  shadows?: boolean
}

export interface CondoScene {
  reset: () => void
  setActive: (active: boolean) => void
  resize: () => void
  dispose: () => void
}

/** O GLB não tem materiais (cor única por vértice). Gradiente por altura, calculado da própria geometria. */
function applyMaquetteLook(mesh: Mesh) {
  const pos = mesh.geometry.attributes.position as BufferAttribute
  let min = Infinity, max = -Infinity
  for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i); if (z < min) min = z; if (z > max) max = z }
  const low = new Color('#94A3B8'), high = new Color('#EEF2F7'), c = new Color()
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    c.lerpColors(low, high, MathUtils.smoothstep((pos.getZ(i) - min) / (max - min), 0.03, 0.35)).toArray(colors, i * 3)
  }
  mesh.geometry.setAttribute('color', new BufferAttribute(colors, 3))
  const old = mesh.material as MeshStandardMaterial
  mesh.material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 })
  old.dispose?.()
  mesh.castShadow = mesh.receiveShadow = true
}

export async function createCondoScene(canvas: HTMLCanvasElement, opts: CondoSceneOptions): Promise<CondoScene> {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.shadowMap.enabled = opts.shadows ?? true
  renderer.shadowMap.type = PCFShadowMap

  const scene = new Scene()
  scene.add(new HemisphereLight(0xffffff, 0xb8c4d6, 1.9))
  const sun = new DirectionalLight(0xffffff, 1.7)
  sun.position.set(3, 5, 4)
  sun.castShadow = renderer.shadowMap.enabled
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.01
  Object.assign(sun.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 20 })
  scene.add(sun)

  const gltf = await new GLTFLoader().loadAsync(CONDO_MODEL_URL)
  const root = gltf.scene
  root.rotation.x = -Math.PI / 2 // exportado pelo trimesh com eixo Z para cima
  root.updateMatrixWorld(true)
  root.traverse(o => { if ((o as Mesh).isMesh) applyMaquetteLook(o as Mesh) })
  const box = new Box3().setFromObject(root)
  const size = box.getSize(new Vector3())
  root.position.sub(box.getCenter(new Vector3()))
  scene.add(root)

  const camera = new PerspectiveCamera(30, 1, 0.01, 100)
  const radius = size.length()
  // Enquadramento: distância base pensada para áreas largas (>= 1.7); em áreas mais estreitas
  // (ex.: lateral do login) a câmera recua para o modelo não encostar nas bordas ao girar.
  const homeDir = new Vector3(0.86, 0.68, 0.86)
  const home = new Vector3()
  const fitHome = (aspect: number) => home.copy(homeDir).multiplyScalar(radius * Math.max(1, 1.7 / aspect))
  fitHome(1.7)
  camera.position.copy(home)
  let touched = false

  const controls = new OrbitControls(camera, canvas)
  controls.enabled = opts.interactive
  controls.enablePan = false
  controls.enableDamping = !opts.reducedMotion
  controls.dampingFactor = 0.08
  controls.minDistance = radius * 0.9
  controls.maxDistance = radius * 2.6
  controls.minPolarAngle = Math.PI * 0.18
  controls.maxPolarAngle = Math.PI * 0.46
  controls.autoRotate = opts.autoRotate && !opts.reducedMotion
  controls.autoRotateSpeed = 0.6
  controls.target.set(0, 0, 0)
  controls.update()

  let active = true
  let frame = 0
  let settleFrames = 0
  const render = () => renderer.render(scene, camera)
  const loop = () => {
    frame = 0
    const moving = controls.update() // true enquanto há amortecimento/rotação
    render()
    if (active && (controls.autoRotate || moving || settleFrames-- > 0)) frame = requestAnimationFrame(loop)
  }
  const kick = (frames = 30) => { settleFrames = Math.max(settleFrames, frames); if (active && !frame) frame = requestAnimationFrame(loop) }
  // Interação do usuário interrompe a rotação automática definitivamente.
  controls.addEventListener('start', () => { touched = true; controls.autoRotate = false; kick() })
  controls.addEventListener('change', () => kick())

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    fitHome(camera.aspect)
    if (!touched) { camera.position.setLength(home.length()); controls.update() }
    kick(1)
  }
  resize()
  kick(2)

  return {
    reset: () => { touched = false; camera.position.copy(home); controls.target.set(0, 0, 0); controls.update(); kick() },
    setActive: (value) => {
      active = value
      if (!value && frame) { cancelAnimationFrame(frame); frame = 0 }
      else if (value) kick(1)
    },
    resize,
    dispose: () => {
      if (frame) cancelAnimationFrame(frame)
      controls.dispose()
      scene.traverse((o) => {
        const m = o as Mesh
        if (m.isMesh) { m.geometry.dispose(); (m.material as MeshStandardMaterial).dispose() }
      })
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
