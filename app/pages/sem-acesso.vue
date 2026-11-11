<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Sem acesso · Portal A Porta Móvel' })
const signOut = useSignOut()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl text-brand-blue">
        Acesso ainda não liberado
      </CardTitle>
      <CardDescription>
        Sua conta não tem vínculo ativo com um condomínio, administradora ou com a equipe A Porta Móvel.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <p class="text-sm text-muted-foreground">
        Se você deveria ter acesso, fale com a A Porta Móvel para revisar seu convite.
      </p>
    </CardContent>
    <CardFooter>
      <Button variant="outline" @click="signOut">
        Sair
      </Button>
    </CardFooter>
  </Card>
</template>
