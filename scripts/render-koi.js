const KOI_VARIETIES = [
{ name:'kohaku',  base:'#fbf3e6', belly:'#ffffff', patches:['#d43b2e','#b8281d'], patchCount:[2,3] },
{ name:'showa',   base:'#1c1c1c', belly:'#3a3a3a', patches:['#e0442f','#f5f0e4'], patchCount:[3,4] },
{ name:'bekko',   base:'#f5efe0', belly:'#ffffff', patches:['#232323'],            patchCount:[2,3] },
{ name:'ogon',    base:'#e8b23c', belly:'#ffdd8a', patches:[],                    patchCount:[0,0] },
{ name:'shusui',  base:'#5f7d8a', belly:'#dfe8e6', patches:['#c94a2e'],            patchCount:[1,2] },
{ name:'asagi',   base:'#7d9aa3', belly:'#e6b8ab', patches:[],                    patchCount:[0,0] },];

class Fish {
constructor (isCompanion=false) {
    this.isCompanion = isCompanion;
    this.x = Math.random()*W;
    this.y = Math.random()*H;
    this.angle = Math.random()*Math.PI*2;
    this.speed = 0.5 + Math.random()*0.5;
    this.wanderT = Math.random()*1000;
    this.len = isCompanion ? 15 : 24 + Math.random()*14;
    this.fleeing = 0;

    if (isCompanion) {
      this.variety = { name:'cursor', base:'#ffffff', belly:'#ffffff', patches:[], patchCount:[0,0] };
      this.patches = [];
    } 
    else {
      this.variety = KOI_VARIETIES[Math.floor(Math.random()*KOI_VARIETIES.length)];
      const n = this.variety.patchCount[0] + Math.floor(Math.random()*(this.variety.patchCount[1]-this.variety.patchCount[0]+1));
      this.patches = [];
      for(let i=0;i<n;i++){
        this.patches.push({
          x: (Math.random()-0.5)*this.len*0.75,
          y: (Math.random()-0.5)*this.len*0.28,
          rx: this.len*(0.14+Math.random()*0.16),
          ry: this.len*(0.08+Math.random()*0.1),
          rot: Math.random()*Math.PI,
          color: this.variety.patches[Math.floor(Math.random()*this.variety.patches.length)]
        });
      }
    }
  }

  update() {
    this.wanderT += 0.012;
    if (this.isCompanion) {
      const dx = mouse.x - this.x, dy = mouse.y - this.y;
      const dist = Math.hypot(dx,dy);
      const targetAngle = Math.atan2(dy,dx);
      let diff = targetAngle - this.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.angle += diff * 0.22;
      this.speed = Math.min(dist*0.18, 10);
      if(dist < 4) this.speed = 0;
    } 
    
    else if(this.fleeing > 0){
      this.fleeing--;
      this.speed += (3.2 - this.speed)*0.15;
    } 
    
    else {
      this.angle += Math.sin(this.wanderT)*0.025;
      this.speed += (0.6 - this.speed)*0.02;
    }

    this.x += Math.cos(this.angle)*this.speed;
    this.y += Math.sin(this.angle)*this.speed;

    if (!this.isCompanion) {
      if(this.x < -40) this.x = W+40;
      if(this.x > W+40) this.x = -40;
      if(this.y < -40) this.y = H+40;
      if(this.y > H+40) this.y = -40;
    } 
    
    else {
      this.x = Math.max(20, Math.min(W-20, this.x));
      this.y = Math.max(20, Math.min(H-20, this.y));
    }
  }

  bodyPath(L) {
    ctx.beginPath();
    ctx.moveTo(L*0.55, 0);
    ctx.quadraticCurveTo(L*0.25,-L*0.34,-L*0.42,-L*0.16);
    ctx.quadraticCurveTo(-L*0.5,0,-L*0.42,L*0.16);
    ctx.quadraticCurveTo(L*0.25,L*0.34,L*0.55,0);
    ctx.closePath();
  }
  draw(){
    const L = this.len;
    const wag = Math.sin(this.wanderT*9)*0.3;
    const finColor = this.isCompanion ? '#ffffff' : (this.variety.patches[0] || this.variety.base);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if(this.isCompanion){
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.95)';
      ctx.shadowBlur = 18;
      this.bodyPath(L);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
      ctx.restore();
    }

    const bodyGrad = ctx.createLinearGradient(0,-L*0.32,0,L*0.32);
    bodyGrad.addColorStop(0, this.variety.base);
    bodyGrad.addColorStop(1, this.variety.belly);
    this.bodyPath(L);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // patches clipped to body silhouette - drawn as plain ellipses
    if(this.patches.length){
      ctx.save();
      this.bodyPath(L);
      ctx.clip();
      this.patches.forEach(p=>{
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0,0,p.rx,p.ry,0,0,Math.PI*2);
        ctx.fillStyle = p.color;   
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    if(this.isCompanion){
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 10;
      this.bodyPath(L);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(L*0.42,-L*0.04,L*0.045,0,Math.PI*2);
    ctx.fillStyle = this.isCompanion ? 'rgba(30,30,30,0.9)' : 'rgba(20,15,10,0.85)';
    ctx.fill();

    ctx.restore();
  }
}

const fishArr = [];
for(let i=0;i<7;i++) fishArr.push(new Fish());
const companion = new Fish(true);
fishArr.push(companion);