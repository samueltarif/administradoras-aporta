<script setup lang="ts">
const model = defineModel<string>({ default: '' })
defineProps<{ id: string, autocomplete: string, invalid?: boolean }>()
const visible = ref(false)
</script>

<template>
  <div class="relative">
    <Input
      :id="id"
      v-model="model"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      :aria-invalid="invalid || undefined"
      class="pr-11"
      required
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground"
      :aria-label="visible ? 'Ocultar senha' : 'Mostrar senha'"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <Icon :name="visible ? 'lucide:eye-off' : 'lucide:eye'" class="size-4" />
    </button>
  </div>
</template>
