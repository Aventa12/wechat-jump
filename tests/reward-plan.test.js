const assert = require('assert')
const { createPlan } = require('../pages/index/rewards')
assert.deepEqual(createPlan(() => 0), [true])
assert.equal(createPlan(() => .999999).length, 6)
assert.equal(createPlan(() => .999999).filter(Boolean).length, 2)
// Repeatable pseudo-random samples cover all sizes, counts and shuffled positions.
let seed = 7
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
const lengths = new Set(), counts = new Set(), patterns = new Set()
for (let i = 0; i < 1000; i++) {
  const plan = createPlan(random)
  const count = plan.filter(Boolean).length
  assert(plan.length >= 1 && plan.length <= 6)
  assert(count >= 1 && count <= Math.min(2, plan.length))
  assert(plan.every(value => typeof value === 'boolean'))
  lengths.add(plan.length); counts.add(count); patterns.add(plan.join(','))
}
assert.equal(lengths.size, 6); assert.equal(counts.size, 2)
assert(patterns.size > 20, 'Reward positions should vary across rounds')
console.log('PASS: random rounds of 1–6 steps, 1–2 distinct rewards, single-step boundary and varied positions')
