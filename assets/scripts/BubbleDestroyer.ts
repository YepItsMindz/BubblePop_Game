import { Node, Vec2 } from 'cc';
import { BUBBLES_SIZE } from './GameManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';
import { destroyBubble } from './prefab/destroyBubble';

export class BubbleDestroyer {
  private gameManager: any;

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public destroyBubble(bubble: Node): void {
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

    // Calculate CENTER of the bubble group for better explosion effect
    let centerX = 0;
    let centerY = 0;
    bubblesToDestroy.forEach(bubble => {
      centerX += bubble.getWorldPosition().x;
      centerY += bubble.getWorldPosition().y;
    });
    centerX /= bubblesToDestroy.length;
    centerY /= bubblesToDestroy.length;

    if (bubblesToDestroy.length >= 3) {
      //console.log(`Destroying ${bubblesToDestroy.length} connected bubbles`);
      bubblesToDestroy.forEach(bubbleToDestroy => {
        if (bubbleToDestroy.active) {
          const bubbleComponent = bubbleToDestroy.getComponent(bubblesPrefab);
          if (bubbleComponent) {
            bubbleComponent.disableCollider();
          }

          const deltaX = bubbleToDestroy.getWorldPosition().x - centerX;
          const deltaY = bubbleToDestroy.getWorldPosition().y - centerY;

          const velocityX =
            deltaX !== 0 ? Math.min(Math.max(200 / deltaX, -500), 500) : 10;
          const velocityY = Math.min(
            Math.max(2000 / (Math.abs(deltaY) * 0.1 + 50), -300),
            500
          );
          //console.log(velocityX, velocityY);

          this.gameManager.destroyLayer
            .getComponent(destroyBubble)
            .destroyEffect(bubbleToDestroy, velocityX, velocityY, spriteFrame);

          // Return bubble to pool instead of just deactivating
          this.gameManager.returnBubbleToPool(bubbleToDestroy);
        }
      });

      this.gameManager.getFallingBubbleManager().checkForFallingBubbles();
    } else {
      //console.log(`Only ${bubblesToDestroy.length} connected bubbles found, not enough to destroy`);
    }
  }

  public findConnectedBubbles(
    bubble: Node,
    targetSpriteFrame: any,
    visited: Set<Node>,
    result: Node[]
  ): void {
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

  public getSpriteFrame(node: Node) {
    return node.getComponent(bubblesPrefab).bubbles.spriteFrame;
  }

  public getAdjacentBubbles(centerPos: Vec2): Node[] {
    const adjacentBubbles: Node[] = [];

    this.gameManager.bubblesArray.forEach(bubble => {
      if (bubble.active) {
        const bubblePos = new Vec2(
          bubble.getWorldPosition().x,
          bubble.getWorldPosition().y
        );
        const distance = Vec2.distance(bubblePos, centerPos);

        if (distance > 0 && distance <= BUBBLES_SIZE * 1.2) {
          adjacentBubbles.push(bubble);
        }
      }
    });

    return adjacentBubbles;
  }
}
