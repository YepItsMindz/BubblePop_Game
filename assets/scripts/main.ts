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
} from 'cc';
const { ccclass, property } = _decorator;

export const BUBBLES_SIZE = 68;

import { bubblesPrefab } from './prefab/bubblesPrefab';
@ccclass('main')
export class main extends Component {
  @property(Prefab)
  bubbles: Prefab = null;

  @property(SpriteAtlas)
  spriteAtlas: SpriteAtlas = null;

  @property(Graphics)
  graphics: Graphics = null;

  @property(Node)
  startLinePos: Node = null;

  @property(Node)
  leftWall: Node = null;

  @property(Node)
  rightWall: Node = null;

  public rows: number = 15;
  public cols: number = 13;
  public bubblesArray: Node[] = [];
  public groupBubbles: Node[] = [];
  public path: Vec2[] = [];
  public screenSize = view.getVisibleSize();
  public lastCollider: Node = null;
  public velocity: number = 1500;
  public previewBubble: Node = null;
  public nextBubbleIndex: number = 0;

  protected onLoad(): void {
    this.createMaps();
    this.createLineNode();
    this.createPreviewBubble();

    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
  }

  createMaps() {
    for (let i = 0; i < this.rows; i++) {
      if (i % 2 == 0) {
        for (let j = 0; j < this.cols; j++) {
          this.createBubbles(i, j);
        }
      } else {
        for (let j = 0; j < this.cols - 1; j++) {
          this.createBubbles(i, j);
        }
      }
    }
  }

