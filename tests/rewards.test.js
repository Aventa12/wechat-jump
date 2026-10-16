const assert = require('assert')
let definition
global.Page = value => { definition = value }
global.wx = { setStorageSync() {} }
require('../pages/index/index')
const page = Object.assign({}, definition, {
  data: Object.assign({}, definition.data), canvas: {},
  setData(value) { Object.assign(this.data, value) }
})
function landOn(target) {
  page.flight = { x: page.player.x, y: page.player.y,
    dx: target.x - page.player.x, dy: target.y - page.player.y, t: 0 }
  for (let i = 0; i < 36; i++) page.update(16)
}
function miss() { landOn({ x: page.target.x + 500, y: page.target.y }) }
page.restart()
// Fix a schedule for collection/consumption checks, independent of random scheduling.
page.target.reward = false
page.rewardPlan = [false, false, true, false, false, false, true]
for (let i = 1; i <= 8; i++) {
  const platform = page.target
  assert.equal(platform.reward, i % 4 === 0)
  landOn(platform)
  assert.equal(page.data.score, i * 2)
  assert.equal(page.data.steps, i)
  assert.equal(page.data.revives, Math.floor(i / 4))
  assert.equal(platform.reward, false, 'Collected rewards disappear')
}
const target = page.target, current = page.current, score = page.data.score
miss()
assert.equal(page.data.over, false)
assert.equal(page.data.revives, 1)
assert.deepEqual(page.player, { x: current.x, y: current.y })
assert.strictEqual(page.target, target)
assert.equal(page.data.score, score)
landOn(current)
assert.equal(page.data.revives, 1, 'Returning to the reward platform must not award again')
assert.equal(page.data.steps, 8)
miss(); assert.equal(page.data.revives, 0); assert.equal(page.data.over, false)
miss(); assert.equal(page.data.over, true)
page.restart()
assert.equal(page.data.steps, 0); assert.equal(page.data.revives, 0)
assert.equal(page.data.score, 0); assert.equal(page.data.best, score)
assert.equal(page.generated, 1)
// Render a reward platform through the canvas path as well.
page.target.reward = true; page.w = 375; page.h = 650
const labels = []
page.ctx = new Proxy({}, {
  get: (_, key) => key === 'fillText' ? label => labels.push(label) : () => {},
  set: () => true
})
page.draw(); assert(labels.includes('复活奖励'))
page.target.reward = false; labels.length = 0
page.draw(); assert(!labels.includes('复活奖励'))
console.log('PASS: reward cadence, collection, stacking, automatic revive, no duplicate rewards, game over, restart and reward drawing')
