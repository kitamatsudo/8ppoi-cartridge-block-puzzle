export class Cartridge {
  // テトリミノの形状定義
  static SHAPES = [
    // I
    [[1, 1, 1, 1]],
    // O
    [[1, 1], [1, 1]],
    // T
    [[0, 1, 0], [1, 1, 1]],
    // S
    [[0, 1, 1], [1, 1, 0]],
    // Z
    [[1, 1, 0], [0, 1, 1]],
    // J
    [[1, 0, 0], [1, 1, 1]],
    // L
    [[0, 0, 1], [1, 1, 1]],
  ];

  static COLORS = [1, 2, 4, 5, 6, 8, 9]; // パレットカラー

  static onReset({ pads, speakers, screens }) {
    this.pads = pads;
    this.speakers = speakers;
    this.screens = screens;

    // 画面設定 (大きめの解像度でUI配置しやすく)
    this.screens[0].setViewBox(0, 0, 120, 100);

    this.FIELD_WIDTH = 10;
    this.FIELD_HEIGHT = 20;
    this.BLOCK_SIZE = 4;
    this.FIELD_X = 10;
    this.FIELD_Y = 8;

    // フィールド枠
    this.frameSprite = this.screens[0].addSprite(
      this.createFrame(),
      { x: this.FIELD_X - this.BLOCK_SIZE, y: this.FIELD_Y - this.BLOCK_SIZE }
    );

    this.restart();
  }

  static createFrame() {
    const frame = [];
    const width = this.FIELD_WIDTH * this.BLOCK_SIZE + 2 * this.BLOCK_SIZE;
    const height = this.FIELD_HEIGHT * this.BLOCK_SIZE + 2 * this.BLOCK_SIZE;
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const isLeftWall = x < this.BLOCK_SIZE;
        const isRightWall = x >= width - this.BLOCK_SIZE;
        const isBottom = y >= height - this.BLOCK_SIZE;
        if (isLeftWall || isRightWall || isBottom) {
          row.push(1);
        } else {
          row.push(0);
        }
      }
      frame.push(row);
    }
    return frame;
  }

  static restart() {
    this.isGameover = false;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.dropTimer = 0;
    this.dropInterval = 30;
    this.moveTimer = 0;

    // フィールド初期化
    this.field = [];
    for (let y = 0; y < this.FIELD_HEIGHT; y++) {
      this.field.push(new Array(this.FIELD_WIDTH).fill(0));
    }

    // スプライトクリア
    this.blockSprites?.forEach(s => s?.remove());
    this.blockSprites = [];
    this.currentSprites?.forEach(s => s?.remove());
    this.currentSprites = [];
    this.nextSprites?.forEach(s => s?.remove());
    this.nextSprites = [];
    this.scoreLabel?.remove();
    this.scoreText?.remove();
    this.levelText?.remove();
    this.gameoverText?.remove();
    this.gameoverText2?.remove();
    this.nextLabel?.remove();

    // UI (右側に配置)
    this.scoreLabel = this.screens[0].addText("SCORE", { x: 62, y: 10 });
    this.scoreText = this.screens[0].addText("0", { x: 62, y: 20 });
    this.levelText = this.screens[0].addText("LV1", { x: 62, y: 35 });
    this.nextLabel = this.screens[0].addText("NEXT", { x: 62, y: 50 });

    // 新しいピース
    this.nextPiece = this.randomPiece();
    this.spawnPiece();
  }

  static randomPiece() {
    const idx = Math.floor(Math.random() * this.SHAPES.length);
    return {
      shape: this.SHAPES[idx].map(row => [...row]),
      color: this.COLORS[idx],
    };
  }

  static spawnPiece() {
    this.current = this.nextPiece;
    this.nextPiece = this.randomPiece();
    this.currentX = Math.floor((this.FIELD_WIDTH - this.current.shape[0].length) / 2);
    this.currentY = 0;

    // 次のピース表示更新
    this.updateNextDisplay();

    // 衝突チェック
    if (this.collides(this.currentX, this.currentY, this.current.shape)) {
      this.gameover();
    }
  }

  static updateNextDisplay() {
    this.nextSprites?.forEach(s => s?.remove());
    this.nextSprites = [];
    const shape = this.nextPiece.shape;
    const color = this.nextPiece.color;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const block = this.createBlock(color);
          const sprite = this.screens[0].addSprite(block, {
            colorIds: [null, color],
            x: 62 + x * this.BLOCK_SIZE,
            y: 60 + y * this.BLOCK_SIZE,
          });
          this.nextSprites.push(sprite);
        }
      }
    }
  }

  static createBlock() {
    const block = [];
    for (let y = 0; y < this.BLOCK_SIZE; y++) {
      const row = [];
      for (let x = 0; x < this.BLOCK_SIZE; x++) {
        row.push(1);
      }
      block.push(row);
    }
    return block;
  }

  static collides(px, py, shape) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const fx = px + x;
          const fy = py + y;
          if (fx < 0 || fx >= this.FIELD_WIDTH || fy >= this.FIELD_HEIGHT) {
            return true;
          }
          if (fy >= 0 && this.field[fy][fx]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  static rotate(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = [];
    for (let x = 0; x < cols; x++) {
      const newRow = [];
      for (let y = rows - 1; y >= 0; y--) {
        newRow.push(shape[y][x]);
      }
      rotated.push(newRow);
    }
    return rotated;
  }

  static lockPiece() {
    const shape = this.current.shape;
    const color = this.current.color;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const fy = this.currentY + y;
          const fx = this.currentX + x;
          if (fy >= 0) {
            this.field[fy][fx] = color;
          }
        }
      }
    }
    this.clearLines();
    this.spawnPiece();
  }

  static clearLines() {
    let cleared = 0;
    for (let y = this.FIELD_HEIGHT - 1; y >= 0; y--) {
      if (this.field[y].every(cell => cell !== 0)) {
        this.field.splice(y, 1);
        this.field.unshift(new Array(this.FIELD_WIDTH).fill(0));
        cleared++;
        y++;
      }
    }
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] * this.level;
      this.score += points;
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(5, 30 - (this.level - 1) * 3);
      this.playLineClearSound();
      this.updateUI();
    }
  }

  static updateUI() {
    this.scoreText?.remove();
    this.levelText?.remove();
    this.scoreText = this.screens[0].addText(String(this.score), { x: 62, y: 20 });
    this.levelText = this.screens[0].addText("LV" + this.level, { x: 62, y: 35 });
  }

  static renderField() {
    this.blockSprites?.forEach(s => s?.remove());
    this.blockSprites = [];

    // フィールドのブロック
    for (let y = 0; y < this.FIELD_HEIGHT; y++) {
      for (let x = 0; x < this.FIELD_WIDTH; x++) {
        if (this.field[y][x]) {
          const block = this.createBlock(this.field[y][x]);
          const sprite = this.screens[0].addSprite(block, {
            colorIds: [null, this.field[y][x]],
            x: this.FIELD_X + x * this.BLOCK_SIZE,
            y: this.FIELD_Y + y * this.BLOCK_SIZE,
          });
          this.blockSprites.push(sprite);
        }
      }
    }

    // 現在のピース
    this.currentSprites?.forEach(s => s?.remove());
    this.currentSprites = [];
    if (this.current) {
      const shape = this.current.shape;
      const color = this.current.color;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x] && this.currentY + y >= 0) {
            const block = this.createBlock(color);
            const sprite = this.screens[0].addSprite(block, {
              colorIds: [null, color],
              x: this.FIELD_X + (this.currentX + x) * this.BLOCK_SIZE,
              y: this.FIELD_Y + (this.currentY + y) * this.BLOCK_SIZE,
            });
            this.currentSprites.push(sprite);
          }
        }
      }
    }
  }

  static playLineClearSound() {
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [
        { noteNumber: 12, duration: 2 },
        { noteNumber: 16, duration: 2 },
        { noteNumber: 19, duration: 2 },
        { noteNumber: 24, duration: 4 },
      ],
    ]);
  }

  static playMoveSound() {
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [{ noteNumber: 24, duration: 1 }],
    ]);
  }

  static playDropSound() {
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [{ noteNumber: 7, duration: 2 }],
    ]);
  }

  static gameover() {
    this.isGameover = true;
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [
        { noteNumber: 12, duration: 8 },
        { noteNumber: 10, duration: 8 },
        { noteNumber: 7, duration: 8 },
        { noteNumber: 4, duration: 16 },
      ],
    ]);
    this.gameoverText = this.screens[0].addText("GAME", { x: 18, y: 40 });
    this.gameoverText2 = this.screens[0].addText("OVER", { x: 18, y: 50 });
  }

  static onFrame() {
    if (!this.isGameover) {
      const pad = this.pads[0].buttons;

      // 左右移動
      if (pad.left.justPressed) {
        if (!this.collides(this.currentX - 1, this.currentY, this.current.shape)) {
          this.currentX--;
          this.playMoveSound();
        }
      }
      if (pad.right.justPressed) {
        if (!this.collides(this.currentX + 1, this.currentY, this.current.shape)) {
          this.currentX++;
          this.playMoveSound();
        }
      }

      // 回転
      if (pad.b0.justPressed) {
        const rotated = this.rotate(this.current.shape);
        if (!this.collides(this.currentX, this.currentY, rotated)) {
          this.current.shape = rotated;
          this.playMoveSound();
        }
      }

      // 高速落下
      if (pad.down.pressed) {
        this.dropTimer += 5;
      }

      // 自然落下
      this.dropTimer++;
      if (this.dropTimer >= this.dropInterval) {
        this.dropTimer = 0;
        if (!this.collides(this.currentX, this.currentY + 1, this.current.shape)) {
          this.currentY++;
        } else {
          this.playDropSound();
          this.lockPiece();
        }
      }

      this.renderField();
    } else {
      if (this.pads[0].buttons.b1.justPressed) {
        this.gameoverText2?.remove();
        this.restart();
      }
    }
  }
}
