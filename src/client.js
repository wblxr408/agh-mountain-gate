import { createElement, useEffect, useRef } from 'react'
import { mountGate } from './gate.js'
import { registerGateFonts } from './fonts.js'

const slot = 'shell.overlay'
const sessionKey = 'agnes.mountain-gate.entered'

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

    const unregisterFonts = registerGateFonts(document)
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

  return createElement('div', { ref: host, 'data-agnes-mountain-wallpaper': '' })
}

export function apply(ctx) {
  return ctx.slots.inject(slot, () =>
    ctx.slots.register({ name: slot, id: 'mountain-gate' }, MountainGate),
  )
}
