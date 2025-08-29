import {
  EventMouse,
  instantiate,
  PhysicsSystem2D,
  ERaycast2DType,
  Vec2,
  Node,
  Vec3,
  Sprite,
} from 'cc';
import { bubblesPrefab } from './prefab/bubblesPrefab';
import { GameManager, MAP_FALL_SPEED, BUBBLES_SIZE } from './GameManager';
export class InputHandler {
  private gameManager: GameManager;
  private lastPredicted: { row: number; col: number } | null = null;

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public onMouseMove(event: EventMouse): void {
    this.gameManager.currentMousePosition = new Vec2(
      event.getUILocation().x,
      Math.max(event.getUILocation().y, 330)
    );

    if (!this.gameManager.raycastActive) {
      this.gameManager.raycastActive = true;
    }

    this.gameManager.path.length = 0;
    this.createRayToMouse(event);
    this.predictedBubble(this.gameManager.lastCollider);
  }

  public onMouseDown(event: EventMouse): void {
    if (!this.gameManager.gameActive || this.gameManager.clickCooldown) return;

    this.gameManager.currentMousePosition = new Vec2(
      event.getUILocation().x,
      Math.max(event.getUILocation().y, 330)
    );

    this.gameManager.path.length = 0;
    this.createRayToMouse(event);
    this.predictedBubble(this.gameManager.lastCollider);

    this.gameManager.clickCooldown = true;
    setTimeout(() => {
      this.gameManager.clickCooldown = false;
    }, 500);

    const bubble: Node = this.gameManager.getBubbleFromPool();
    const currentIndex = this.gameManager.previewBubbleComponent
      ? this.gameManager.previewBubbleComponent.currentBubbleIndex
      : 4;
    const sf = this.gameManager.spriteAtlas.getSpriteFrame(
      `ball_${currentIndex}`
    );
    const bubbleComponent = bubble.getComponent(bubblesPrefab);
    bubbleComponent.setImage(sf);
    bubbleComponent.disableCollider();
    bubbleComponent.bubbleIndex = currentIndex;

    this.gameManager.shotBubbles.add(bubble);
    this.gameManager.bubblesArray.push(bubble);
    this.gameManager.node.addChild(bubble);

    bubble.setWorldPosition(this.gameManager.startLinePos.getWorldPosition());

    this.gameManager
      .getBubbleAnimator()
      .movingBubble(bubble, this.gameManager.lastCollider);

    this.gameManager.raycastActive = false;
    this.gameManager.getGraphicsRenderer().clearGraphics();
  }

  public predictedBubble(collider: Node): void {
    let lastPath = this.gameManager.path[this.gameManager.path.length - 1];
    const gridPos = this.gameManager
      .getBubbleAnimator()
      .newGridPosition(collider, lastPath);

    // only update if changed
    if (
      !this.lastPredicted ||
      this.lastPredicted.row !== gridPos.row ||
      this.lastPredicted.col !== gridPos.col
    ) {
      this.lastPredicted = gridPos;
      let { posX, posY } = this.gameManager.gridIndexToPosition(
        gridPos.row,
        gridPos.col
      );
      // Special Case - handle screen boundaries
      // ({ lastPath, posX, posY } = this.gameManager
      //   .getBubbleAnimator()
      //   .handleScreenBoundaries(
      //     this.gameManager.predictBubble,
      //     lastPath,
      //     gridPos,
      //     posX,
      //     posY
      //   ));
      this.gameManager.predictBubble.setPosition(posX, posY);
      this.gameManager.predictRow = gridPos.row;
      this.gameManager.predictCol = gridPos.col;
    }
  }

