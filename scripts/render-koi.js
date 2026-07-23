class Fish{
  constructor(isCompanion=false){
    this.isCompanion = isCompanion;
    this.x = Math.random()*W;
    this.y = Math.random()*H;
    this.angle = Math.random()*Math.PI*2;
    this.speed = 0.5 + Math.random()*0.6;
    this.wanderT = Math.random()*1000;
    this.len = 16 + Math.random()*10;
    this.color = ['#e0a04a','#e8b75d','#d97b4a','#f0c479'][Math.floor(Math.random()*4)];
    this.fleeing = 0;
  }
  update(){
    this.wanderT += 0.01;
    if(this.isCompanion){
      const dx = mouse.x - this.x, dy = mouse.y - this.y;
      const dist = Math.hypot(dx,dy);
      const targetAngle = Math.atan2(dy,dx);
      let diff = targetAngle - this.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.angle += diff * 0.03;
      this.speed = Math.min(2.6, dist*0.02);
    } else if(this.fleeing > 0){
      this.fleeing--;
      this.speed = 2.6;
    } else {
      this.angle += Math.sin(this.wanderT)*0.03;
      this.speed += (0.7 - this.speed)*0.02;
    }
    this.x += Math.cos(this.angle)*this.speed;
    this.y += Math.sin(this.angle)*this.speed;

    if(this.x < -30) this.x = W+30;
    if(this.x > W+30) this.x = -30;
    if(this.y < -30) this.y = H+30;
    if(this.y > H+30) this.y = -30;
  }
  draw(){
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const wag = Math.sin(this.wanderT*8)*0.35;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.len*0.6,0);
    ctx.quadraticCurveTo(0, -this.len*0.35, -this.len*0.5, 0);
    ctx.quadraticCurveTo(0, this.len*0.35, this.len*0.6, 0);
    ctx.fill();
    ctx.save();
    ctx.translate(-this.len*0.5,0);
    ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(-this.len*0.5, -this.len*0.3);
    ctx.lineTo(-this.len*0.5, this.len*0.3);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
}

const fishArr = [];
for(let i=0;i<8;i++) fishArr.push(new Fish());
const companion = new Fish(true);
fishArr.push(companion);