  createBubbles(i: number, j: number) {
    const node: Node = instantiate(this.bubbles);
    node.name = node.uuid;
    const randomBallIndex = Math.floor(Math.random() * 3) + 4;
    const sf = this.spriteAtlas.getSpriteFrame(`ball_${randomBallIndex}`);
    node.getComponent(bubblesPrefab).setImage(sf);
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
          (j - (this.cols - 1) / 2) * BUBBLES_SIZE + BUBBLES_SIZE / 2,
          i * BUBBLES_SIZE * 0.85,
          1
        )
      );
    }
  }

  update(deltaTime: number) {
    // this.node.setPosition(
    //   new Vec3(
    //     this.node.getPosition().x,
    //     this.node.getPosition().y - deltaTime * 20,
    //     1
    //   )
    // );
  }

  onMouseMove(event: EventMouse) {
    this.path.length = 0;
    this.createRayToMouse(event);
  }

  createPreviewBubble() {
    this.previewBubble = instantiate(this.bubbles);
    this.generateNextBubble();
    this.node.addChild(this.previewBubble);
    this.previewBubble.setWorldPosition(this.startLinePos.getWorldPosition());
  }

  generateNextBubble() {
    this.nextBubbleIndex = Math.floor(Math.random() * 3) + 4;
    const sf = this.spriteAtlas.getSpriteFrame(`ball_${this.nextBubbleIndex}`);
    this.previewBubble.getComponent(bubblesPrefab).setImage(sf);
  }

  onMouseDown(event: EventMouse) {
    // Create the shooting bubble with the same sprite as preview
    const bubble: Node = instantiate(this.bubbles);
    const sf = this.spriteAtlas.getSpriteFrame(`ball_${this.nextBubbleIndex}`);
    bubble.name = bubble.uuid;
    bubble.getComponent(bubblesPrefab).setImage(sf);
    this.bubblesArray.push(bubble);
    this.node.addChild(bubble);
    bubble.setWorldPosition(this.startLinePos.getWorldPosition());
    // this.createRayToMouse(event);
    this.movingBubble(bubble, this.lastCollider);

    // Check if the shot bubble matches any of the 6 adjacent bubbles around the target
  }

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
    this.path[this.path.length - 1] = lastPath;

    this.animateBubble(bubble);

    const adjacentBubbles = this.getAdjacentBubbles(lastPath);
    console.log(adjacentBubbles);
    let hasMatch = false;

    adjacentBubbles.forEach(adjacentBubble => {
      if (this.getSpriteFrame(bubble) == this.getSpriteFrame(adjacentBubble)) {
        console.log(adjacentBubble.name);
        hasMatch = true;
      }
    });

    if (hasMatch) {
      console.log('Match found - destroying bubbles');
      setTimeout(() => {
        this.destroyBubble(bubble);
      }, this.calculateAnimationTime() * 1000);
    } else {
      console.log('No match');
    }

    // Generate next bubble for preview
    this.generateNextBubble();
  }

  animateBubble(bubble: Node) {
    if (this.path.length === 0) {
      return;
    }

    //Anim
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

  createLineNode() {
    this.graphics.lineWidth = 3;
    this.graphics.strokeColor = Color.RED;
  }

  drawLine(startPos: Vec2, endPos: Vec2) {
    this.graphics.moveTo(startPos.x, startPos.y);
    this.graphics.lineTo(endPos.x, endPos.y);
  }

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

    const collider = results[0].collider;
    const point = results[0].point;
    // const normal = results[0].normal;
    // const fraction = results[0].fraction;

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

    const collider = results[0].collider;
    const point = results[0].point;
    // const normal = results[0].normal;
    // const fraction = results[0].fraction;

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

  destroyBubble(bubble: Node) {
    const matchingBubbles: Node[] = [];
    const bubbleDistance = BUBBLES_SIZE * 1.5; // Threshold for adjacent bubbles

    // Find all matching adjacent bubbles
    this.bubblesArray.forEach(i => {
      if (i.active && this.getSpriteFrame(i) == this.getSpriteFrame(bubble)) {
        const dist = this.distance(
          new Vec2(i.getWorldPosition().x, i.getWorldPosition().y),
          new Vec2(bubble.getWorldPosition().x, bubble.getWorldPosition().y)
        );
        if (dist > 0 && dist <= bubbleDistance) {
          matchingBubbles.push(i);
        }
      }
    });
    if (bubble.active) bubble.active = false;

    matchingBubbles.forEach(matchingBubble => {
      if (matchingBubble.active) {
        this.destroyBubble(matchingBubble);
      }
    });

    this.isFalling();
  }

  isFalling() {
    this.bubblesArray.forEach(bubbles => {
      this.groupBubbles.length = 0;
      if (bubbles.active) {
        this.findGroupBubbles(bubbles);
      }
    });
  }

  findGroupBubbles(bubbles: Node) {
    const isAlreadyInGroup = this.groupBubbles.indexOf(bubbles) !== -1;

    if (!isAlreadyInGroup) {
      this.groupBubbles.push(bubbles);
      const bubblesPos = new Vec2(
        bubbles.getWorldPosition().x,
        bubbles.getWorldPosition().y
      );
      const adjacent = this.getAdjacentBubbles(bubblesPos);
      for (let adj of adjacent) {
        if (adj.active) this.findGroupBubbles(adj);
      }
    }
  }

  isTopBubbles(bubble: Node) {}

  getSpriteFrame(node: Node) {
    return node.getComponent(bubblesPrefab).bubbles.spriteFrame;
  }

  getAdjacentBubbles(centerPos: Vec2): Node[] {
    const adjacentBubbles: Node[] = [];
    const adjacentPositions = [
      new Vec2(
        centerPos.x + BUBBLES_SIZE / 2,
        centerPos.y - BUBBLES_SIZE * 0.85
      ),
      new Vec2(centerPos.x + BUBBLES_SIZE, centerPos.y),
      new Vec2(
        centerPos.x + BUBBLES_SIZE / 2,
        centerPos.y + BUBBLES_SIZE * 0.85
      ),
      new Vec2(
        centerPos.x - BUBBLES_SIZE / 2,
        centerPos.y - BUBBLES_SIZE * 0.85
      ),
      new Vec2(centerPos.x - BUBBLES_SIZE, centerPos.y),
      new Vec2(
        centerPos.x - BUBBLES_SIZE / 2,
        centerPos.y + BUBBLES_SIZE * 0.85
      ),
    ];

    adjacentPositions.forEach(pos => {
      this.bubblesArray.forEach(bubble => {
        if (bubble.active == true) {
          const bubblePos = new Vec2(
            bubble.getWorldPosition().x,
            bubble.getWorldPosition().y
          );
          const distance = this.distance(bubblePos, pos);
          if (distance < BUBBLES_SIZE * 0.3) {
            adjacentBubbles.push(bubble);
          }
        }
      });
    });

    return adjacentBubbles;
  }

  protected onDestroy(): void {
    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
  }
}
