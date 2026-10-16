const physics = require('./physics')
const rewards = require('./rewards')
Page({
  data: { score: 0, best: 0, revives: 0, steps: 0, power: 0, over: false, message: '每一小步，都算数' },
  onReady() {
    this.visible = true
    this.setData({ best: Number(wx.getStorageSync('jump-best')) || 0 })
    wx.createSelectorQuery().in(this).select('#game').fields({ node: true, size: true }).exec(res => {
      if (this.disposed || !res[0] || !res[0].node) return
      this.canvas = res[0].node
      this.ctx = this.canvas.getContext('2d')
      this.w = res[0].width; this.h = res[0].height
      const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio
      this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr
      this.ctx.scale(dpr, dpr)
      this.restart(); this.loop()
    })
  },
  onShow() { this.visible = true; if (this.canvas && !this.frame) this.loop() },
  onHide() {
    this.visible = false; this.cancel()
    if (this.frame) this.canvas.cancelAnimationFrame(this.frame)
    this.frame = null; this.last = null
  },
  onUnload() { this.onHide(); this.disposed = true },
  restart() {
    if (!this.canvas) return
    const width = this.w || 375, height = this.h || 650
    const scale = Math.min(width / 375, height / 620, 1.5)
    // Reserve space for the far platform so distance 1 remains visible.
    this.maxGap = Math.min(300, (width * .73 / scale) - 44)
    this.jumpMaximum = this.maxGap / .9
    this.current = { x: 0, y: 0, r: 36, color: '#80b59b' }
    this.player = { x: 0, y: 0 }; this.camera = { x: 0, y: 0 }
    this.platforms = [this.current]; this.flight = null; this.holding = false; this.fall = 0
    this.generated = 0
    this.rewardPlan = []
    this.next(); this.setData({ score: 0, steps: 0, revives: 0, power: 0, over: false, message: '按住屏幕，开始第一跳' })
  },
  next() {
    const angle = (Math.random() > 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.2)
    const ratio = physics.randomRatio()
    const gap = this.maxGap * ratio
    this.target = { x: this.current.x + Math.cos(angle) * gap, y: this.current.y + Math.sin(angle) * gap, r: 30 + Math.random() * 8, color: ['#e6be73', '#8fb6c7', '#b4a5cb'][Math.floor(Math.random() * 3)] }
    // Close platforms must shrink to keep their landing areas separate.
    this.current.r = Math.min(this.current.r, gap * .38)
    this.target.r = Math.min(this.target.r, gap * .38)
    this.setData({ distanceRatio: ratio.toFixed(2) })
    this.generated += 1
    if (!this.rewardPlan.length) this.rewardPlan = rewards.createPlan()
    this.target.reward = this.rewardPlan.shift()
    this.platforms.push(this.target)
    if (this.platforms.length > 5) this.platforms.shift()
  },
  press() { if (!this.canvas || this.flight || this.holding || this.data.over) return; this.holding = true; this.started = Date.now() },
  ignoreTouch() {},
  restartFromTouch() {
    this.lastRestartTouch = Date.now()
    this.restart()
  },
  restartFromTap() {
    // A touch can also emit tap. Reset only once, while retaining click support.
    if (this.lastRestartTouch != null && Date.now() - this.lastRestartTouch < 500) return
    this.restart()
  },
  cancel() { this.holding = false; this.setData({ power: 0 }) },
  release() {
    if (!this.holding) return
    const held = Date.now() - this.started
    // Ignore accidental taps; a minimum-distance jump can otherwise miss the starting platform.
    if (held < 100) {
      this.cancel()
      this.setData({ message: '按住蓄力，准星变绿时松手' })
      return
    }
    const end = physics.predict(this.player, this.target, held, this.jumpMaximum)
    this.holding = false
    this.flight = { x: this.player.x, y: this.player.y, dx: end.x - this.player.x, dy: end.y - this.player.y, t: 0 }
    this.setData({ power: 0, message: '轻轻一跃…' })
  },
  loop() {
    if (!this.visible || this.disposed) return
    const now = Date.now(), dt = this.last ? Math.min(40, now - this.last) : 16
    this.last = now
    this.update(dt); this.draw()
    this.frame = this.canvas.requestAnimationFrame(() => this.loop())
  },
  update(dt) {
    if (this.holding) {
      const power = Math.min(100, Math.floor((Date.now() - this.started) / physics.MAX_HOLD * 100))
      if (power !== this.data.power) this.setData({ power })
    }
    if (this.flight) {
      const f = this.flight; f.t = Math.min(1, f.t + dt / 560)
      this.player.x = f.x + f.dx * f.t; this.player.y = f.y + f.dy * f.t
      if (f.t === 1) {
        this.flight = null
        const points = physics.landing(this.player, this.target)
        if (points) {
          const score = this.data.score + points, best = Math.max(score, this.data.best)
          if (best > this.data.best) { try { wx.setStorageSync('jump-best', best) } catch (e) {} }
          const reward = this.target.reward
          this.target.reward = false
          const message = points === 2 ? '完美落点！+2' : '稳稳落地！+1'
          this.setData({ score, best, steps: this.data.steps + 1,
            revives: this.data.revives + (reward ? 1 : 0),
            message: reward ? message + ' · 获得复活机会 +1' : message })
          this.current = this.target; this.next()
        } else if (!physics.landing(this.player, this.current)) {
          if (this.data.revives > 0) {
            this.player = { x: this.current.x, y: this.current.y }
            this.fall = 0; this.holding = false
            this.setData({ revives: this.data.revives - 1, power: 0,
              message: '已原地复活！分数保留，继续跳跃' })
          } else this.setData({ over: true, message: '再试一次，找到你的节奏' })
        } else this.setData({ message: '还在原地，再多蓄一点力' })
      }
    }
    const ease = 1 - Math.exp(-dt / 150)
    this.camera.x += (this.current.x - this.camera.x) * ease
    this.camera.y += (this.current.y - this.camera.y) * ease
    if (this.data.over) this.fall = Math.min(45, this.fall + dt * .15)
  },
  draw() {
    const c = this.ctx, scale = Math.min(this.w / 375, this.h / 620, 1.5)
    c.clearRect(0, 0, this.w, this.h)
    c.fillStyle = '#edf4f2'; c.fillRect(0, 0, this.w, this.h)
    c.save(); c.translate(this.w * .27, this.h * .59); c.scale(scale, scale)
    c.translate(-this.camera.x, -this.camera.y)
    const ellipse = (x, y, rx, ry, color) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill() }
    this.platforms.forEach(p => {
      ellipse(p.x + 6, p.y + 29, p.r + 5, p.r * .51, '#244a3810')
      c.fillStyle = '#527d6c'; c.fillRect(p.x - p.r, p.y, p.r * 2, 19)
      ellipse(p.x, p.y + 19, p.r, p.r * .56, '#527d6c')
      ellipse(p.x, p.y, p.r, p.r * .56, p.color)
      ellipse(p.x, p.y, 9, 5, '#ffffff55')
      if (p === this.target) { c.strokeStyle = '#ffffffaa'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(p.x, p.y, 17, 9, 0, 0, Math.PI * 2); c.stroke() }
      if (p.reward) {
        c.save()
        c.fillStyle = '#f5cf76'; c.strokeStyle = '#b27a22'; c.lineWidth = 1.5
        c.beginPath(); c.arc(p.x, p.y - 62, 12, 0, Math.PI * 2); c.fill(); c.stroke()
        c.fillStyle = '#684512'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'
        c.fillText('+', p.x, p.y - 57)
        c.font = '10px sans-serif'; c.fillText('复活奖励', p.x, p.y - 80)
        c.restore()
      }
    })
    if (this.holding) {
      const end = physics.predict(this.player, this.target, Date.now() - this.started, this.jumpMaximum)
      const points = physics.landing(end, this.target)
      const color = points === 2 ? '#167254' : points === 1 ? '#277d9d' : '#b36832'
      c.save()
      // Fixed bullseye marks the platform center; the smaller crosshair predicts the jump.
      c.strokeStyle = '#216c54'; c.lineWidth = 2
      c.beginPath(); c.ellipse(this.target.x, this.target.y, 12, 7, 0, 0, Math.PI * 2); c.stroke()
      ellipse(this.target.x, this.target.y, 3, 2, '#216c54')
      c.setLineDash([4, 5]); c.strokeStyle = color; c.lineWidth = 1
      c.beginPath(); c.moveTo(this.player.x, this.player.y); c.lineTo(end.x, end.y); c.stroke()
      c.setLineDash([]); c.lineWidth = 2
      c.beginPath(); c.ellipse(end.x, end.y, 8, 5, 0, 0, Math.PI * 2); c.stroke()
      c.beginPath(); c.moveTo(end.x - 12, end.y); c.lineTo(end.x + 12, end.y)
      c.moveTo(end.x, end.y - 9); c.lineTo(end.x, end.y + 9); c.stroke()
      c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillStyle = color
      c.fillText(points === 2 ? '已对准中心，松手！' : points === 1 ? '可以落台，松手起跳' : '让准星靠近平台中心', this.target.x, this.target.y - 32)
      c.restore()
    }
    const p = this.player, lift = this.flight ? Math.sin(this.flight.t * Math.PI) * 105 : 0
    ellipse(p.x, p.y + 3, 12, 6, '#193d3530')
    c.save(); c.translate(p.x, p.y - lift + this.fall)
    if (this.holding) c.scale(1 + this.data.power / 500, 1 - this.data.power / 400)
    c.fillStyle = '#204f43'; c.beginPath(); c.moveTo(-9, -7); c.lineTo(-7, -30); c.quadraticCurveTo(0, -37, 7, -30); c.lineTo(9, -7); c.quadraticCurveTo(0, 1, -9, -7); c.fill()
    ellipse(0, -42, 10, 10, '#204f43'); ellipse(3, -44, 2, 2, '#e9f6ed')
    c.restore(); c.restore()
  }
})
