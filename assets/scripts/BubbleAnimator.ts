import { Tween, Vec2, Vec3, view, Node, instantiate, nextPow2, path } from 'cc';
import { BUBBLES_SIZE, MAP_FALL_SPEED } from './GameManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';

export class BubbleAnimator {
  private gameManager: any;
  private bubbleColliderMap: Map<Node, Node> = new Map(); // Track which collider each bubble used

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public movingBubble(bubble: Node, collider: Node): void {
    this.bubbleColliderMap.set(bubble, collider);
    let lastPath = this.gameManager.path[this.gameManager.path.length - 1];
    let calculatedGridPos: { row: number; col: number } | null = null;
    let mapX: number;
    let mapY: number;

    this.gameManager.bubblesArray.forEach(i => {
      if (collider === i) {
        const gridPos = this.newGridPosition(i, lastPath);
        calculatedGridPos = gridPos;

        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        if (bubbleComponent) {
          bubbleComponent.setGridPosition(gridPos.row, gridPos.col);
          // console.log(
          //   `Bubble assigned to grid position: row ${gridPos.row}, col ${gridPos.col}`
          // );
        }

        mapY = gridPos.row * BUBBLES_SIZE * 0.85;
        if (gridPos.row % 2 === 0) {
          mapX = (gridPos.col - (this.gameManager.cols - 1) / 2) * BUBBLES_SIZE;
        } else {
          mapX =
            (gridPos.col - (this.gameManager.cols - 1) / 2) * BUBBLES_SIZE -
            BUBBLES_SIZE / 2;
        }

        // Special Case - handle screen boundaries
        ({ lastPath, mapX, mapY } = this.handleScreenBoundaries(
          bubble,
          lastPath,
          gridPos,
          mapX,
          mapY
        ));

        bubble.setPosition(mapX, mapY);
        lastPath = bubble.getWorldPosition();
        bubble.setWorldPosition(
          this.gameManager.startLinePos.getWorldPosition()
        );
      }
    });

    //Make the last path falling down with the map
    const mapMovementDuringFlight = this.gameManager.isMovingToMinLine
      ? 0
      : this.calculateAnimationTime() * MAP_FALL_SPEED;
    const compensatedPath = new Vec2(
      lastPath.x,
      lastPath.y - mapMovementDuringFlight
    );
    this.gameManager.path[this.gameManager.path.length - 1] = compensatedPath;
    this.animateBubble(bubble);

    setTimeout(
      () => {
        bubble.setPosition(mapX, mapY);

        // Remove from shot bubbles set since it has now settled
        this.gameManager.shotBubbles.delete(bubble);

        // Re-enable collider since bubble has settled
        bubble.getComponent(bubblesPrefab).enableCollider();

        // Increment row counter and add rows when counter > 30
        this.gameManager.rowCounter++;
        if (this.gameManager.rowCounter > 30) {
          this.gameManager.getBubbleFactory().addNewRowsEfficient(30);
          this.gameManager.rowCounter = 0;
        }

        // Get adjacent bubbles using the grid position instead of world position
        const colliderRow = bubble.getComponent(bubblesPrefab).getRowIndex();
        const colliderCol = bubble.getComponent(bubblesPrefab).getColIndex();

        const adjacentBubbles = this.getAdjacentBubbles(
          colliderRow,
          colliderCol
        );
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
          // Clean up map entries before destroying
          this.bubbleColliderMap.delete(bubble);
          this.gameManager.getBubbleDestroyer().destroyBubble(bubble);
        } else {
          //console.log('No match - bubble stays in place');
        }
      },
      this.calculateAnimationTime() * 1000 + 50
    );