  public createRayToMouse(event: EventMouse): void {
    this.gameManager.getGraphicsRenderer().clearGraphics();

    const mousePos = new Vec2(
      event.getUILocation().x,
      Math.max(event.getUILocation().y, 330)
    );
    const ray = this.gameManager.startLinePos.getWorldPosition();
    const rayOrigin = new Vec2(ray.x, ray.y);
    this.gameManager.path.push(rayOrigin);

    const direction = new Vec2();
    Vec2.subtract(direction, mousePos, rayOrigin);
    direction.normalize();

    const angle = Math.atan2(direction.y, direction.x);
    const lineLength = 2000;
    const endPoint = new Vec2(
      rayOrigin.x + Math.cos(angle) * lineLength,
      rayOrigin.y + Math.sin(angle) * lineLength
    );

    //const mask = (1 << 0) | (1 << 2) | (1 << 3);
    const results = PhysicsSystem2D.instance.raycast(
      rayOrigin,
      endPoint,
      ERaycast2DType.All
      //mask
    );

    if (results.length === 0) {
      return;
    }

    const sortedResults = Array.from(results).sort((a, b) => {
      const distanceA = Vec2.distance(rayOrigin, a.point);
      const distanceB = Vec2.distance(rayOrigin, b.point);
      return distanceA - distanceB;
    });

    const validResult = sortedResults.find(result => {
      return !this.isScoreHoleOrChild(result.collider.node);
    });

    if (!validResult) {
      return;
    }

    const collider = validResult.collider;
    const point = validResult.point;

    // for (let r of results) {
    //   const node = r.collider.node;
    //   console.log(
    //     'Hit node:',
    //     node.name,
    //     ' Group:',
    //     r.collider.group,
    //     ' Layer:',
    //     node.layer
    //   );
    //   console.log(r.point);
    // }

    // const collider = results[0].collider;
    // const point = results[0].point;

    if (
      collider.node === this.gameManager.leftWall ||
      collider.node === this.gameManager.rightWall
    ) {
      this.gameManager.path.push(point);
      this.gameManager.getGraphicsRenderer().drawLine(rayOrigin, endPoint);
      this.reflectRay(rayOrigin, point);
    } else {
      this.glowActivation(
        this.gameManager.previewBubbleComponent.currentBubbleIndex,
        collider.node
      );
      this.gameManager.getGraphicsRenderer().drawLine(rayOrigin, point);
      this.gameManager.path.push(point);
      this.gameManager.lastCollider = collider.node;
    }

    this.gameManager.getGraphicsRenderer().stroke();
  }

  public reflectRay(start: Vec2, end: Vec2): void {
    const direction = new Vec2();
    Vec2.subtract(direction, end, start);
    direction.normalize();

    const lineLength = 2000;
    const angle = Math.atan2(direction.y, direction.x);
    const endPoint = new Vec2(
      end.x - Math.cos(angle) * lineLength,
      end.y + Math.sin(angle) * lineLength
    );

    //const mask = (1 << 0) | (1 << 3) | (1 << 2);
    const results = PhysicsSystem2D.instance.raycast(
      end,
      endPoint,
      ERaycast2DType.Closest
      //mask
    );

    if (results.length === 0) {
      return;
    }

    const sortedResults = Array.from(results).sort((a, b) => {
      const distanceA = Vec2.distance(end, a.point);
      const distanceB = Vec2.distance(end, b.point);
      return distanceA - distanceB;
    });

    const validResult = sortedResults.find(result => {
      return !this.isScoreHoleOrChild(result.collider.node);
    });

    if (!validResult) {
      return;
    }

    const collider = validResult.collider;
    const point = validResult.point;

    // const collider = results[0].collider;
    // const point = results[0].point;

    if (
      collider.node === this.gameManager.leftWall ||
      collider.node === this.gameManager.rightWall
    ) {
      this.gameManager.getGraphicsRenderer().drawLine(end, endPoint);
      this.gameManager.path.push(point);
      this.reflectRay(end, point);
    } else {
      this.glowActivation(
        this.gameManager.previewBubbleComponent.currentBubbleIndex,
        collider.node
      );
      this.gameManager.getGraphicsRenderer().drawLine(end, point);
      this.gameManager.path.push(point);
      this.gameManager.lastCollider = collider.node;
    }
  }

  private isScoreHoleOrChild(node: Node): boolean {
    if (node === this.gameManager.scoreHole) {
      return true;
    }

    let currentParent = node.parent;
    while (currentParent) {
      if (currentParent === this.gameManager.scoreHole) {
        return true;
      }
      currentParent = currentParent.parent;
    }

    return false;
  }

