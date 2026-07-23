const KOI_HUES = {
  red:    ['#e0473a', '#c22e22', '#932015'],
  yellow: ['#f0c14b', '#d99a2b', '#b87a1e'],
};

const FIN_COLOR = 'rgba(214, 228, 238, 0.85)'
const SPRITE_SCALE = 2;
const N_PHASES = 16; 

function bendAt(xCoeff, rightC, leftC, phase, ampTail){
  let u = (rightC - xCoeff) / (rightC + leftC);
  if(u < 0) u = 0; 
  if(u > 1) u = 1;
  return Math.sin(phase - u*2.7) * ampTail * Math.pow(u, 1.6);
}

function bodySilhouette(ctx, L, shape, phase){
  const depth = shape.depth || 1;
  const nose = shape.nose || 1;
  const tailFullness = shape.tailFullness || 1;
  const bulge = shape.bulge || 0;
  const rightC = 0.56 * nose;
  const leftC = 0.82 * tailFullness;
  const ampTail = L * 0.15;

  const headX = L*rightC;
  const headY = 0;

  const c1x = L*(0.36+bulge);
  const c1y = -L*0.32*depth + bendAt(0.36+bulge, rightC, leftC, phase, ampTail);

  const chestX = L*0.1;
  const chestY = -L*0.29*depth + bendAt(0.1, rightC, leftC, phase, ampTail);

  const c2x = -L*0.2;
  const c2y = -L*0.25*depth + bendAt(-0.2, rightC, leftC, phase, ampTail);

  const waistX = -L*0.44;
  const waistY = -L*0.1*depth + bendAt(-0.44, rightC, leftC, phase, ampTail);

  const c3x = -L*0.62;
  const c3y = -L*0.16*depth + bendAt(-0.62, rightC, leftC, phase, ampTail);

  const lobeX = -L*leftC;
  const lobeY = -L*0.34*tailFullness*depth + bendAt(-leftC, rightC, leftC, phase, ampTail);

  const c4x = -L*leftC*0.9;
  const c4y = -L*0.05*depth + bendAt(-leftC*0.9, rightC, leftC, phase, ampTail);

  const notchX = -L*leftC*0.7;
  const notchY = bendAt(-leftC*0.7, rightC, leftC, phase, ampTail);

  ctx.beginPath();
  ctx.moveTo(headX, headY);
  ctx.quadraticCurveTo(c1x, c1y, chestX, chestY);
  ctx.quadraticCurveTo(c2x, c2y, waistX, waistY);
  ctx.quadraticCurveTo(c3x, c3y, lobeX, lobeY);
  ctx.quadraticCurveTo(c4x, c4y, notchX, notchY);
  ctx.quadraticCurveTo(c4x, -c4y, lobeX, -lobeY);
  ctx.quadraticCurveTo(c3x, -c3y, waistX, -waistY);
  ctx.quadraticCurveTo(c2x, -c2y, chestX, -chestY);
  ctx.quadraticCurveTo(c1x, -c1y, headX, headY);
  ctx.closePath(); 
}

class Fish {
constructor (isCompanion=false) {
    this.isCompanion = isCompanion;
    this.x = Math.random()*W;
    this.y = Math.random()*H;
    this.angle = Math.random()*Math.PI*2;
    this.speed = 0.5 + Math.random()*0.5;
    this.turnRate = randRange(0.035, 0.075);
    this.wanderT = Math.random()*1000;
    this.swimPhase = Math.random()*Math.PI*2;
    this.len = isCompanion ? 15 : 24 + Math.random()*14;
    this.fleeing = 0;

    if (isCompanion) {
      this.finColor = '#ffffff';
      this.shape = { depth:1, nose:1, tailFullness:1.05, bulge:0 };
      return;
    } 

    this.shape = {
      depth: randRange(0.88, 1.15),
      nose: randRange(0.94, 1.08),
      tailFullness: randRange(0.9, 1.2),
      bulge: randRange(-0.4, 0.07)
    };
    const hue = Math.random() < 0.5 ? 'red' : 'yellow'
    const hasBlack = Math.random() < 0.32;
    this.patchColors = hasBlack ? [...KOI_HUES[hue], '#201d1a'] : [...KOI_HUES[hue]];
    this.finColor = this.patchColors[0];
    this.buildPatchPlan();
    this.buildSpriteSheet();
  }
  
  buildPatchPlan() {
    const mainBlobs = 2 + Math.floor(Math.random()*3);
    this.patches = [];
    for(let i=0;i<mainBlobs;i++){
      const color = this.patchColors[Math.floor(Math.random()*this.patchColors.length)];
      this.patches.push({
        cx: randRange(-0.32, 0.4),
        cy: randRange(-0.24, 0.24),
        r: randRange(0.13, 0.27),
        lobes: 6,
        irregularity: 0.32,
        alpha: 0.92,
        color: color
      });
    }
  }

  buildSpriteSheet(){
    const L = this.len;
    const nose = this.shape.nose;
    const tailFullness = this.shape.tailFullness;
    const depth = this.shape.depth;
    const rightC = 0.56*nose;
    const leftC = 0.82*tailFullness;
    const pad = L*0.12;
    const bendPad = L*0.18;

    this.spriteW = L*(rightC+leftC) + pad*2;
    this.spriteH = L*0.5*depth*2 + bendPad*2 + pad*2;
    this.originX = pad + L*leftC;
    this.originY = this.spriteH/2;

    this.sprites = [];
    for(let i=0;i<N_PHASES;i++){
      const phase = (i/N_PHASES) * Math.PI * 2;
      this.sprites.push(this.renderPose(phase));
    }
  }

  draw(){
    const L = this.len;
    const flutter = Math.sin(this.swimPhase*1.3)*0.1;

    for(let side=-1; side<=1; side+=2){
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.translate(L*0.02, side*L*0.36);
      ctx.rotate(side*(0.5 + flutter));
      ctx.beginPath();
      ctx.ellipse(0,0, L*0.3, L*0.13, 0,0, Math.PI*2);
      ctx.fillStyle = FIN_COLOR;
      ctx.fill();
      ctx.restore();
    }

    let norm = this.swimPhase % (Math.PI*2);
    if(norm < 0) norm += Math.PI*2;
    const idx = Math.floor((norm/(Math.PI*2)) * N_PHASES) % N_PHASES;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.drawImage(this.sprites[idx], -this.originX, -this.originY, this.spriteW, this.spriteH)
    ctx.restore();
  }
}

const fishArr = [];
for(let i=0; i<9; i++) {
  fishArr.push(new Fish());
}
const companion = new Fish(true);
fishArr.push(companion);