    if (this.gameManager.previewBubbleComponent) {
      this.gameManager.previewBubbleComponent.updateShootBubble();
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

  public handleScreenBoundaries(
    bubble: Node,
    lastPath: Vec3,
    gridPos: { row: number; col: number },
    mapX: number,
    mapY: number
  ): { lastPath: Vec3; mapX: number; mapY: number } {
    // Handle left boundary
    if (gridPos.col == 0 && gridPos.row % 2 == 1) {
      const positionLeft = [
        { row: 0, col: 1 }, //Right
        { row: -1, col: 0 }, //Bottom-left
        { row: 1, col: 0 }, //Top-left
      ];
      for (const position of positionLeft) {
        const newRow = gridPos.row + position.row;
        const newCol = gridPos.col + position.col;
        // Check if the new position is occupied
        const isOccupied = this.isPositionOccupied(newRow, newCol);
        if (isOccupied) continue;
        if (!isOccupied) {
          if (position.row == 0) mapX += BUBBLES_SIZE * position.col;
          else mapX += BUBBLES_SIZE * position.col + BUBBLES_SIZE / 2;
          mapY += BUBBLES_SIZE * position.row * 0.85;
          lastPath.x += BUBBLES_SIZE * position.col;
          lastPath.y += BUBBLES_SIZE * position.row * 0.85;
          bubble.getComponent(bubblesPrefab).setGridPosition(newRow, newCol);
          return { lastPath, mapX, mapY };
        }
      }
    }

    // Handle right boundary
    if (gridPos.col == this.gameManager.cols && gridPos.row % 2 == 1) {
      const positionLeft = [
        { row: 0, col: -1 }, //Left
        { row: -1, col: 0 }, //Bottom-left
        { row: 1, col: 0 }, //Top-left
      ];
      for (const position of positionLeft) {
        const newRow = gridPos.row + position.row;
        const newCol = gridPos.col + position.col;

        // Check if the new position is occupied
        const isOccupied = this.isPositionOccupied(newRow, newCol);
        if (isOccupied) continue;
        if (!isOccupied) {
          if (position.row == 0) mapX += BUBBLES_SIZE * position.col;
          else mapX += BUBBLES_SIZE * position.col - BUBBLES_SIZE / 2;
          mapY += BUBBLES_SIZE * position.row * 0.85;
          lastPath.x += BUBBLES_SIZE * position.row;
          lastPath.y += BUBBLES_SIZE * position.col * 0.85;
          bubble.getComponent(bubblesPrefab).setGridPosition(newRow, newCol);
          return { lastPath, mapX, mapY };
        }
      }
    }

    return { lastPath, mapX, mapY };
  }

  public isPositionOccupied(row: number, col: number): boolean {
    return this.gameManager.bubblesArray.some(bubble => {
      if (!bubble.active) return false;
      const bubbleComponent = bubble.getComponent(bubblesPrefab);
      if (!bubbleComponent || !bubbleComponent.isGridBubble()) return false;

      return (
        bubbleComponent.getRowIndex() === row &&
        bubbleComponent.getColIndex() === col
      );
    });
  }

  public newGridPosition(
    colliderBubble: Node,
    pos: Vec2
  ): { row: number; col: number } {
    const colliderComponent = colliderBubble.getComponent(bubblesPrefab);

    const colliderRow = colliderComponent.getRowIndex();
    const colliderCol = colliderComponent.getColIndex();

    const adjacentPositions = [
      {
        row: colliderRow - 1,
        col: colliderCol + (colliderRow % 2 === 0 ? 1 : 0),
      }, // Top-right
      { row: colliderRow, col: colliderCol + 1 }, // Right
      {
        row: colliderRow + 1,
        col: colliderCol + (colliderRow % 2 === 0 ? 1 : 0),
      }, // Bottom-right
      {
        row: colliderRow + 1,
        col: colliderCol + (colliderRow % 2 === 0 ? 0 : -1),
      }, // Bottom-left
      { row: colliderRow, col: colliderCol - 1 }, // Left
      {
        row: colliderRow - 1,
        col: colliderCol + (colliderRow % 2 === 0 ? 0 : -1),
      }, // Top-left
    ];

    let minDist = Infinity;
    let finalRowIndex = colliderRow;
    let finalColIndex = colliderCol;

    for (const position of adjacentPositions) {
      const isOccupied = this.isPositionOccupied(position.row, position.col);
      if (!isOccupied) {
        const worldY = position.row * BUBBLES_SIZE * 0.85;
        let worldX;
        if (position.row % 2 === 0) {
          worldX =
            (position.col - (this.gameManager.cols - 1) / 2) * BUBBLES_SIZE;
        } else {
          worldX =
            (position.col - (this.gameManager.cols - 1) / 2) * BUBBLES_SIZE -
            BUBBLES_SIZE / 2;
        }
        const tmp: Node = instantiate(this.gameManager.bubbles);
        this.gameManager.node.addChild(tmp);
        tmp.setPosition(worldX, worldY);
        const dist = this.distance(
          new Vec2(tmp.getWorldPosition().x, tmp.getWorldPosition().y),
          pos
        );
        tmp.removeFromParent();
        if (minDist > dist) {
          minDist = dist;
          finalRowIndex = position.row;
          finalColIndex = position.col;
        }
      }
    }

    return {
      row: finalRowIndex,
      col: finalColIndex,
    };
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

  public getSpriteFrame(node: Node) {
    return node.getComponent(bubblesPrefab).bubbles.spriteFrame;
  }

  public cleanupBubbleCollider(bubble: Node): void {
    this.bubbleColliderMap.delete(bubble);
  }
}