  glowActivation(currBubIndex: number, collider: Node) {
    this.gameManager.bubblesArray.forEach(x => {
      x.getComponent(bubblesPrefab).glow.active = false;
    });
    if (currBubIndex <= 7) {
      if (collider) collider.getComponent(bubblesPrefab).glow.active = true;
    }
    if (currBubIndex == 8) {
      const mousePos = this.gameManager.currentMousePosition;
      const ray = this.gameManager.startLinePos.getWorldPosition();
      const rayOrigin = new Vec2(ray.x, ray.y);
      const direction = new Vec2();
      Vec2.subtract(direction, mousePos, rayOrigin);
      direction.normalize();
      const angle = Math.atan2(direction.y, direction.x);
      const lineLength = 1500;
      // const sceen = view.getVisibleSize();
      const endPoint = new Vec2(
        rayOrigin.x + Math.cos(angle) * lineLength,
        rayOrigin.y + Math.sin(angle) * lineLength
      );
      const results = PhysicsSystem2D.instance.raycast(
        rayOrigin,
        endPoint,
        ERaycast2DType.All
      );
      results.forEach(r => {
        if (r.collider.node.layer == 1)
          r.collider.node.getComponent(bubblesPrefab).glow.active = true;
      });
    }
    if (currBubIndex == 9) {
      const bubbleToDestroy = [];
      this.gameManager.bubblesArray.forEach(bb => {
        const bbc = bb.getComponent(bubblesPrefab);
        const cc = collider.getComponent(bubblesPrefab);
        if (
          Math.abs(bbc.getRowIndex() - cc.getRowIndex()) == 2 &&
          Math.abs(bbc.getColIndex() - cc.getColIndex()) <= 1
        ) {
          bubbleToDestroy.push(bb);
        }
        if (cc.getRowIndex() % 2 == 0) {
          if (
            Math.abs(bbc.getRowIndex() - cc.getRowIndex()) == 1 &&
            (Math.abs(bbc.getColIndex() - cc.getColIndex()) < 2 ||
              bbc.getColIndex() - cc.getColIndex() == 2)
          ) {
            bubbleToDestroy.push(bb);
          }
        } else {
          if (
            Math.abs(bbc.getRowIndex() - cc.getRowIndex()) == 1 &&
            (Math.abs(bbc.getColIndex() - cc.getColIndex()) < 2 ||
              bbc.getColIndex() - cc.getColIndex() == -2)
          ) {
            bubbleToDestroy.push(bb);
          }
        }

        if (
          Math.abs(bbc.getRowIndex() - cc.getRowIndex()) == 0 &&
          Math.abs(bbc.getColIndex() - cc.getColIndex()) <= 2
        ) {
          bubbleToDestroy.push(bb);
        }
      });
      bubbleToDestroy.forEach(bb => {
        bb.getComponent(bubblesPrefab).glow.active = true;
      });
    }
    if (currBubIndex == 10) {
      this.gameManager.bubblesArray.forEach(x => {
        if (
          x.getComponent(bubblesPrefab).rowIndex ===
          collider.getComponent(bubblesPrefab).rowIndex
        ) {
          x.getComponent(bubblesPrefab).glow.active = true;
        }
      });
    }
    if (currBubIndex == 11) {
      const adjBubble = this.gameManager
        .getBubbleAnimator()
        .getAdjacentBubbles(
          this.gameManager.predictRow,
          this.gameManager.predictCol
        );
      const bubblesToDestroy: Node[] = [];
      adjBubble.forEach(adj => {
        const visitedBubbles = new Set<Node>();
        const spriteFrame = adj
          .getComponent(bubblesPrefab)
          .bubbles.getComponent(Sprite).spriteFrame;

        this.gameManager
          .getBubbleDestroyer()
          .findConnectedBubbles(
            adj,
            spriteFrame,
            visitedBubbles,
            bubblesToDestroy
          );
      });
      bubblesToDestroy.forEach(bb => {
        bb.getComponent(bubblesPrefab).glow.active = true;
      });
    }
  }
}
