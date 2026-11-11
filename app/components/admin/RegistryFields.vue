<script setup lang="ts">
import type { RegistryFormState } from '~/composables/useRegistryForm'
import { CUSTOMER_KIND_LABEL, CUSTOMER_KINDS } from '#shared/schemas/registry'

const form = defineModel<RegistryFormState>({ required: true })
defineProps<{ errors: Record<string, string>, withKind?: boolean, disabled?: boolean }>()
</script>

<template>
  <fieldset :disabled="disabled" class="grid gap-5 sm:grid-cols-2">
    <AppField id="trade_name" label="Nome fantasia" :error="errors.trade_name" required class="sm:col-span-2">
      <Input id="trade_name" v-model="form.trade_name" :aria-invalid="!!errors.trade_name || undefined" maxlength="160" />
    </AppField>
    <AppField id="legal_name" label="Razão social" :error="errors.legal_name" class="sm:col-span-2">
      <Input id="legal_name" v-model="form.legal_name" maxlength="200" />
    </AppField>
    <AppField id="cnpj" label="CNPJ" :error="errors.cnpj" hint="Opcional. Não é usado para unir cadastros.">
      <Input id="cnpj" v-model="form.cnpj" inputmode="numeric" placeholder="00.000.000/0000-00" :aria-invalid="!!errors.cnpj || undefined" maxlength="18" />
    </AppField>
    <AppField v-if="withKind" id="customer_kind" label="Tipo de cliente" :error="errors.customer_kind" required hint="Importados começam como “A classificar”.">
      <NativeSelect id="customer_kind" v-model="form.customer_kind">
        <option v-for="k in CUSTOMER_KINDS" :key="k" :value="k">
          {{ CUSTOMER_KIND_LABEL[k] }}
        </option>
      </NativeSelect>
    </AppField>
    <AppField id="email" label="E-mail de contato" :error="errors.email" hint="Contato cadastral; não cria login.">
      <Input id="email" v-model="form.email" type="email" :aria-invalid="!!errors.email || undefined" maxlength="254" />
    </AppField>
    <AppField id="phone" label="Telefone" :error="errors.phone">
      <Input id="phone" v-model="form.phone" type="tel" maxlength="40" />
    </AppField>
    <AppField id="address_text" label="Endereço" :error="errors.address_text" class="sm:col-span-2">
      <Textarea id="address_text" v-model="form.address_text" rows="2" maxlength="300" />
    </AppField>
    <label class="flex items-center gap-3 text-sm sm:col-span-2">
      <input v-model="form.active" type="checkbox" class="size-4 accent-[var(--color-brand-blue)]">
      Cadastro ativo
    </label>
  </fieldset>
</template>
