// Each independent round contains 1–6 platforms and 1–2 distinct rewards.
function createPlan(random = Math.random) {
  const length = 1 + Math.floor(random() * 6)
  const count = Math.min(length, 1 + Math.floor(random() * 2))
  const plan = Array.from({ length }, (_, index) => index < count)
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const value = plan[i]; plan[i] = plan[j]; plan[j] = value
  }
  return plan
}
module.exports = { createPlan }
