const assert = require('assert')
const physics = require('../pages/index/physics')
assert.equal(physics.randomRatio(() => 0), .3)
assert.equal(physics.randomRatio(() => 1), 1)
assert.equal(physics.distance(-1), 0)
assert.equal(physics.distance(5000), 335)
let page
global.Page = value => { page = value }
global.wx = { setStorageSync() {} }
require('../pages/index/index')
page.data = { ...page.data }
page.setData = function(value) { Object.assign(this.data, value) }
page.canvas = {}
const originalRandom = Math.random, originalNow = Date.now
try {
  for (const width of [320, 375, 430, 768]) {
    for (const ratio of [.3, .65, 1]) {
      // The third random draw selects the distance coefficient.
      let draw = 0
      Math.random = () => ++draw === 3 ? (ratio - .3) / .7 : .5
      page.w = width; page.h = 650; page.restart()
      const gap = Math.hypot(page.target.x, page.target.y)
      assert(Math.abs(gap - page.maxGap * ratio) < 1e-8)
      assert(page.current.r + page.target.r < gap)
      const scale = Math.min(width / 375, 650 / 620, 1.5)
      assert(width * .27 + (page.target.x + page.target.r) * scale < width)
      Date.now = () => 1000
      page.press()
      const hold = gap / page.jumpMaximum * 1200
      Date.now = () => 1000 + hold
      page.release()
      assert(page.flight, 'Even the shortest distance must accept a held touch')
      for (let i = 0; i < 36; i++) page.update(16)
      assert.equal(page.data.score, 2)
    }
  }
  console.log('PASS: random bounds, screen mapping, separated platforms, shortest and longest jumps on four screen sizes')
} finally { Math.random = originalRandom; Date.now = originalNow }
