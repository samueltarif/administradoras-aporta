import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { NodeTypes, ElementTypes, type RootNode, type TemplateChildNode } from '@vue/compiler-core'

/** Varre os .vue e devolve as tags de componente que não resolvem (nem auto-import, nem import local). */
export function findUnresolvedComponents(root: string) {
  const registered = new Set(
    [...readFileSync(join(root, '.nuxt/components.d.ts'), 'utf8').matchAll(/export const (\w+):/g)].map(m => m[1]!),
  )
  const files: string[] = []
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.vue')) files.push(p)
    }
  }
  walk(join(root, 'app'))
  const pascal = (tag: string) => tag.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  const problems: { file: string, tag: string }[] = []
  for (const file of files) {
    const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
    const script = descriptor.scriptSetup?.content ?? descriptor.script?.content ?? ''
    const local = new Set([...script.matchAll(/import\s+(?:type\s+)?(?:(\w+)|\{([^}]+)\})\s+from/g)]
      .flatMap(m => (m[1] ? [m[1]] : m[2]!.split(',').map(s => s.trim().split(/\s+as\s+/).pop()!.trim()))))
    local.add(basename(file, '.vue'))
    const visit = (node: RootNode | TemplateChildNode) => {
      if (node.type === NodeTypes.ELEMENT && node.tagType === ElementTypes.COMPONENT) {
        const name = pascal(node.tag)
        if (!['Component', 'Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense'].includes(name)
          && !registered.has(name) && !local.has(name) && !local.has(node.tag)) {
          problems.push({ file: relative(root, file), tag: node.tag })
        }
      }
      if ('children' in node && Array.isArray(node.children)) node.children.forEach(c => visit(c as TemplateChildNode))
      if (node.type === NodeTypes.IF) node.branches.forEach(b => b.children.forEach(visit))
      if (node.type === NodeTypes.FOR) node.children.forEach(visit)
    }
    if (descriptor.template?.ast) visit(descriptor.template.ast as unknown as RootNode)
  }
  return problems
}
