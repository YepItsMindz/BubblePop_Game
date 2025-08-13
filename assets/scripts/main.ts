import {
  _decorator,
  Component,
  instantiate,
  JsonAsset,
  Node,
  Prefab,
  resources,
  Sprite,
  SpriteAtlas,
  tween,
  Vec3,
  Vec2,
  view,
  input,
  Input,
  EventMouse,
  Camera,
  geometry,
  Graphics,
  Color,
  math,
  PhysicsSystem,
  PhysicsSystem2D,
  ERaycast2DType,
  Tween,
  EPhysics2DDrawFlags,
} from 'cc';
const { ccclass, property } = _decorator;

export const BUBBLES_SIZE = 68;
export const MAP_FALL_SPEED = 20; // Units per second

import { bubblesPrefab } from './prefab/bubblesPrefab';
import { PreviewBubble } from './previewBubble';
import { destroyBubble } from './prefab/destroyBubble';
@ccclass('main')
export class main extends Component {
  @property(Prefab)
  bubbles: Prefab = null;

  @property(Prefab)
  predictBubbles: Prefab = null;

  @property(SpriteAtlas)
  spriteAtlas: SpriteAtlas = null;

  @property(Node)
  destroyLayer: Node = null;

  @property(Graphics)
  graphics: Graphics = null;

  @property(Node)
  startLinePos: Node = null;

  @property(Node)
  leftWall: Node = null;

  @property(Node)
  rightWall: Node = null;

  @property(PreviewBubble)
  previewBubbleComponent: PreviewBubble = null;

  @property(Node)
  endLine: Node = null;

  @property(Node)
  minLine: Node = null;

  public rows: number = 100;
  public cols: number = 13;
  public bubblesArray: Node[] = [];
  public groupBubbles: Node[] = [];
  public path: Vec2[] = [];
  public screenSize = view.getVisibleSize();
  public lastCollider: Node = null;
  public velocity: number = 1500;
  public currentPredictedBubble: Node = null;

  // Game state variables
  public gameActive: boolean = true;
  public isMovingToMinLine: boolean = false;
  public shotBubbles: Set<Node> = new Set();
  public fallingBubbles: Set<Node> = new Set();
  public rowCounter: number = 0;
  public clickCooldown: boolean = false;

  protected onLoad(): void {
    this.createMaps();
    this.createLineNode();

    if (this.previewBubbleComponent) {
      this.previewBubbleComponent.createPreviewBubble();
    }

    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
  }

  protected onDestroy(): void {
    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);

