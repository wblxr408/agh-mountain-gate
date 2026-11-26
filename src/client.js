import { createElement, useEffect, useRef, useSyncExternalStore } from 'react'
import { mountGate } from './gate.js'
import { registerGateFonts } from './fonts.js'

const slot = 'shell.overlay'
const sessionKey = 'agnes.mountain-gate.entered'
const guideId = 'mountain-gate-guide'
const guideTitle = 'mountain-gate.guide'
const artwork = new URL('./assets/mountain-world.webp', import.meta.url).href
const guideCopy = {
  en: {
    title: 'Mountain Gate',
    how: 'On opening a new workbench tab, a gate covers the workbench once. Only clicking “推门入户” starts the original 18-second animation. Choose “直入办公” or press Escape to skip. Reduced motion skips the gate.',
    wallpaper: 'The mountain scene stays behind the workbench when the Mountain Gate skin is active.',
    replay: 'Open a new workbench tab',
    artwork: 'Mountain scene from Seasonal Atlas',
  },
  'zh-CN': {
    title: '山水入户',
    how: '新标签页打开工作台时会先显示古门，每个标签页只显示一次。仅点击「推门入户」才播放约 18 秒的原版动画。点「直入办公」或按 Esc 可跳过。开启减少动态效果时不会显示古门。',
    wallpaper: '山水入户皮肤启用时，山水原图会保留为工作台背景。',
    replay: '在新标签页打开工作台',
    artwork: '《天时经纬》的山水原图',
  },
}

function MountainGate() {
  const host = useRef(null)

  useEffect(() => {
    const element = host.current
    const app = element.ownerDocument.getElementById('app-root')
    const window = element.ownerDocument.defaultView
    if (!app || !window || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    try {
      if (window.sessionStorage.getItem(sessionKey) === 'yes') return
    } catch {
      // The entrance still works when the browser blocks session storage.
    }

    const unregisterFonts = registerGateFonts(element.ownerDocument)
    let dispose
    const frame = window.requestAnimationFrame(() => {
      dispose = mountGate(element, app, () => {
        try {
          window.sessionStorage.setItem(sessionKey, 'yes')
        } catch {
          // Entering the workbench does not depend on session storage.
        }
      })
    })
    return () => {
      window.cancelAnimationFrame(frame)
      dispose?.()
      unregisterFonts()
    }
  }, [])

  return createElement('div', { ref: host })
}

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register('@wblxr408/mountain-gate-runtime', {
    en: { [guideTitle]: guideCopy.en.title },
    'zh-CN': { [guideTitle]: guideCopy['zh-CN'].title },
  }))
  ctx.homeEntries.register({
    id: guideId,
    placement: 'secondary',
    titleKey: guideTitle,
    icon: 'image',
    order: 50,
    component() {
      const language = useSyncExternalStore(ctx.locale.subscribe, ctx.locale.getSnapshot)
      const copy = guideCopy[language] ?? guideCopy.en
      return createElement('article', { className: 'mountain-gate-guide' },
        createElement('h1', null, copy.title),
        createElement('p', null, copy.how),
        createElement('p', null, copy.wallpaper),
        createElement('a', { href: './', target: '_blank', rel: 'noopener', className: 'agh-btn' }, copy.replay),
        createElement('img', { src: artwork, alt: copy.artwork }),
      )
    },
  })
  return ctx.slots.inject(slot, () =>
    ctx.slots.register({ name: slot, id: 'mountain-gate' }, MountainGate),
  )
}
