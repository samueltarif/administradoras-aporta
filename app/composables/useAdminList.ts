import { refDebounced } from '@vueuse/core'

export interface Paged<T> { items: T[], total: number, page: number, pageSize: number }

/** Lista paginada com filtros sincronizados na URL (permite voltar/compartilhar o filtro). */
export function useAdminList<T>(endpoint: string, defaults: Record<string, string>, localKeys: string[] = []) {
  const route = useRoute()
  const router = useRouter()
  const filters = reactive<Record<string, string>>({ ...defaults })
  for (const key of Object.keys(defaults)) {
    const v = route.query[key]
    if (typeof v === 'string') filters[key] = v
  }
  const page = ref(Number(route.query.page) || 1)
  const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
  const qDebounced = refDebounced(q, 350)

  // localKeys (ex.: modo de visualização) ficam na URL, mas não vão à API nem reiniciam a paginação.
  const apiFilters = () => Object.fromEntries(Object.entries(filters).filter(([k]) => !localKeys.includes(k)))
  const query = computed(() => ({ ...apiFilters(), q: qDebounced.value, page: page.value }))
  const urlState = computed(() => ({ ...filters, q: qDebounced.value, page: page.value }))
  watch(() => [qDebounced.value, ...Object.values(apiFilters())], () => { page.value = 1 })
  watch(urlState, (value) => {
    const clean = Object.fromEntries(Object.entries(value).filter(([k, v]) => v !== '' && v !== defaults[k] && !(k === 'page' && v === 1)))
    router.replace({ query: clean })
  })

  const { data, status, error, refresh } = useFetch<Paged<T>>(endpoint, { query, watch: [query] })
  const loading = computed(() => status.value === 'pending')
  return { filters, q, page, data, loading, error, refresh }
}
