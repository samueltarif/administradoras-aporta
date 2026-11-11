import { describe, expect, it } from 'vitest'
import { findUnresolvedComponents } from './resolve-components'

describe('registro de componentes', () => {
  it('todo componente usado nos templates resolve (auto-import do Nuxt ou import explícito)', () => {
    // Regressão de 05/11/2026: componentes em subpastas recebem prefixo da pasta no Nuxt 4
    // (ex.: AdminRegistryFields) e telas ficavam vazias com "Failed to resolve component".
    expect(findUnresolvedComponents(process.cwd())).toEqual([])
  })
})
