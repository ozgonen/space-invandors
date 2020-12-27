import {AfterViewInit, Component, OnDestroy} from '@angular/core';
import {
  ALIEN_BOTTOM_ROW,
  ALIEN_MIDDLE_ROW,
  ALIEN_SQUAD_WIDTH,
  ALIEN_TOP_ROW,
  ALIEN_X_MARGIN,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  IS_CHROME,
  PLAYER_CLIP_RECT,
  SPRITE_SHEET_SRC,
  TEXT_BLINK_FREQ
} from './space-Invaders.consts';
import {checkRectCollision, clamp, drawIntoCanvas, getRandomArbitrary} from './space-Invaders.utils';
import {fromEvent, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {Point2D} from './classes/point2-d';
import {Rect} from './classes/rect';

export let ctx              = null;
export let spriteSheetImg   = null;
export let bulletImg        = null;
export let alienDirection   = -1;
export let updateAlienLogic = false;
export let alienYDown       = 0;

let canvas          = null;
let lastTime        = 0;
let player          = null;
let aliens          = [];
let particleManager = null;
let alienCount      = 0;
let wave            = 1;
let hasGameStarted  = false;

export function reset(): void {
  aliens = [];
  setupAlienFormation();
  player.reset();
}

export function setupAlienFormation(): void {
  alienCount = 0;
  for (let i = 0, len = 5 * 11; i < len; i++) {
    const gridX = (i % 11);
    const gridY = Math.floor(i / 11);
    let clipRects;
    switch (gridY) {
      case 0:
      case 1:
        clipRects = ALIEN_BOTTOM_ROW;
        break;
      case 2:
      case 3:
        clipRects = ALIEN_MIDDLE_ROW;
        break;
      case 4:
        clipRects = ALIEN_TOP_ROW;
        break;
    }
    aliens
      .push(
        new Enemy(
          clipRects,
          (CANVAS_WIDTH / 2 - ALIEN_SQUAD_WIDTH / 2) + ALIEN_X_MARGIN / 2 + gridX * ALIEN_X_MARGIN,
          CANVAS_HEIGHT / 3.25 - gridY * 40));
    alienCount++;
  }
}


export class ParticleExplosion {
  particlePool;
  particles;

  constructor() {
    this.particlePool = [];
    this.particles    = [];
  }

  draw(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.moves++;
      particle.x += particle.xunits;
      particle.y += particle.yunits + (particle.gravity * particle.moves);
      particle.life--;

      if (particle.life <= 0) {
        if (this.particlePool.length < 100) {
          this.particlePool.push(this.particles.splice(i, 1));
        } else {
          this.particles.splice(i, 1);
        }
      } else {
        ctx.globalAlpha = (particle.life) / (particle.maxLife);
        ctx.fillStyle   = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.width, particle.height);
        ctx.globalAlpha = 1;
      }
    }
  }

  createExplosion(x, y, color, exNumber, width, height, spd, grav, lif): void {
    for (let i = 0; i < exNumber; i++) {
      const angle   = Math.floor(Math.random() * 360);
      const speed   = Math.floor(Math.random() * spd / 2) + spd;
      const life    = Math.floor(Math.random() * lif) + lif / 2;
      const radians = angle * Math.PI / 180;
      const xunits  = Math.cos(radians) * speed;
      const yunits  = Math.sin(radians) * speed;

      if (this.particlePool.length > 0) {
        const tempParticle   = this.particlePool.pop();
        tempParticle.x       = x;
        tempParticle.y       = y;
        tempParticle.xunits  = xunits;
        tempParticle.yunits  = yunits;
        tempParticle.life    = life;
        tempParticle.color   = color;
        tempParticle.width   = width;
        tempParticle.height  = height;
        tempParticle.gravity = grav;
        tempParticle.moves   = 0;
        tempParticle.alpha   = 1;
        tempParticle.maxLife = life;
        this.particles.push(tempParticle);
      } else {
        this.particles.push({
          x,
          y,
          xunits,
          yunits,
          life,
          color,
          width,
          height,
          gravity: grav,
          moves: 0,
          alpha: 1,
          maxLife: life
        });
      }

    }
  }

}

export class BaseSprite {
  img;
  position;
  scale;
  bounds;
  doLogic;

  constructor(img, x, y) {
    this.img      = img;
    this.position = new Point2D(x, y);
    this.scale    = new Point2D(1, 1);
    this.bounds   = new Rect(x, y, this.img.width, this.img.height);
    this.doLogic  = true;
  }

  update(dt): void {
  }

