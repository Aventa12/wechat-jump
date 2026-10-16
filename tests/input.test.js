// Run from any directory with: node wechat-jump/tests/input.test.js
const assert = require('assert')
const fs = require('fs')
const path = require('path')
let definition
global.Page = page => { definition = page }
global.wx = { setStorageSync() {} }
require('../pages/index/index')
const page = Object.assign({}, definition, {
  data: Object.assign({}, definition.data),
  canvas: { cancelAnimationFrame() {} },
  setData(values) { Object.assign(this.data, values) }
})
const originalNow = Date.now
let now = 1000
Date.now = () => now
try {
  page.restart()
  page.press(); now += 30; page.release()
  assert.equal(page.flight, null, 'Accidental taps should not launch')
  assert.equal(page.data.over, false)
  // Hold for the exact target distance, then run normal animation frames.
  const hold = Math.hypot(page.target.x, page.target.y) / page.jumpMaximum * 1200
  page.press(); now += hold; page.release()
  assert(page.flight, 'Releasing a held touch should launch')
  for (let i = 0; i < 36; i++) page.update(16)
  assert.equal(page.data.score, 2, 'A center landing should award two points')
  page.press(); page.cancel(); page.release()
  assert.equal(page.flight, null, 'Canceled touches should not launch')
  page.press(); now += 1200; page.release()
  page.data.revives = 0 // Test the no-reward game-over path independently.
  page.flight.dx *= 2; page.flight.dy *= 2 // Force a miss regardless of random gap.
  for (let i = 0; i < 36; i++) page.update(16)
  assert(page.data.over, 'An overshoot should end the round')
  page.press(); assert.equal(page.holding, false)
  page.restartFromTouch(); assert.equal(page.data.over, false)
  assert.equal(page.data.score, 0)
  assert.equal(page.fall, 0)
  assert.equal(page.flight, null)
  const freshTarget = page.target
  page.restartFromTap()
  assert.strictEqual(page.target, freshTarget, 'Touch plus tap must reset only once')
  page.press()
  now += Math.hypot(page.target.x, page.target.y) / page.jumpMaximum * 1200
  page.release()
  assert(page.flight, 'The restarted round must accept a new jump')
  for (let i = 0; i < 36; i++) page.update(16)
  assert.equal(page.data.score, 2)
  now += 600; page.restartFromTap()
  assert.equal(page.data.score, 0, 'Click-only restart should work too')
  page.ignoreTouch(); assert.equal(page.holding, false)
  page.press(); page.onHide(); page.release()
  assert.equal(page.flight, null)
  const markup = fs.readFileSync(path.join(__dirname, '../pages/index/index.wxml'), 'utf8')
  assert(markup.includes('<view class="page" bindtouchstart="press"'))
  assert(markup.includes('catchtouchend="restartFromTouch"'))
  assert(markup.includes('catchtap="restartFromTap"'))
  assert(!markup.includes('class="overlay"'), 'Game over must not cover the play area')
  console.log('PASS: tap, hold/release, scoring, cancel, failure, restart, background and event wiring')
} finally { Date.now = originalNow }
