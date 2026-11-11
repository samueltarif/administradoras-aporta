<script setup lang="ts">
import { ROLE_LABEL } from '#shared/domain/labels'

definePageMeta({ layout: 'portal', middleware: ['portal'] })
useHead({ title: 'Meu perfil · Portal A Porta Móvel' })
const { access } = useAccess()
const signOut = useSignOut()
</script>

<template>
  <div class="max-w-2xl">
    <AppPageHeader title="Meu perfil" />
    <Card>
      <CardContent class="space-y-4 text-sm">
        <div><p class="text-muted-foreground">Nome</p><p class="font-medium">{{ access?.displayName }}</p></div>
        <div><p class="text-muted-foreground">E-mail</p><p class="font-medium">{{ access?.email }}</p></div>
        <div>
          <p class="mb-1 text-muted-foreground">Acessos</p>
          <ul class="space-y-1">
            <li v-for="m in access?.managements" :key="m.id">{{ m.name }} — {{ ROLE_LABEL[m.role] }}</li>
            <li v-for="c in access?.customers" :key="c.id">{{ c.name }} — {{ ROLE_LABEL[c.role] }}</li>
          </ul>
        </div>
        <div class="flex flex-wrap gap-2 pt-2">
          <Button as-child variant="outline"><NuxtLink to="/redefinir-senha">Alterar senha</NuxtLink></Button>
          <Button variant="ghost" @click="signOut"><Icon name="lucide:log-out" /> Sair</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
