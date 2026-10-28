class Canvas {
  canvas;
  balls = [];
  cooldown_new_ball;
  CANVAS_BG_COLOR = "#C8C8C8";
  BALL_MIN_RADIUS_RATIO = 0.03 / 2;
  BALL_MAX_RADIUS_RATIO = 0.1 / 2;
  BALL_MIN_VELOCITY_RATIO = 0.005;
  BALL_MAX_VELOCITY_RATIO = 0.02;
  NUM_MAX_BALL = 30;
  COOLDOWN_NEW_BALL = 1.0;

  constructor(canvas) {
    this.canvas = canvas;
    this.resize();
    this.cooldown_new_ball = this.COOLDOWN_NEW_BALL;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  generateNewBall() {
    const minBorderLength = Math.min(this.canvas.width, this.canvas.height);
    const radius = randomInt(
      minBorderLength * this.BALL_MIN_RADIUS_RATIO,
      minBorderLength * this.BALL_MAX_RADIUS_RATIO,
    );
    const velocity = V2.fromPolar(
      randomInt(
        minBorderLength * this.BALL_MIN_VELOCITY_RATIO,
        minBorderLength * this.BALL_MAX_VELOCITY_RATIO,
      ),
      Math.random() * 2 * Math.PI,
    );
    const ball = new Ball(
      new V2(
        randomInt(radius, window.innerWidth - radius),
        randomInt(radius, window.innerHeight - radius),
      ),
      radius,
      {
        r: random255(),
        g: random255(),
        b: random255(),
      },
      velocity,
    );
    return ball;
  }

  update(dt) {
    this.cooldown_new_ball -= dt;
    this.balls = this.balls.filter(this.ballInsideCanvas.bind(this));
    if (this.cooldown_new_ball < 0 && this.balls.length < this.NUM_MAX_BALL) {
      const newBall = this.generateNewBall();
      for (let ball of this.balls) {
        while (
          newBall.centerPos.dist(ball.centerPos) <=
          newBall.radius + ball.radius
        ) {
          newBall.update();
        }
      }
      this.balls.push(newBall);
      this.cooldown_new_ball = this.COOLDOWN_NEW_BALL;
    }
    for (let i = 0; i < this.balls.length; ++i) {
      const ball = this.balls[i];
      for (let j = i + 1; j < this.balls.length; ++j) {
        const thatBall = this.balls[j];
        ball.checkCollisionWithBall(thatBall, this);
      }
      ball.checkCollisionWithBorder({
        minX: 0,
        minY: 0,
        maxX: this.canvas.width,
        maxY: this.canvas.height,
      });
    }
    for (let i = 0; i < this.balls.length; ++i) {
      this.balls[i].update();
    }
  }

  ballInsideCanvas(ball) {
    return (
      ball.centerPos.x + ball.radius > 0 &&
      ball.centerPos.y + ball.radius > 0 &&
      ball.centerPos.x - ball.radius < this.canvas.width &&
      ball.centerPos.y - ball.radius < this.canvas.height
    );
  }

  render() {
    const context = this.canvas.getContext("2d");
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.beginPath();
    context.fillStyle = this.CANVAS_BG_COLOR;
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let ball of this.balls) {
      ball.render(context);
    }
  }
}

class V2 {
  x;
  y;
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  add(that) {
    return new V2(this.x + that.x, this.y + that.y);
  }
  sub(that) {
    return new V2(this.x - that.x, this.y - that.y);
  }
  len() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
  normalize() {
    const len = this.len();
    return len === 0 ? new V2(0, 0) : new V2(this.x / len, this.y / len);
  }
  scale(scala) {
    return new V2(this.x * scala, this.y * scala);
  }
  isZero() {
    return this.len() === 0;
  }
  dist(that) {
    return this.len(this.sub(that));
  }
  static fromPolar(r, theta) {
    return new V2(r * Math.cos(theta), r * Math.sin(theta));
  }
  transform(T2) {
    return new V2(
      this.x * T2[0][0] + this.y * T2[0][1],
      this.x * T2[1][0] + this.y * T2[1][1],
    );
  }
}

