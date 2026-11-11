<script setup lang="ts">
import CondoViewer from '~/components/viewer/CondoViewer.vue'
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
    <!-- Desktop: identidade + modelo 3D (carrega no tempo ocioso, sem disputar com o formulário) -->
    <aside class="relative hidden overflow-hidden bg-brand-blue text-white lg:flex lg:flex-col">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,255,255,0.16),transparent_62%)]" />
      <div class="relative z-10 p-10">
        <AppLogo inverted />
      </div>
      <div class="relative z-10 mx-auto aspect-[3/2] w-full max-w-[720px] flex-1 px-6" style="max-height: 62vh">
        <ClientOnly>
          <CondoViewer load-on="idle" auto-rotate tone="dark" />
          <template #fallback>
            <img src="/animation/condominio_3d_poster.webp" alt="" width="960" height="640" class="size-full object-contain">
          </template>
        </ClientOnly>
      </div>
      <div class="relative z-10 max-w-lg space-y-3 p-10 pt-4">
        <span class="block h-1 w-12 rounded-full bg-brand-red" />
        <p class="text-2xl leading-snug font-semibold xl:text-3xl">
          Acompanhe seus condomínios, chamados e manutenções em um só lugar.
        </p>
        <p class="text-sm text-white/70">
          Portal A Porta Móvel para equipe, administradoras e condomínios. Modelo ilustrativo.
        </p>
      </div>
    </aside>

    <main class="flex flex-col items-center justify-center px-4 py-8 sm:px-8">
      <div class="mb-6 w-full max-w-md lg:hidden">
        <AppLogo />
        <!-- Celular: formulário em primeiro lugar; 3D compacto apenas sob demanda -->
        <div class="mt-4 h-40 overflow-hidden rounded-xl bg-brand-blue">
          <ClientOnly>
            <CondoViewer load-on="click" tone="dark" />
            <template #fallback>
              <img src="/animation/condominio_3d_poster.webp" alt="" width="960" height="640" class="size-full object-contain">
            </template>
          </ClientOnly>
        </div>
      </div>
      <div class="w-full max-w-md">
        <slot />
      </div>
      <p class="mt-8 text-xs text-muted-foreground">© {{ new Date().getFullYear() }} A Porta Móvel</p>
    </main>
  </div>
</template>