  _updateBounds(): void {
    this.bounds
      .set(
        this.position.x,
        this.position.y,
        Math.floor(0.5 + this.img.width * this.scale.x),
        Math.floor(0.5 + this.img.height * this.scale.y));
  }


  _drawImage(): void {
    ctx.drawImage(this.img, this.position.x, this.position.y);
  }

  draw(resized): void {
    this._updateBounds();
    this._drawImage();
  }

}

export class SheetSprite extends BaseSprite {
  clipRect;

  constructor(sheetImg, clipRect, x, y) {
    super(sheetImg, x, y);
    this.clipRect = clipRect;
    this.bounds.set(x, y, this.clipRect.w, this.clipRect.h);
  }

  update(dt): void {
  }

  _updateBounds(): void {
    const w = Math.floor(0.5 + this.clipRect.w * this.scale.x);
    const h = Math.floor(0.5 + this.clipRect.h * this.scale.y);
    this.bounds.set(this.position.x - w / 2, this.position.y - h / 2, w, h);
  }

  _drawImage(): void {
    ctx.save();
    ctx.transform(this.scale.x, 0, 0, this.scale.y, this.position.x, this.position.y);
    ctx.drawImage(
      this.img,
      this.clipRect.x,
      this.clipRect.y,
      this.clipRect.w,
      this.clipRect.h,
      Math.floor(0.5 + -this.clipRect.w * 0.5),
      Math.floor(0.5 + -this.clipRect.h * 0.5),
      this.clipRect.w,
      this.clipRect.h);
    ctx.restore();

  }

  draw(resized): void {
    super.draw(resized);
  }
}

export class Player extends SheetSprite {
  private lives: number;
  xVel;
  bullets;
  bulletDelayAccumulator;
  score;
  position;

  constructor() {
    super(spriteSheetImg, PLAYER_CLIP_RECT, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 70);
    this.scale.set(0.85, 0.85);
    this.lives                  = 3;
    this.xVel                   = 0;
    this.bullets                = [];
    this.bulletDelayAccumulator = 0;
    this.score                  = 0;
    this.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 70);
  }

  reset(): void {
    this.lives = 3;
    this.score = 0;
    this.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 70);
  }

  shoot(): void {
    const bullet = new Bullet(this.position.x, this.position.y - this.bounds.h / 2, 1, 1000);
    this.bullets.push(bullet);
  }


  updateBullets(dt): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let bullet = this.bullets[i];
      if (bullet.alive) {
        bullet.update(dt);
      } else {
        this.bullets.splice(i, 1);
        bullet = null;
      }
    }
  }

  update(dt): void {
    // update time passed between shots
    this.bulletDelayAccumulator += dt;


    // cap player position in screen bounds
    this.position.x = clamp(this.position.x, this.bounds.w / 2, CANVAS_WIDTH - this.bounds.w / 2);
    this.updateBullets(dt);
  }

  draw(resized): void {
    super.draw(resized);

    // draw bullets
    for (let i = 0, len = this.bullets.length; i < len; i++) {
      const bullet = this.bullets[i];
      if (bullet.alive) {
        bullet.draw(resized);
      }
    }
  }


}

export class Bullet extends BaseSprite {
  direction;
  speed;
  alive;

  constructor(x, y, direction, speed) {
    super(bulletImg, x, y);
    this.direction = direction;
    this.speed     = speed;
    this.alive     = true;
  }

  update(dt): void {
    this.position.y -= (this.speed * this.direction) * dt;

    if (this.position.y < 0) {
      this.alive = false;
    }
  }

  draw(resized): void {
    super.draw(resized);
  }
}

export class Enemy extends SheetSprite {
  clipRects;
  alive;
  onFirstState: boolean;
  stepDelay;
  stepAccumulator;
  doShoot;
  bullet;

  constructor(clipRects, x, y) {
    super(spriteSheetImg, clipRects[0], x, y);
    this.clipRects = clipRects;
    this.scale.set(0.5, 0.5);
    this.alive           = true;
    this.onFirstState    = true;
    this.stepDelay       = 1; // try 2 secs to start with...
    this.stepAccumulator = 0;
    this.doShoot         = false;
    this.bullet          = null;
  }

  toggleFrame(): void {
    this.onFirstState = !this.onFirstState;
    this.clipRect     = (this.onFirstState) ? this.clipRects[0] : this.clipRects[1];
  }

  shoot(): void {
    this.bullet = new Bullet(this.position.x, this.position.y + this.bounds.w / 2, -1, 500);
  }

