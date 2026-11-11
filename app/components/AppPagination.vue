<script setup lang="ts">
const props = defineProps<{ page: number, pageSize: number, total: number }>()
const emit = defineEmits<{ 'update:page': [value: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const to = computed(() => Math.min(props.total, props.page * props.pageSize))
</script>

<template>
  <div class="flex flex-col items-center justify-between gap-3 border-t px-3 py-3 text-sm text-muted-foreground sm:flex-row">
    <span>{{ from }}–{{ to }} de {{ total.toLocaleString('pt-BR') }}</span>
    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" :disabled="page <= 1" @click="emit('update:page', page - 1)">
        <Icon name="lucide:chevron-left" /> Anterior
      </Button>
      <span class="tabular-nums">{{ page }} / {{ pages }}</span>
      <Button variant="outline" size="sm" :disabled="page >= pages" @click="emit('update:page', page + 1)">
        Próxima <Icon name="lucide:chevron-right" />
      </Button>
    </div>
  </div>
</template>
