import { GateScene } from './gate-scene.js'
import { PortalJourney } from './journey.js'

const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function mountGate(host, app, onEntered) {
  const document = host.ownerDocument
  const window = document.defaultView
  const journey = new PortalJourney()
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (motion.matches) return

  const dialog = document.createElement('dialog')
  dialog.className = 'agnes-gate'
  dialog.setAttribute('aria-label', 'Agnes Harness 入境')
  dialog.innerHTML = `
    <div class="agnes-gate-scene"></div><div class="agnes-gate-shade"></div>
    <div class="agnes-gate-brand"><span aria-hidden="true">AH</span>Agnes Harness</div>
    <button type="button" class="agnes-gate-skip">直入办公 <span>↗</span></button>
    <div class="agnes-gate-title">
      <p>推开一扇门，走进 Agnes Harness。</p><h2>Agnes<br> Harness</h2>
      <span>山水之间，案头有序。<br>一日之事，从此落笔。</span>
    </div>
    <div class="agnes-gate-side">远 眺 山 水<br>近 理 日 常</div>
    <div class="agnes-gate-enter">
      <button type="button" disabled>推门入户 <span>→</span></button>
      <p>循一道光，开启新一天。</p>
    </div>
    <div class="agnes-gate-flash"></div>`
  const sceneHost = dialog.querySelector('.agnes-gate-scene')
  const enter = dialog.querySelector('.agnes-gate-enter button')
  const previousFocus = document.activeElement
  const previousInert = app.inert
  const scrollY = window.scrollY
  host.append(dialog)
  app.inert = true
  document.documentElement.classList.add('agnes-at-gate')
  dialog.showModal()
  dialog.focus({ preventScroll: true })

  let gate
  try {
    gate = new GateScene(sceneHost)
  } catch {
    sceneHost.replaceChildren()
    dialog.classList.add('agnes-gate-fallback')
  }

  let frame = 0
  let last = 0
  let time = 0
  let disposed = false

  function resetClock() {
    last = 0
  }

  function dispose() {
    if (disposed) return
    disposed = true
    window.cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', resetClock)
    motion.removeEventListener('change', reduceMotion)
    window.removeEventListener('keydown', onKeyDown, true)
    gate?.dispose()
    dialog.close()
    dialog.remove()
    app.inert = previousInert
    document.documentElement.classList.remove('agnes-at-gate')
    window.scrollTo(0, scrollY)
    if (previousFocus instanceof window.HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true })
    }
  }

  function finish() {
    dispose()
    onEntered()
  }

  function skip() {
    journey.skip()
    finish()
  }

  function reduceMotion(event) {
    if (event.matches) skip()
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    skip()
  }

  function animate(now) {
    const elapsed = last ? now - last : 0
    last = now
    if (!document.hidden) {
      time += elapsed / 1000
      journey.advance(elapsed)
      const progress = journey.progress
      gate?.render(progress, time)
      dialog.style.setProperty('--journey', String(progress))
      dialog.style.setProperty('--reveal', String(smooth(.76, 1, progress)))
      dialog.style.setProperty('--flare', String(smooth(.6, .76, progress) * (1 - smooth(.8, .94, progress)) * .22))
    }
    if (journey.phase === 'waiting' && (!gate || gate.ready)) enter.disabled = false
    if (journey.phase === 'entered') finish()
    else frame = window.requestAnimationFrame(animate)
  }

  enter.addEventListener('click', () => {
    enter.disabled = true
    journey.start()
    resetClock()
    dialog.classList.add('opening')
  })
  dialog.querySelector('.agnes-gate-skip').addEventListener('click', skip)
  dialog.addEventListener('cancel', event => {
    event.preventDefault()
    skip()
  })
  document.addEventListener('visibilitychange', resetClock)
  motion.addEventListener('change', reduceMotion)
  window.addEventListener('keydown', onKeyDown, true)
  frame = window.requestAnimationFrame(animate)
  return dispose
}