    Tween.stopAll();
    this.shotBubbles.clear();
    this.fallingBubbles.clear();
  }

  // Game Initialization
  createMaps() {
    for (let i = 10; i < this.rows + 10; i++) {
      if (i % 2 == 0) {
        for (let j = 0; j < this.cols; j++) {
          this.createBubbles(i, j);
        }
      } else {
        for (let j = 1; j < this.cols; j++) {
          this.createBubbles(i, j);
        }
      }
    }
  }

  addNewRowsEfficient(numRows: number) {
    console.log(`Adding ${numRows} new rows to the map efficiently`);

    const newBubbles: Node[] = [];
    const startRow = this.rows + 10;

    for (let i = startRow; i < startRow + numRows; i++) {
      if (i % 2 == 0) {
        for (let j = 0; j < this.cols; j++) {
          const node: Node = instantiate(this.bubbles);
          node.name = node.uuid;
          const randomBallIndex = Math.floor(Math.random() * 3) + 4;
          const sf = this.spriteAtlas.getSpriteFrame(`ball_${randomBallIndex}`);

          const bubbleComponent = node.getComponent(bubblesPrefab);
          bubbleComponent.setImage(sf);
          bubbleComponent.setGridPosition(i, j);

          this.setOriginPos(node, i, j);
          newBubbles.push(node);
        }
      } else {
        for (let j = 1; j < this.cols; j++) {
          const node: Node = instantiate(this.bubbles);
          node.name = node.uuid;
          const randomBallIndex = Math.floor(Math.random() * 3) + 4;
          const sf = this.spriteAtlas.getSpriteFrame(`ball_${randomBallIndex}`);

          const bubbleComponent = node.getComponent(bubblesPrefab);
          bubbleComponent.setImage(sf);
          bubbleComponent.setGridPosition(i, j);

          this.setOriginPos(node, i, j);
          if (j === 0 || j === this.cols)
            bubbleComponent.bubbles.node.active = false;
          newBubbles.push(node);
        }
      }
    }

    newBubbles.forEach(bubble => {
      this.node.addChild(bubble);
      this.bubblesArray.push(bubble);
    });

    this.rows += numRows;
  }

  createBubbles(i: number, j: number) {
    const node: Node = instantiate(this.bubbles);
    node.name = node.uuid;
    let sf = null;
    const randomBallIndex = Math.floor(Math.random() * 3) + 4;
    if (i % 2 === 0 && j === 0 && i % 2 === 0 && j === this.cols) {
      sf = this.spriteAtlas.getSpriteFrame(`ball_0`);
    } else {
      sf = this.spriteAtlas.getSpriteFrame(`ball_${randomBallIndex}`);
    }

    const bubbleComponent = node.getComponent(bubblesPrefab);
    bubbleComponent.setImage(sf);
    bubbleComponent.setGridPosition(i, j);

    this.setOriginPos(node, i, j);
    this.node.addChild(node);
    this.bubblesArray.push(node);
  }

  setOriginPos(node: Node, i: number, j: number) {
    if (i % 2 == 0) {
      node.setWorldPosition(
        new Vec3(
          (j - (this.cols - 1) / 2) * BUBBLES_SIZE,
          i * BUBBLES_SIZE * 0.85,
          1
        )
      );
    } else {
      node.setWorldPosition(
        new Vec3(
          (j - (this.cols - 1) / 2) * BUBBLES_SIZE - BUBBLES_SIZE / 2,
          i * BUBBLES_SIZE * 0.85,
          1
        )
      );
      if (j === 0 || j === this.cols)
        node.getComponent(bubblesPrefab).bubbles.node.active = false;
    }
  }

  // Input Handling
  onMouseMove(event: EventMouse) {
    this.path.length = 0;
    this.createRayToMouse(event);
    this.predictedBubble(this.lastCollider);
  }

  onMouseDown(event: EventMouse) {
    if (!this.gameActive || this.clickCooldown) return;

    // Update raycast and prediction before shooting
    this.path.length = 0;
    this.createRayToMouse(event);
    this.predictedBubble(this.lastCollider);

    this.clickCooldown = true;
    setTimeout(() => {
      this.clickCooldown = false;
    }, 500);

    const bubble: Node = instantiate(this.bubbles);
    const nextIndex = this.previewBubbleComponent
      ? this.previewBubbleComponent.nextBubbleIndex
      : 4;
    const sf = this.spriteAtlas.getSpriteFrame(`ball_${nextIndex}`);
    bubble.name = bubble.uuid;
    bubble.getComponent(bubblesPrefab).setImage(sf);

    this.shotBubbles.add(bubble);

    this.bubblesArray.push(bubble);
    this.node.addChild(bubble);
    bubble.setWorldPosition(this.startLinePos.getWorldPosition());
    this.movingBubble(bubble, this.lastCollider);
  }

  // Preview System
  predictedBubble(collider: Node) {
    if (this.currentPredictedBubble && this.currentPredictedBubble.isValid) {
      this.currentPredictedBubble.removeFromParent();
      this.currentPredictedBubble = null;
    }

    let lastPath = this.path[this.path.length - 1];
    this.bubblesArray.forEach(i => {
      if (collider === i) {
        const pos2 = this.newPosition(
          new Vec2(i.getWorldPosition().x, i.getWorldPosition().y),
          lastPath
        );
        lastPath = new Vec2(pos2.x, pos2.y);
      }
    });

    const node: Node = instantiate(this.predictBubbles);
    this.node.addChild(node);
    node.setWorldPosition(new Vec3(lastPath.x, lastPath.y, 1));

    this.currentPredictedBubble = node;
  }

  // Bubble Movement & Animation
  movingBubble(bubble: Node, collider: Node) {
    let lastPath = this.path[this.path.length - 1];
    this.bubblesArray.forEach(i => {
      if (collider === i) {
        const pos2 = this.newPosition(
          new Vec2(i.getWorldPosition().x, i.getWorldPosition().y),
          lastPath
        );
        lastPath = new Vec2(pos2.x, pos2.y);
      }
    });

    // Special Case
    if (lastPath.x < 0) lastPath.x += BUBBLES_SIZE;
    if (lastPath.x > view.getVisibleSize().x) lastPath.x -= BUBBLES_SIZE;

    const isOccupied = this.bubblesArray.some(bubble => {
      if (!bubble.active) return false;
      const bubblePos = new Vec2(
        bubble.getWorldPosition().x,
        bubble.getWorldPosition().y
      );
      return Vec2.distance(bubblePos, lastPath) < BUBBLES_SIZE * 0.5;
    });

    if (isOccupied) {
      if (lastPath.x - BUBBLES_SIZE < 0) {
        lastPath.x -= BUBBLES_SIZE / 2;
        lastPath.y -= BUBBLES_SIZE * 0.85;
      }
      if (lastPath.x + BUBBLES_SIZE > view.getVisibleSize().x) {
        lastPath.x += BUBBLES_SIZE / 2;
        lastPath.y -= BUBBLES_SIZE * 0.85;
      }
    }

    this.path[this.path.length - 1] = lastPath;

    const animationTime = this.calculateAnimationTime();
    const mapMovementDuringFlight = this.isMovingToMinLine
      ? 0
      : animationTime * MAP_FALL_SPEED;

    const compensatedPath = new Vec2(
      lastPath.x,
      lastPath.y - mapMovementDuringFlight
    );

    this.path[this.path.length - 1] = compensatedPath;

    this.animateBubble(bubble);

    // Check for matches after the bubble reaches its final position
    setTimeout(
      () => {
        // Set the bubble to its final position to ensure accurate adjacent bubble detection
        bubble.setWorldPosition(
          new Vec3(compensatedPath.x, compensatedPath.y, 1)
        );

        // Remove from shot bubbles set since it has now settled
        this.shotBubbles.delete(bubble);

        // Increment row counter and add rows when counter > 50
        this.rowCounter++;
        if (this.rowCounter > 50) {
          this.addNewRowsEfficient(50);
          this.rowCounter = 0;
        }

        const adjacentBubbles = this.getAdjacentBubbles(compensatedPath);
        console.log('Adjacent bubbles found:', adjacentBubbles.length);
        let hasMatch = false;

        adjacentBubbles.forEach(adjacentBubble => {
          if (
            this.getSpriteFrame(bubble) === this.getSpriteFrame(adjacentBubble)
          ) {
            console.log('Match found with bubble:', adjacentBubble.name);
            hasMatch = true;
          }
        });

        if (hasMatch) {
          console.log('Match found - destroying bubbles');
          this.destroyBubble(bubble);
        } else {
          console.log('No match - bubble stays in place');
        }
      },
      this.calculateAnimationTime() * 1000 + 50
    );

    if (this.previewBubbleComponent) {
      this.previewBubbleComponent.generateNextBubble();
    }
  }

  animateBubble(bubble: Node) {
    if (this.path.length === 0) {
      return;
    }
    let actions = new Tween();
    for (let i = 1; i < this.path.length; i++) {
      actions.to(
        this.distance(this.path[i - 1], this.path[i]) / this.velocity,
        {
          worldPosition: new Vec3(this.path[i].x, this.path[i].y),
        }
      );
    }
    actions.clone(bubble).start();
  }

  calculateAnimationTime(): number {
    if (this.path.length === 0) {
      return 0;
    }

    let totalTime = 0;
    for (let i = 1; i < this.path.length; i++) {
      totalTime +=
        this.distance(this.path[i - 1], this.path[i]) / this.velocity;
    }
    return totalTime;
  }

  // Graphics
  createLineNode() {
    this.graphics.lineWidth = 3;
    this.graphics.strokeColor = Color.RED;
  }

  drawLine(startPos: Vec2, endPos: Vec2) {
    this.graphics.moveTo(startPos.x, startPos.y);
    this.graphics.lineTo(endPos.x, endPos.y);
  }

  // Position Calculation
  distance(nodePos: Vec2, point: Vec2): number {
    return Vec2.distance(nodePos, point);
  }

  newPosition(nodePos: Vec2, point: Vec2): Vec2 {
    const positions = [
      new Vec2(nodePos.x + BUBBLES_SIZE / 2, nodePos.y - BUBBLES_SIZE * 0.85),
      new Vec2(nodePos.x + BUBBLES_SIZE, nodePos.y),
      new Vec2(nodePos.x + BUBBLES_SIZE / 2, nodePos.y + BUBBLES_SIZE * 0.85),
      new Vec2(nodePos.x - BUBBLES_SIZE / 2, nodePos.y - BUBBLES_SIZE * 0.85),
      new Vec2(nodePos.x - BUBBLES_SIZE, nodePos.y),
      new Vec2(nodePos.x - BUBBLES_SIZE / 2, nodePos.y + BUBBLES_SIZE * 0.85),
    ];
    let minDistance = Infinity;
    let closestPosition = positions[0];

    for (const pos of positions) {
      const isOccupied = this.bubblesArray.some(x => {
        const bubblePos = new Vec2(
          x.getWorldPosition().x,
          x.getWorldPosition().y
        );
        if (x.active == true) return Vec2.equals(bubblePos, pos);
      });

      if (isOccupied) continue;

      const distance = this.distance(pos, point);
      if (distance < minDistance) {
        minDistance = distance;
        closestPosition = pos;
      }
    }
    return closestPosition;
  }

  // Raycast & Physics
  createRayToMouse(event: EventMouse) {
    this.graphics.clear();

    const mousePos = new Vec2(
      event.getUILocation().x,
      Math.max(event.getUILocation().y, 250)
    );
    const ray = this.startLinePos.getWorldPosition();
    const rayOrigin = new Vec2(ray.x, ray.y);
    this.path.push(rayOrigin);

    const direction = new Vec2();
    Vec2.subtract(direction, mousePos, rayOrigin);
    direction.normalize();

    const angle = Math.atan2(direction.y, direction.x);
    const lineLength = 2000;
    const endPoint = new Vec2(
      rayOrigin.x + Math.cos(angle) * lineLength,
      rayOrigin.y + Math.sin(angle) * lineLength
    );

    const results = PhysicsSystem2D.instance.raycast(
      rayOrigin,
      endPoint,
      ERaycast2DType.Closest
    );

    if (results.length === 0) {
      return;
    }

    const collider = results[0].collider;
    const point = results[0].point;

    this.bubblesArray.forEach(x => {
      if (x === collider.node) {
        x.getComponent(bubblesPrefab).glow.active = true;
      } else {
        x.getComponent(bubblesPrefab).glow.active = false;
      }
    });

    if (collider.node === this.leftWall || collider.node === this.rightWall) {
      this.path.push(point);
      this.drawLine(rayOrigin, endPoint);
      this.reflectRay(rayOrigin, point);
    } else {
      this.drawLine(rayOrigin, point);
      this.path.push(point);
      this.lastCollider = collider.node;
    }

    this.graphics.stroke();
  }

  reflectRay(start: Vec2, end: Vec2) {
    const direction = new Vec2();
    Vec2.subtract(direction, end, start);
    direction.normalize();

    const lineLength = 2000;
    const angle = Math.atan2(direction.y, direction.x);
    const endPoint = new Vec2(
      end.x - Math.cos(angle) * lineLength,
      end.y + Math.sin(angle) * lineLength
    );

    const results = PhysicsSystem2D.instance.raycast(
      end,
      endPoint,
      ERaycast2DType.Closest
    );

    if (results.length === 0) {
      return;
    }

    const collider = results[0].collider;
    const point = results[0].point;

    this.bubblesArray.forEach(x => {
      if (x === collider.node) {
        x.getComponent(bubblesPrefab).glow.active = true;
      } else {
        x.getComponent(bubblesPrefab).glow.active = false;
      }
    });

    if (collider.node === this.leftWall || collider.node === this.rightWall) {
      this.drawLine(end, endPoint);
      this.path.push(point);
      this.reflectRay(end, point);
    } else {
      this.drawLine(end, point);
      this.path.push(point);
      this.lastCollider = collider.node;
    }
  }

  // Bubble Matching & Destruction
  destroyBubble(bubble: Node) {
    if (!bubble.active) return;

    const visitedBubbles = new Set<Node>();
    const bubblesToDestroy: Node[] = [];
    const spriteFrame = this.getSpriteFrame(bubble);

    this.findConnectedBubbles(
      bubble,
      spriteFrame,
      visitedBubbles,
      bubblesToDestroy
    );

    const firstBubble = bubblesToDestroy[0];

    if (bubblesToDestroy.length >= 3) {
      console.log(`Destroying ${bubblesToDestroy.length} connected bubbles`);
      bubblesToDestroy.forEach(bubbleToDestroy => {
        if (bubbleToDestroy.active) {
          const bubbleComponent = bubbleToDestroy.getComponent(bubblesPrefab);
          if (bubbleComponent) {
            bubbleComponent.disableCollider();
          }

          const deltaX =
            bubbleToDestroy.getWorldPosition().x -
            firstBubble.getWorldPosition().x;
          const deltaY =
            bubbleToDestroy.getWorldPosition().y -
            firstBubble.getWorldPosition().y;

          const velocityX =
            deltaX !== 0 ? Math.min(Math.max(500 / deltaX, -500), 500) : 0;
          const velocityY = Math.min(
            Math.max(300 / (Math.abs(deltaY) * 0.1 + 10), -300),
            300
          );
          console.log(velocityX, velocityY);

          this.destroyLayer
            .getComponent(destroyBubble)
            .destroyEffect(bubbleToDestroy, velocityX, velocityY, spriteFrame);

          bubbleToDestroy.active = false;
          this.shotBubbles.delete(bubbleToDestroy);
          this.fallingBubbles.delete(bubbleToDestroy);
        }
      });

      this.checkForFallingBubbles();
    } else {
      console.log(
        `Only ${bubblesToDestroy.length} connected bubbles found, not enough to destroy`
      );
    }
  }

  findConnectedBubbles(
    bubble: Node,
    targetSpriteFrame: any,
    visited: Set<Node>,
    result: Node[]
  ) {
    if (!bubble.active || visited.has(bubble)) {
      return;
    }

    if (this.getSpriteFrame(bubble) !== targetSpriteFrame) {
      return;
    }

    visited.add(bubble);
    result.push(bubble);

    const bubblePos = new Vec2(
      bubble.getWorldPosition().x,
      bubble.getWorldPosition().y
    );
    const adjacentBubbles = this.getAdjacentBubbles(bubblePos);

    adjacentBubbles.forEach(adjacentBubble => {
      this.findConnectedBubbles(
        adjacentBubble,
        targetSpriteFrame,
        visited,
        result
      );
    });
  }

  getSpriteFrame(node: Node) {
    return node.getComponent(bubblesPrefab).bubbles.spriteFrame;
  }

  // Falling Bubbles
  checkForFallingBubbles() {
    let hasTopRowBubbles = false;
    this.bubblesArray.forEach(bubble => {
      if (bubble.active) {
        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        if (
          bubbleComponent &&
          bubbleComponent.getRowIndex() === this.rows - 1 &&
          bubbleComponent.isVisibleBubble()
        ) {
          hasTopRowBubbles = true;
        }
      }
    });

    if (!hasTopRowBubbles) {
      const allRemainingBubbles: Node[] = [];
      this.bubblesArray.forEach(bubble => {
        if (bubble.active) {
          const bubbleComponent = bubble.getComponent(bubblesPrefab);
          if (!bubbleComponent || bubbleComponent.isVisibleBubble()) {
            allRemainingBubbles.push(bubble);
          }
        }
      });

      if (allRemainingBubbles.length > 0) {
        console.log(
          `Top row is empty! Making all ${allRemainingBubbles.length} remaining bubbles fall`
        );
        this.animateFallingBubbles(allRemainingBubbles);
      }
      return;
    }

    const connectedToTop = new Set<Node>();
    const visited = new Set<Node>();

    this.bubblesArray.forEach(bubble => {
      if (bubble.active && this.isTopRowBubble(bubble)) {
        this.findAllConnectedBubbles(bubble, visited, connectedToTop);
      }
    });

    const fallingBubbles: Node[] = [];
    this.bubblesArray.forEach(bubble => {
      if (bubble.active && !connectedToTop.has(bubble)) {
        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        if (!bubbleComponent || bubbleComponent.isVisibleBubble()) {
          fallingBubbles.push(bubble);
        }
      }
    });

    if (fallingBubbles.length > 0) {
      console.log(
        `Making ${fallingBubbles.length} bubbles fall (disconnected from top)`
      );
      this.animateFallingBubbles(fallingBubbles);
    }
  }

  isTopRowBubble(bubble: Node): boolean {
    if (!bubble.active) return false;

    const bubbleComponent = bubble.getComponent(bubblesPrefab);
    if (bubbleComponent && bubbleComponent.isGridBubble()) {
      return bubbleComponent.getRowIndex() === this.rows - 1;
    }

    const bubbleY = bubble.getWorldPosition().y;

    for (const b of this.bubblesArray) {
      if (b.active) {
        const bComponent = b.getComponent(bubblesPrefab);
        if (bComponent && bComponent.getRowIndex() === this.rows - 1) {
          const topRowY = b.getWorldPosition().y;
          return Math.abs(bubbleY - topRowY) < BUBBLES_SIZE * 0.5;
        }
      }
    }

    return false;
  }

  findAllConnectedBubbles(bubble: Node, visited: Set<Node>, result: Set<Node>) {
    if (!bubble.active || visited.has(bubble)) {
      return;
    }

    visited.add(bubble);
    result.add(bubble);

    const bubblePos = new Vec2(
      bubble.getWorldPosition().x,
      bubble.getWorldPosition().y
    );
    const adjacentBubbles = this.getAdjacentBubbles(bubblePos);

    adjacentBubbles.forEach(adjacentBubble => {
      this.findAllConnectedBubbles(adjacentBubble, visited, result);
    });
  }

  animateFallingBubbles(fallingBubbles: Node[]) {
    if (fallingBubbles.length === 0) return;

    const firstBubble = fallingBubbles[0];

    fallingBubbles.forEach((bubble, index) => {
      this.fallingBubbles.add(bubble);

      const bubbleComponent = bubble.getComponent(bubblesPrefab);
      if (bubbleComponent) {
        bubbleComponent.disableCollider();
      }

      const deltaX =
        bubble.getWorldPosition().x - firstBubble.getWorldPosition().x;
      const deltaY =
        bubble.getWorldPosition().y - firstBubble.getWorldPosition().y;

      const velocityX =
        deltaX !== 0 ? Math.min(Math.max(500 / deltaX, -500), 500) : 0;
      const velocityY = Math.min(
        Math.max(300 / (Math.abs(deltaY) * 0.1 + 10), -300),
        300
      );

      const spriteFrame = this.getSpriteFrame(bubble);

      this.destroyLayer
        .getComponent(destroyBubble)
        .destroyEffect(bubble, velocityX, velocityY, spriteFrame);

      bubble.active = false;
      this.shotBubbles.delete(bubble);
      this.fallingBubbles.delete(bubble);
    });
  }

  // Adjacent Bubble Detection
  getAdjacentBubbles(centerPos: Vec2): Node[] {
    const adjacentBubbles: Node[] = [];

    this.bubblesArray.forEach(bubble => {
      if (bubble.active) {
        const bubblePos = new Vec2(
          bubble.getWorldPosition().x,
          bubble.getWorldPosition().y
        );
        const distance = this.distance(bubblePos, centerPos);

        if (distance > 0 && distance <= BUBBLES_SIZE * 1.2) {
          adjacentBubbles.push(bubble);
        }
      }
    });

    return adjacentBubbles;
  }

  getMinBubblePosition(): number {
    let minY = Infinity;

    this.bubblesArray.forEach(bubble => {
      if (
        bubble.active &&
        !this.shotBubbles.has(bubble) &&
        !this.fallingBubbles.has(bubble)
      ) {
        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        if (bubbleComponent && bubbleComponent.isGridBubble()) {
          const bubbleY = bubble.getWorldPosition().y;
          if (bubbleY < minY) {
            minY = bubbleY;
          }
        }
      }
    });

    return minY === Infinity ? 0 : minY;
  }

  moveMapToMinLine() {
    if (this.isMovingToMinLine || !this.gameActive) return;

    const minBubbleY = this.getMinBubblePosition();
    const minLineY = this.minLine.getWorldPosition().y;
    const currentMapY = this.node.getPosition().y;

    const targetMapY = currentMapY + (minLineY - minBubbleY);

    this.isMovingToMinLine = true;

    tween(this.node)
      .to(1.0, {
        position: new Vec3(
          this.node.getPosition().x,
          targetMapY,
          this.node.getPosition().z
        ),
      })
      .call(() => {
        this.isMovingToMinLine = false;
      })
      .start();
  }

  checkGameEnd() {
    if (!this.gameActive) return;

    const minBubbleY = this.getMinBubblePosition();
    const endLineY = this.endLine.getWorldPosition().y;

    if (minBubbleY < endLineY) {
      this.endGame();
    }
  }

  endGame() {
    this.gameActive = false;
    console.log('Game Over! Bubbles reached the end line.');

    Tween.stopAll();

    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
  }

  restartGame() {
    this.gameActive = true;
    this.isMovingToMinLine = false;
    this.shotBubbles.clear();
    this.fallingBubbles.clear();
    this.rowCounter = 0;
    this.clickCooldown = false;

    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);

    console.log('Game restarted!');
  }

  update(deltaTime: number) {
    if (!this.gameActive) return;

    if (!this.isMovingToMinLine) {
      this.node.setPosition(
        new Vec3(
          this.node.getPosition().x,
          this.node.getPosition().y - deltaTime * MAP_FALL_SPEED,
          1
        )
      );

      const minBubbleY = this.getMinBubblePosition();
      const minLineY = this.minLine.getWorldPosition().y;

      if (minBubbleY > minLineY) {
        this.moveMapToMinLine();
      }

      this.checkGameEnd();
    }
  }
}