  update(dt): void {
    this.stepAccumulator += dt;

    if (this.stepAccumulator >= this.stepDelay) {
      if (this.position.x < this.bounds.w / 2 + 20 && alienDirection < 0) {
        updateAlienLogic = true;
      }
      if (alienDirection === 1 && this.position.x > CANVAS_WIDTH - this.bounds.w / 2 - 20) {
        updateAlienLogic = true;
      }
      if (this.position.y > CANVAS_WIDTH - 50) {
        reset();
      }

      if (getRandomArbitrary(0, 1000) <= 5 * (this.stepDelay + 1)) {
        this.doShoot = true;
      }
      this.position.x += 10 * alienDirection;
      this.toggleFrame();
      this.stepAccumulator = 0;
    }
    this.position.y += alienYDown;

    if (this.bullet !== null && this.bullet.alive) {
      this.bullet.update(dt);
    } else {
      this.bullet = null;
    }
  }

  draw(resized): void {
    super.draw(resized);
    if (this.bullet !== null && this.bullet.alive) {
      this.bullet.draw(resized);
    }
  }
}


@Component({
  selector: 'app-space-invaders',
  templateUrl: './space-invaders.component.html',
  styleUrls: ['./space-invaders.component.css']
})
export class SpaceInvadersComponent implements AfterViewInit, OnDestroy {

  ngUnSubscribe: Subject<void> = new Subject<void>();


  constructor() {
    fromEvent(document, 'keydown')
      .pipe(takeUntil(this.ngUnSubscribe))
      .subscribe((e: KeyboardEvent) => {
        switch (e.code) {
          case 'Enter':
            if (!hasGameStarted) {
              this.initGame();
              hasGameStarted = true;
            }
            break;

          case 'ArrowRight':
            if (hasGameStarted) {
              player.position.x += 20;

            }
            break;

          case 'ArrowLeft':
            if (hasGameStarted) {
              player.position.x += -20;

            }
            break;

          case 'KeyX':
            if (hasGameStarted && player.bulletDelayAccumulator > 0.5 ) {
              player.shoot();
              player.bulletDelayAccumulator = 0;
            }
            break;

          default:
            break;
        }
      });
  }

  ngAfterViewInit(): void {
    this.init();
    this.animate();
  }

  ngOnDestroy(): void {
    this.ngUnSubscribe.next();
    this.ngUnSubscribe.complete();
  }

// ###################################################################
// Initialization functions
//
// ###################################################################

  initCanvas(): void {
    // create our canvas and context
    canvas = document.getElementById('game-canvas');
    ctx    = canvas.getContext('2d');

    // turn off image smoothing
    this.setImageSmoothing(false);

    // create our main sprite sheet img
    spriteSheetImg     = new Image();
    spriteSheetImg.src = SPRITE_SHEET_SRC;
    this.preDrawImages();

    // add event listeners and initially resize
    window.addEventListener('resize', this.resize);
  }


  preDrawImages(): void {
    const imgCanvas = drawIntoCanvas(2, 8, (tempCtx) => {
      tempCtx.fillStyle = 'white';
      tempCtx.fillRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);
    });
    bulletImg       = new Image();
    bulletImg.src   = imgCanvas.toDataURL();
  }


  setImageSmoothing(value): void {
    ctx.imageSmoothingEnabled       = value;
    ctx.mozImageSmoothingEnabled    = value;
    ctx.oImageSmoothingEnabled      = value;
    ctx.webkitImageSmoothingEnabled = value;
    ctx.msImageSmoothingEnabled     = value;
  }


  initGame(): void {
    aliens          = [];
    player          = new Player();
    particleManager = new ParticleExplosion();
    setupAlienFormation();
    this.drawBottomHud();
  }


  init(): void {
    this.initCanvas();
    this.resize();
  }