class Ball {
  centerPos;
  radius;
  velocity;
  rgbColor = {};
  constructor(v2, radius, color, velocity) {
    this.centerPos = v2;
    this.radius = radius;
    this.rgbColor = color;
    this.velocity = velocity;
  }
  checkCollisionWithBall(thatBall, canvas) {
    const sumRadius = this.radius + thatBall.radius;
    const u = thatBall.centerPos.sub(this.centerPos);
    if (u.len() > sumRadius) {
      return;
    }
    const v = new V2(u.y, u.x * -1);
    const T = [
      [u.x, u.y],
      [u.y, u.x * -1],
    ];
    const detT = -1 * u.x ** 2 - u.y ** 2;
    if (detT === 0) {
      return;
    }
    const Tinverse = [
      [(u.x * -1) / detT, (u.y * -1) / detT],
      [(u.y * -1) / detT, u.x / detT],
    ];
    const { x: VuInverse, y: VvInverse } = this.velocity.transform(Tinverse);
    const { x: thatBallVuInverse, y: thatBallVvInverse } =
      thatBall.velocity.transform(Tinverse);
    if (
      (VuInverse < 0 && thatBallVuInverse > 0) ||
      (VuInverse > 0 &&
        thatBallVuInverse > 0 &&
        VuInverse < thatBallVuInverse) ||
      (VuInverse < 0 && thatBallVuInverse < 0 && VuInverse < thatBallVuInverse)
    ) {
      return;
    }
    const newVinverse = new V2(
      ((this.radius - thatBall.radius) / sumRadius) * VuInverse +
        ((2 * thatBall.radius) / sumRadius) * thatBallVuInverse,
      VvInverse,
    );
    const thatBallNewVinverse = new V2(
      ((2 * this.radius) / sumRadius) * VuInverse +
        ((thatBall.radius - this.radius) / sumRadius) * thatBallVuInverse,
      thatBallVvInverse,
    );
    const newV = newVinverse.transform(T);
    const thatBallNewV = thatBallNewVinverse.transform(T);
    this.velocity = newV;
    thatBall.velocity = thatBallNewV;
  }

  update() {
    this.centerPos = this.centerPos.add(this.velocity);
  }

  checkCollisionWithBorder(screenBorders) {
    const { minX, minY, maxX, maxY } = screenBorders;
    if (this.centerPos.x - this.radius <= minX && this.velocity.x < 0) {
      this.velocity.x *= -1;
    }
    if (this.centerPos.x + this.radius >= maxX && this.velocity.x > 0) {
      this.velocity.x *= -1;
    }
    if (this.centerPos.y - this.radius <= minY && this.velocity.y < 0) {
      this.velocity.y *= -1;
    }
    if (this.centerPos.y + this.radius >= maxY && this.velocity.y > 0) {
      this.velocity.y *= -1;
    }
  }

  render(context) {
    context.beginPath();
    context.fillStyle = `rgb(${this.rgbColor.r},${this.rgbColor.g},${this.rgbColor.b})`;
    context.arc(
      this.centerPos.x,
      this.centerPos.y,
      this.radius,
      0,
      2 * Math.PI,
    );
    context.fill();
  }
}

function randomInt(low, high) {
  return low + Math.floor(Math.random() * (high - low + 1));
}
function random255() {
  return randomInt(0, 255);
}

(() => {
  const canvas = new Canvas(document.getElementById("canvas"));

  let timeStart = null;
  function step(timeStamp) {
    if (!timeStart) {
      timeStart = timeStamp;
    }
    const dt = (timeStamp - timeStart) / 1000;
    timeStart = timeStamp;

    canvas.update(dt);
    canvas.render();

    window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);

  window.addEventListener("resize", canvas.resize.bind(canvas));
})();
