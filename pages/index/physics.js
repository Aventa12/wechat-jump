const MAX_HOLD = 1200
function distance(ms, maximum = 335) { return Math.min(MAX_HOLD, Math.max(0, ms)) / MAX_HOLD * maximum }
function randomRatio(random = Math.random) { return 0.3 + random() * 0.7 }
function predict(player, target, ms, maximum) {
  const dx = target.x - player.x, dy = target.y - player.y
  const norm = Math.hypot(dx, dy)
  const length = distance(ms, maximum)
  if (!norm) return { x: player.x, y: player.y }
  return { x: player.x + dx / norm * length, y: player.y + dy / norm * length }
}
function landing(player, target) {
  const d = Math.hypot(player.x - target.x, player.y - target.y)
  return d <= target.r - 5 ? (d <= 12 ? 2 : 1) : 0
}
module.exports = { MAX_HOLD, distance, randomRatio, predict, landing }