// ###################################################################
// Drawing & Update functions
//
// ###################################################################

  updateAliens(dt): void {
    if (updateAlienLogic) {
      updateAlienLogic = false;
      alienDirection   = -alienDirection;
      alienYDown       = 25;
    }

    for (let i = aliens.length - 1; i >= 0; i--) {
      let alien = aliens[i];
      if (!alien.alive) {
        aliens.splice(i, 1);
        alien = null;
        alienCount--;
        if (alienCount < 1) {
          wave++;
          setupAlienFormation();
        }
        return;
      }

      alien.stepDelay = ((alienCount * 20) - (wave * 10)) / 1000;
      if (alien.stepDelay <= 0.05) {
        alien.stepDelay = 0.05;
      }
      alien.update(dt);

      if (alien.doShoot) {
        alien.doShoot = false;
        alien.shoot();
      }
    }
    alienYDown = 0;
  }


  resolveBulletEnemyCollisions(): void {
    const bullets = player.bullets;

    for (let i = 0, len = bullets.length; i < len; i++) {
      const bullet = bullets[i];
      for (let j = 0, alen = aliens.length; j < alen; j++) {
        const alien = aliens[j];
        if (checkRectCollision(bullet.bounds, alien.bounds)) {
          alien.alive = bullet.alive = false;
          particleManager.createExplosion(alien.position.x, alien.position.y, 'white', 70, 5, 5, 3, .15, 50);
          player.score += 25;
        }
      }
    }
  }


  resolveBulletPlayerCollisions(): void {
    for (let i = 0, len = aliens.length; i < len; i++) {
      const alien = aliens[i];
      if (alien.bullet !== null && checkRectCollision(alien.bullet.bounds, player.bounds)) {
        if (player.lives === 0) {
          hasGameStarted = false;
        } else {
          alien.bullet.alive = false;
          particleManager.createExplosion(player.position.x, player.position.y, 'green', 100, 8, 8, 6, 0.001, 40);
          player.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 70);
          player.lives--;
          break;
        }

      }
    }
  }


  resolveCollisions(): void {
    this.resolveBulletEnemyCollisions();
    this.resolveBulletPlayerCollisions();
  }


  updateGame(dt): void {
    player.update(dt);
    this.updateAliens(dt);
    this.resolveCollisions();
  }


  fillText(text, x, y, color = null, fontSize = null): void {
    if (typeof color !== 'undefined') {
      ctx.fillStyle = color;
    }
    if (typeof fontSize !== 'undefined') {
      ctx.font = fontSize + 'px Play';
    }
    ctx.fillText(text, x, y);
  }


  fillCenteredText(text, x, y, color = null, fontSize = null): void {
    const metrics = ctx.measureText(text);
    this.fillText(text, x - metrics.width / 2, y, color, fontSize);
  }


  fillBlinkingText(text, x, y, blinkFreq, color = null, fontSize = null): void {
    if (Math.floor(0.5 + Date.now() / blinkFreq) % 2) {
      this.fillCenteredText(text, x, y, color, fontSize);
    }
  }


  drawBottomHud(): void {
    ctx.fillStyle = '#02ff12';
    ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 2);
    this.fillText(player.lives + ' x ', 10, CANVAS_HEIGHT - 7.5, 'white', 20);
    ctx.drawImage(spriteSheetImg, player.clipRect.x, player.clipRect.y, player.clipRect.w,
      player.clipRect.h, 45, CANVAS_HEIGHT - 23, player.clipRect.w * 0.5,
      player.clipRect.h * 0.5);
    this.fillText('CREDIT: ', CANVAS_WIDTH - 115, CANVAS_HEIGHT - 7.5);
    this.fillCenteredText('SCORE: ' + player.score, CANVAS_WIDTH / 2, 20);
    this.fillBlinkingText('00', CANVAS_WIDTH - 25, CANVAS_HEIGHT - 7.5, TEXT_BLINK_FREQ);
  }


  drawAliens(resized): void {
    aliens.forEach(tempAlien => {
      tempAlien.draw(resized);
    });
  }


  drawGame(resized): void {
    player.draw(resized);
    this.drawAliens(resized);
    particleManager.draw();
    this.drawBottomHud();
  }


  drawStartScreen(): void {
    this.fillCenteredText('Space Invaders', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2.75, '#FFFFFF', 36);
    this.fillBlinkingText('Press enter to play!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 500, '#FFFFFF', 36);
  }


  animate(): void {

    const now = window.performance.now();
    let dt    = now - lastTime;
    if (dt > 100) {
      dt = 100;
    }

    if (hasGameStarted) {
      this.updateGame(dt / 1000);
    }

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (hasGameStarted) {
      this.drawGame(false);
    } else {
      this.drawStartScreen();
    }
    lastTime = now;
    window.requestAnimationFrame(this.animate.bind(this));
  }


// ###################################################################
// Event Listener functions
//
// ###################################################################

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // calculate the scale factor to keep a correct aspect ratio
    const scaleFactor = Math.min(w / CANVAS_WIDTH, h / CANVAS_HEIGHT);

    if (IS_CHROME) {
      canvas.width  = CANVAS_WIDTH * scaleFactor;
      canvas.height = CANVAS_HEIGHT * scaleFactor;
      this.setImageSmoothing(false);
      ctx.transform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    } else {
      // resize the canvas css properties
      canvas.style.width  = CANVAS_WIDTH * scaleFactor + 'px';
      canvas.style.height = CANVAS_HEIGHT * scaleFactor + 'px';
    }
  }


}
