class Canvas {
  canvas;
  balls = [];
  cooldown_new_ball;
  CANVAS_BG_COLOR = "#C8C8C8";

  constructor(canvas, configs) {
    this.canvas = canvas;
    this.resize();
    this.updateConfigs(configs);
    this.cooldown_new_ball = this.COOLDOWN_NEW_BALL;
  }

  updateConfigs(configs) {
    this.NUM_MAX_BALL = Number(configs.ballCount);
    this.BALL_MIN_DIAMETER_RATIO = Number(configs.minBallDiameter) * 0.01;
    this.BALL_MAX_DIAMETER_RATIO = Number(configs.maxBallDiameter) * 0.01;
    this.BALL_MIN_VELOCITY_RATIO_PER_SEC =
      Number(configs.minBallVelocity) * 0.01;
    this.BALL_MAX_VELOCITY_RATIO_PER_SEC =
      Number(configs.maxBallVelocity) * 0.01;
    this.COOLDOWN_NEW_BALL = Number(configs.cooldownNewBall);
  }

  fitConfigs(ball) {
    const minBorderLength = Math.min(this.canvas.width, this.canvas.height);
    const radius = ball.radius;
    const velocity = ball.velocity.len();
    return (
      (minBorderLength * this.BALL_MIN_DIAMETER_RATIO) / 2 <= radius &&
      radius <= (minBorderLength * this.BALL_MAX_DIAMETER_RATIO) / 2 &&
      // minBorderLength * this.BALL_MIN_VELOCITY_RATIO_PER_SEC <= velocity &&
      velocity <= minBorderLength * this.BALL_MAX_VELOCITY_RATIO_PER_SEC
    );
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  generateNewBall() {
    const minBorderLength = Math.min(this.canvas.width, this.canvas.height);
    const radius = randomInt(
      (minBorderLength * this.BALL_MIN_DIAMETER_RATIO) / 2,
      (minBorderLength * this.BALL_MAX_DIAMETER_RATIO) / 2,
    );
    const velocity = V2.fromPolar(
      randomInt(
        minBorderLength * this.BALL_MIN_VELOCITY_RATIO_PER_SEC,
        minBorderLength * this.BALL_MAX_VELOCITY_RATIO_PER_SEC,
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
          newBall.update(dt);
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
      if (this.fitConfigs(ball) && i < this.NUM_MAX_BALL) {
        ball.checkCollisionWithBorder({
          minX: 0,
          minY: 0,
          maxX: this.canvas.width,
          maxY: this.canvas.height,
        });
      }
    }
    for (let i = 0; i < this.balls.length; ++i) {
      this.balls[i].update(dt);
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
    return this.sub(that).len();
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

  update(dt) {
    this.centerPos = this.centerPos.add(this.velocity.scale(dt));
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
  const form = document.getElementById("configs");
  const configs = Object.fromEntries(new FormData(form).entries());
  const canvas = new Canvas(document.getElementById("canvas"), configs);
  form.addEventListener("change", () => {
    canvas.updateConfigs(Object.fromEntries(new FormData(form).entries()));
  });
  document.querySelectorAll("button.minus").forEach((button) => {
    button.addEventListener("click", (e) => {
      const input = e.target.parentElement.querySelector("input");
      input.stepDown();
      input.form.dispatchEvent(new Event("change"));
    });
  });
  document.querySelectorAll("button.plus").forEach((button) => {
    button.addEventListener("click", (e) => {
      const input = e.target.parentElement.querySelector("input");
      input.stepUp();
      input.form.dispatchEvent(new Event("change"));
    });
  });

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
