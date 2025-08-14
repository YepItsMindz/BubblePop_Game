import { Tween, Vec2, Vec3, view, Node } from 'cc';
import { BUBBLES_SIZE, MAP_FALL_SPEED } from './GameManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';

export class BubbleAnimator {
  private gameManager: any;

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public movingBubble(bubble: Node, collider: Node): void {
    let lastPath = this.gameManager.path[this.gameManager.path.length - 1];
    this.gameManager.bubblesArray.forEach(i => {
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

    const isOccupied = this.gameManager.bubblesArray.some(bubble => {
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

    this.gameManager.path[this.gameManager.path.length - 1] = lastPath;

    const animationTime = this.calculateAnimationTime();
    const mapMovementDuringFlight = this.gameManager.isMovingToMinLine
      ? 0
      : animationTime * MAP_FALL_SPEED;

    const compensatedPath = new Vec2(
      lastPath.x,
      lastPath.y - mapMovementDuringFlight
    );

    this.gameManager.path[this.gameManager.path.length - 1] = compensatedPath;

    this.animateBubble(bubble);

    // Check for matches after the bubble reaches its final position
    setTimeout(
      () => {
        // Set the bubble to its final position to ensure accurate adjacent bubble detection
        bubble.setWorldPosition(
          new Vec3(compensatedPath.x, compensatedPath.y, 1)
        );

        // Remove from shot bubbles set since it has now settled
        this.gameManager.shotBubbles.delete(bubble);

        // Re-enable collider since bubble has settled
        bubble.getComponent(bubblesPrefab).enableCollider();

        // Increment row counter and add rows when counter > 50
        this.gameManager.rowCounter++;
        if (this.gameManager.rowCounter > 50) {
          this.gameManager.getBubbleFactory().addNewRowsEfficient(50);
          this.gameManager.rowCounter = 0;
        }

        const adjacentBubbles = this.getAdjacentBubbles(compensatedPath);
        //console.log('Adjacent bubbles found:', adjacentBubbles.length);
        let hasMatch = false;

        adjacentBubbles.forEach(adjacentBubble => {
          if (
            this.getSpriteFrame(bubble) === this.getSpriteFrame(adjacentBubble)
          ) {
            //console.log('Match found with bubble:', adjacentBubble.name);
            hasMatch = true;
          }
        });

        if (hasMatch) {
          //console.log('Match found - destroying bubbles');
          this.gameManager.getBubbleDestroyer().destroyBubble(bubble);
        } else {
          //console.log('No match - bubble stays in place');
        }
      },
      this.calculateAnimationTime() * 1000 + 50
    );

    if (this.gameManager.previewBubbleComponent) {
      this.gameManager.previewBubbleComponent.generateNextBubble();
    }
  }

  public animateBubble(bubble: Node): void {
    if (this.gameManager.path.length === 0) {
      return;
    }
    let actions = new Tween();
    for (let i = 1; i < this.gameManager.path.length; i++) {
      actions.to(
        this.distance(this.gameManager.path[i - 1], this.gameManager.path[i]) /
          this.gameManager.velocity,
        {
          worldPosition: new Vec3(
            this.gameManager.path[i].x,
            this.gameManager.path[i].y
          ),
        }
      );
    }
    actions.clone(bubble).start();
  }

  public calculateAnimationTime(): number {
    if (this.gameManager.path.length === 0) {
      return 0;
    }

    let totalTime = 0;
    for (let i = 1; i < this.gameManager.path.length; i++) {
      totalTime +=
        this.distance(this.gameManager.path[i - 1], this.gameManager.path[i]) /
        this.gameManager.velocity;
    }
    return totalTime;
  }

  public distance(nodePos: Vec2, point: Vec2): number {
    return Vec2.distance(nodePos, point);
  }

  public newPosition(nodePos: Vec2, point: Vec2): Vec2 {
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
      const isOccupied = this.gameManager.bubblesArray.some(x => {
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

  public getAdjacentBubbles(centerPos: Vec2): Node[] {
    const adjacentBubbles: Node[] = [];

    this.gameManager.bubblesArray.forEach(bubble => {
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

  public getSpriteFrame(node: Node) {
    return node.getComponent(bubblesPrefab).bubbles.spriteFrame;
  }
}
