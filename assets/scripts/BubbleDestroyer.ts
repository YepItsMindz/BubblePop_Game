import { Node, Vec2 } from 'cc';
import { BUBBLES_SIZE } from './GameManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';
import { destroyBubble } from './prefab/destroyBubble';

export class BubbleDestroyer {
  private gameManager: any;

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public destroyBubble(bubble: Node, buffer: boolean): void {
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

    // Calculate CENTER of the bubble group for better explosion effect
    let centerX = 0;
    let centerY = 0;
    bubblesToDestroy.forEach(bubble => {
      centerX += bubble.getWorldPosition().x;
      centerY += bubble.getWorldPosition().y;
    });
    centerX /= bubblesToDestroy.length;
    centerY /= bubblesToDestroy.length;

    if (bubblesToDestroy.length >= 3 || buffer == true) {
      //console.log(`Destroying ${bubblesToDestroy.length} connected bubbles`);
      bubblesToDestroy.forEach(bubbleToDestroy => {
        if (bubbleToDestroy.active) {
          const bubbleComponent = bubbleToDestroy.getComponent(bubblesPrefab);
          if (bubbleComponent) {
            bubbleComponent.disableCollider();
          }

          const deltaX = bubbleToDestroy.getWorldPosition().x - centerX;
          const deltaY = bubbleToDestroy.getWorldPosition().y - centerY;

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

          //console.log(`Bubble explosion: vX=${velocityX.toFixed(1)}, vY=${velocityY.toFixed(1)}, distance=${distance.toFixed(1)}`);

          this.gameManager.destroyLayer
            .getComponent(destroyBubble)
            .destroyEffect(bubbleToDestroy, velocityX, velocityY, spriteFrame);

          // Return bubble to pool instead of just deactivating
          this.gameManager.returnBubbleToPool(bubbleToDestroy);
        }
      });

      this.gameManager.getFallingBubbleManager().checkForFallingBubbles();
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

    const bubbleCmp = bubble.getComponent(bubblesPrefab);
    const adjacentBubbles = this.getAdjacentBubbles(
      bubbleCmp.rowIndex,
      bubbleCmp.colIndex
    );

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

  public getAdjacentBubbles(row: number, col: number): Node[] {
    const adjacentBubbles: Node[] = [];
    const targetRow = row;
    const targetCol = col;

    const adjacentPositions = [
      { row: targetRow - 1, col: targetCol + (targetRow % 2 === 0 ? 1 : 0) }, // Top-right
      { row: targetRow, col: targetCol + 1 }, // Right
      { row: targetRow + 1, col: targetCol + (targetRow % 2 === 0 ? 1 : 0) }, // Bottom-right
      { row: targetRow + 1, col: targetCol + (targetRow % 2 === 0 ? 0 : -1) }, // Bottom-left
      { row: targetRow, col: targetCol - 1 }, // Left
      { row: targetRow - 1, col: targetCol + (targetRow % 2 === 0 ? 0 : -1) }, // Top-left
    ];

    this.gameManager.bubblesArray.forEach(bubble => {
      const bubbleComponent = bubble.getComponent(bubblesPrefab);
      if (!bubbleComponent || !bubbleComponent.isGridBubble()) return;

      const bubbleRow = bubbleComponent.getRowIndex();
      const bubbleCol = bubbleComponent.getColIndex();
      const isAdjacent = adjacentPositions.some(
        pos => pos.row === bubbleRow && pos.col === bubbleCol
      );

      if (isAdjacent) {
        adjacentBubbles.push(bubble);
      }
    });

    return adjacentBubbles;
  }
}
