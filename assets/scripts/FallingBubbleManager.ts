import { Node, Vec2 } from 'cc';
import { BUBBLES_SIZE } from './GameManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';
import { destroyBubble } from './prefab/destroyBubble';

export class FallingBubbleManager {
  private gameManager: any;

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public checkForFallingBubbles(): void {
    let hasTopRowBubbles = false;
    this.gameManager.bubblesArray.forEach(bubble => {
      if (bubble.active) {
        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        if (
          bubbleComponent &&
          bubbleComponent.getRowIndex() === this.gameManager.rows - 1 &&
          bubbleComponent.isVisibleBubble()
        ) {
          hasTopRowBubbles = true;
        }
      }
    });

    if (!hasTopRowBubbles) {
      const allRemainingBubbles: Node[] = [];
      this.gameManager.bubblesArray.forEach(bubble => {
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

    this.gameManager.bubblesArray.forEach(bubble => {
      if (bubble.active && this.isTopRowBubble(bubble)) {
        this.findAllConnectedBubbles(bubble, visited, connectedToTop);
      }
    });

    const fallingBubbles: Node[] = [];
    this.gameManager.bubblesArray.forEach(bubble => {
      if (bubble.active && !connectedToTop.has(bubble)) {
        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        if (!bubbleComponent || bubbleComponent.isVisibleBubble()) {
          fallingBubbles.push(bubble);
        }
      }
    });

    if (fallingBubbles.length > 0) {
      // console.log(
      //   `Making ${fallingBubbles.length} bubbles fall (disconnected from top)`
      // );
      this.animateFallingBubbles(fallingBubbles);
    }
  }

  public isTopRowBubble(bubble: Node): boolean {
    if (!bubble.active) return false;

    const bubbleComponent = bubble.getComponent(bubblesPrefab);
    if (bubbleComponent && bubbleComponent.isGridBubble()) {
      return bubbleComponent.getRowIndex() === this.gameManager.rows - 1;
    }

    const bubbleY = bubble.getWorldPosition().y;

    for (const b of this.gameManager.bubblesArray) {
      if (b.active) {
        const bComponent = b.getComponent(bubblesPrefab);
        if (
          bComponent &&
          bComponent.getRowIndex() === this.gameManager.rows - 1
        ) {
          const topRowY = b.getWorldPosition().y;
          return Math.abs(bubbleY - topRowY) < BUBBLES_SIZE * 0.5;
        }
      }
    }

    return false;
  }

  public findAllConnectedBubbles(
    bubble: Node,
    visited: Set<Node>,
    result: Set<Node>
  ): void {
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

  public animateFallingBubbles(fallingBubbles: Node[]): void {
    if (fallingBubbles.length === 0) return;

    // Calculate CENTER of the falling bubble group for better explosion effect
    let centerX = 0;
    let centerY = 0;
    fallingBubbles.forEach(bubble => {
      centerX += bubble.getWorldPosition().x;
      centerY += bubble.getWorldPosition().y;
    });
    centerX /= fallingBubbles.length;
    centerY /= fallingBubbles.length;

    fallingBubbles.forEach((bubble, index) => {
      this.gameManager.fallingBubbles.add(bubble);

      const bubbleComponent = bubble.getComponent(bubblesPrefab);
      if (bubbleComponent) {
        bubbleComponent.disableCollider();
      }

      const deltaX = bubble.getWorldPosition().x - centerX;
      const deltaY = bubble.getWorldPosition().y - centerY;

      // Calculate distance from center for normalized direction
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Firework effect: radiate outward from center with upward bias
      const explosionForce = 20; // Minimal explosion strength
      const minVelocity = 5; // Minimal velocity for bubbles at center
      const upwardBias = 15; // Very small upward velocity for all bubbles

      let velocityX, velocityY;

      if (distance > 0) {
        // Normalize direction and apply explosion force
        const normalizedX = deltaX / distance;
        const normalizedY = deltaY / distance;

        velocityX = normalizedX * explosionForce;
        velocityY = normalizedY * explosionForce + upwardBias; // Add upward bias
      } else {
        // Handle bubbles exactly at center with random direction
        const randomAngle = Math.random() * Math.PI * 2;
        velocityX = Math.cos(randomAngle) * minVelocity;
        velocityY = Math.sin(randomAngle) * minVelocity + upwardBias; // Add upward bias
      }

      // Add some randomness for more natural effect (minimal)
      velocityX += (Math.random() - 0.5) * 8;
      velocityY += (Math.random() - 0.5) * 5; // Less Y randomness to preserve upward motion

      const spriteFrame = this.getSpriteFrame(bubble);

      this.gameManager.destroyLayer
        .getComponent(destroyBubble)
        .destroyEffect(bubble, velocityX, velocityY, spriteFrame);

      // Return bubble to pool instead of just deactivating
      this.gameManager.returnBubbleToPool(bubble);
    });
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

  public getSpriteFrame(node: Node) {
    return node.getComponent(bubblesPrefab).bubbles.spriteFrame;
  }
}
