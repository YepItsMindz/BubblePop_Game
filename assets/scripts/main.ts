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

import { bubblesPrefab } from './prefab/bubblesPrefab';
import { PreviewBubble } from './previewBubble';
@ccclass('main')
export class main extends Component {
  @property(Prefab)
  bubbles: Prefab = null;

  @property(Prefab)
  predictBubbles: Prefab = null;

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

  @property(PreviewBubble)
  previewBubbleComponent: PreviewBubble = null;

  public rows: number = 50;
  public cols: number = 13;
  public bubblesArray: Node[] = [];
  public groupBubbles: Node[] = [];
  public path: Vec2[] = [];
  public screenSize = view.getVisibleSize();
  public lastCollider: Node = null;
  public velocity: number = 1500;
  public currentPredictedBubble: Node = null;

  protected onLoad(): void {
    this.createMaps();
    this.createLineNode();

    // Initialize preview bubble component
    if (this.previewBubbleComponent) {
      this.previewBubbleComponent.createPreviewBubble();
    } //PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Shape;

    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
  }

  protected onDestroy(): void {
    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
  }

  //Game Initialization
  createMaps() {
    for (let i = 0; i < this.rows; i++) {
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

    // Store the row and column indices properly in the component
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

  //Input Handling
  onMouseMove(event: EventMouse) {
    this.path.length = 0;
    this.createRayToMouse(event);
    this.predictedBubble(this.lastCollider);
  }

  onMouseDown(event: EventMouse) {
    // Create the shooting bubble with the same sprite as preview
    const bubble: Node = instantiate(this.bubbles);
    const nextIndex = this.previewBubbleComponent
      ? this.previewBubbleComponent.nextBubbleIndex
      : 4;
    const sf = this.spriteAtlas.getSpriteFrame(`ball_${nextIndex}`);
    bubble.name = bubble.uuid;
    bubble.getComponent(bubblesPrefab).setImage(sf);
    this.bubblesArray.push(bubble);
    this.node.addChild(bubble);
    bubble.setWorldPosition(this.startLinePos.getWorldPosition());
    console.log(
      bubble.getComponent(bubblesPrefab).rowIndex,
      bubble.getComponent(bubblesPrefab).colIndex
    );
    this.movingBubble(bubble, this.lastCollider);
  }

  //Preview System
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

  //Bubble Movement & Animation
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

    //Special Case
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
    this.animateBubble(bubble);

    // Check for matches after the bubble reaches its final position
    setTimeout(
      () => {
        // Set the bubble to its final position to ensure accurate adjacent bubble detection
        bubble.setWorldPosition(new Vec3(lastPath.x, lastPath.y, 1));
        const adjacentBubbles = this.getAdjacentBubbles(lastPath);
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
    ); // Add small buffer for animation completion

    // Generate next bubble for preview
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

  //Graphics
  createLineNode() {
    this.graphics.lineWidth = 3;
    this.graphics.strokeColor = Color.RED;
  }

  drawLine(startPos: Vec2, endPos: Vec2) {
    this.graphics.moveTo(startPos.x, startPos.y);
    this.graphics.lineTo(endPos.x, endPos.y);
  }

  //Position Calculation
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

  //Raycast & Physics
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

  //Bubble Matching & Destruction
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

    // Only destroy if we have at least 3 connected bubbles (including the shot bubble)
    if (bubblesToDestroy.length >= 3) {
      console.log(`Destroying ${bubblesToDestroy.length} connected bubbles`);
      bubblesToDestroy.forEach(bubbleToDestroy => {
        if (bubbleToDestroy.active) {
          bubbleToDestroy.active = false;
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

  // Falling Bubble
  checkForFallingBubbles() {
    // First check if the original top row (row 14) still has any active visible bubbles
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

    // If the top row has no visible bubbles, ALL remaining visible bubbles should fall
    if (!hasTopRowBubbles) {
      const allRemainingBubbles: Node[] = [];
      this.bubblesArray.forEach(bubble => {
        if (bubble.active) {
          const bubbleComponent = bubble.getComponent(bubblesPrefab);
          // Only include visible bubbles for falling
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
      return; // Early return since all bubbles are falling
    }

    // Original logic for when top row still exists
    const connectedToTop = new Set<Node>();
    const visited = new Set<Node>();

    // Find all bubbles connected to the top row (row 14)
    this.bubblesArray.forEach(bubble => {
      if (bubble.active && this.isTopRowBubble(bubble)) {
        this.findAllConnectedBubbles(bubble, visited, connectedToTop);
      }
    });

    // Find bubbles that are not connected to the top
    const fallingBubbles: Node[] = [];
    this.bubblesArray.forEach(bubble => {
      if (bubble.active && !connectedToTop.has(bubble)) {
        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        // Only include visible bubbles for falling
        if (!bubbleComponent || bubbleComponent.isVisibleBubble()) {
          fallingBubbles.push(bubble);
        }
      }
    });

    // Make the disconnected bubbles fall
    if (fallingBubbles.length > 0) {
      console.log(
        `Making ${fallingBubbles.length} bubbles fall (disconnected from top)`
      );
      this.animateFallingBubbles(fallingBubbles);
    }
  }

  isTopRowBubble(bubble: Node): boolean {
    if (!bubble.active) return false;

    // For bubbles created in the grid, use the stored row index from component
    const bubbleComponent = bubble.getComponent(bubblesPrefab);
    if (bubbleComponent && bubbleComponent.isGridBubble()) {
      return bubbleComponent.getRowIndex() === this.rows - 1; // Top row is row 14 (this.rows - 1)
    }

    // For shot bubbles that don't have grid position, compare with actual top row positions
    const bubbleY = bubble.getWorldPosition().y;

    // Find any bubble that we know is in the top row and use its Y position
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

    // Get adjacent bubbles and recursively check them
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
    fallingBubbles.forEach((bubble, index) => {
      // Add a small delay for each bubble to create a cascading effect
      const delay = index * 0.1;

      // Add some random horizontal movement for more realistic falling
      const randomOffsetX = (Math.random() - 0.5) * 100;
      const randomRotation = (Math.random() - 0.5) * 720; // Random rotation up to 2 full turns

      // Animate the bubble falling down with rotation and slight horizontal movement
      tween(bubble)
        .delay(delay)
        .parallel(
          tween().to(1.5, {
            worldPosition: new Vec3(
              bubble.getWorldPosition().x + randomOffsetX,
              bubble.getWorldPosition().y - this.screenSize.height - 200,
              bubble.getWorldPosition().z
            ),
          }),
          tween().to(1.5, {
            eulerAngles: new Vec3(0, 0, randomRotation),
          })
        )
        .call(() => {
          // Remove the bubble after it falls
          bubble.active = false;
          console.log('Bubble fell and was removed');
        })
        .start();
    });
  }

  //Adjacent Bubble Detection
  getAdjacentBubbles(centerPos: Vec2): Node[] {
    const adjacentBubbles: Node[] = [];

    // Check all active bubbles to see if they're adjacent
    this.bubblesArray.forEach(bubble => {
      if (bubble.active) {
        const bubblePos = new Vec2(
          bubble.getWorldPosition().x,
          bubble.getWorldPosition().y
        );
        const distance = this.distance(bubblePos, centerPos);

        // A bubble is adjacent if it's within approximately one bubble size distance
        if (distance > 0 && distance <= BUBBLES_SIZE * 1.2) {
          adjacentBubbles.push(bubble);
        }
      }
    });

    return adjacentBubbles;
  }

  update(deltaTime: number) {
    this.node.setPosition(
      new Vec3(
        this.node.getPosition().x,
        this.node.getPosition().y - deltaTime * 5,
        1
      )
    );
  }
}
