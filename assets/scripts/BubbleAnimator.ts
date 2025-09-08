import {
  Tween,
  Vec2,
  Vec3,
  view,
  Node,
  instantiate,
  nextPow2,
  path,
  UITransform,
  PhysicsSystem2D,
  ERaycast2DType,
} from 'cc';
import { BUBBLES_SIZE, GameManager, MAP_FALL_SPEED } from './GameManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';

export class BubbleAnimator {
  private gameManager: GameManager;

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public movingBubble(bubble: Node, collider: Node): void {
    let lastPath = this.gameManager.path[this.gameManager.path.length - 1];
    let calculatedGridPos: { row: number; col: number } | null = null;

    const gridPos = this.newGridPosition(collider, lastPath);
    calculatedGridPos = gridPos;

    const bubbleComponent = bubble.getComponent(bubblesPrefab);
    if (bubbleComponent) {
      bubbleComponent.setGridPosition(
        gridPos.row,
        gridPos.col,
        bubbleComponent.bubbleIndex
      );
    }

    let { posX, posY } = this.gameManager.gridIndexToPosition(
      gridPos.row,
      gridPos.col
    );
    // Special Case - handle screen boundaries
    ({ lastPath, posX, posY } = this.handleScreenBoundaries(
      bubble,
      lastPath,
      gridPos,
      posX,
      posY
    ));

    bubble.setPosition(posX, posY);
    const worldPos = bubble.getWorldPosition();
    lastPath = new Vec2(worldPos.x, worldPos.y);
    bubble.setWorldPosition(this.gameManager.startLinePos.getWorldPosition());

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
        bubble.setPosition(posX, posY);
        // Remove from shot bubbles set since it has now settled
        this.gameManager.shotBubbles.delete(bubble);

        // Re-enable collider since bubble has settled
        bubble.getComponent(bubblesPrefab).enableCollider();

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
          this.gameManager.getBubbleDestroyer().destroyBubble(bubble, false);
        } else {
          switch (bubble.getComponent(bubblesPrefab).bubbleIndex) {
            case 8:
              this.fireworkBuffer(bubble);
              break;
            case 9:
              this.bombBuffer(bubble, collider);
              break;
            case 10:
              this.lineBubbleBuffer(bubble, collider);
              break;
            case 11:
              this.rainbowBubbleBuffer(bubble);
              break;
          }
        }

        this.waterDropEffect(bubble);

        if (
          this.gameManager.getMaxBubbleRowIndex() -
            this.gameManager.getMinBubbleRowIndex() +
            1 <
          this.gameManager.totalRows
        ) {
          this.gameManager.getBubbleFactory().addNewRowsEfficient();
        }
      },
      this.calculateAnimationTime() * 1000 + 50
    );

    if (this.gameManager.previewBubbleComponent) {
      this.gameManager.previewBubbleComponent.updateShootBubble();
    }
  }

  waterDropEffect(bubble: Node) {
    // Collect and group bubbles by their distance from the center
    const bubbleGroups = new Map<number, Array<Node>>();
    const centerBubble = bubble.getComponent(bubblesPrefab);

    this.gameManager.bubblesArray.forEach(bb => {
      const bubbleComp = bb.getComponent(bubblesPrefab);

      // Calculate exact distance in grid units
      const rowDiff = Math.abs(
        bubbleComp.getRowIndex() - centerBubble.getRowIndex()
      );
      const colDiff = Math.abs(
        bubbleComp.getColIndex() - centerBubble.getColIndex()
      );

      // Calculate grid distance (considering hexagonal grid)
      const distance = Math.max(rowDiff, Math.floor(colDiff + rowDiff / 2));

      // Skip bubbles that are too far away
      if (distance >= 5) return;

      // Group bubbles by their distance
      if (!bubbleGroups.has(distance)) {
        bubbleGroups.set(distance, []);
      }
      bubbleGroups.get(distance)?.push(bb);
    });

    // Sort distances from nearest to farthest
    const sortedDistances = Array.from(bubbleGroups.keys()).sort(
      (a, b) => a - b
    );

    // Animation parameters
    const maxMoveDistance = 10; // Giảm khoảng cách di chuyển tối đa
    const duration = 0.15; // Giữ nguyên thời gian
    const layerDelay = 0.05; // Giữ nguyên độ trễ

    // Animate each distance group
    sortedDistances.forEach((distance, index) => {
      const bubbles = bubbleGroups.get(distance) || [];

      // Sử dụng hàm mũ với độ giảm nhanh hơn cho khoảng cách ngắn
      const moveDistance = maxMoveDistance * Math.pow(0.6, distance);
      bubbles.forEach(node => {
        const centerPos = bubble.getWorldPosition();
        const currentPos = node.getWorldPosition();

        // Calculate direction from center to bubble
        const direction = new Vec3(
          currentPos.x - centerPos.x,
          currentPos.y - centerPos.y,
          0
        ).normalize();

        // Calculate map movement compensation
        const totalAnimationTime = duration * 2 + index * layerDelay;
        const mapMovementDuringFlight = this.gameManager.isMovingToMinLine
          ? 0
          : totalAnimationTime * MAP_FALL_SPEED;

        // Store original position
        const originalPos = node.getWorldPosition().clone();

        // Create and start the animation
        const tween = new Tween(node);

        // First movement: away from center with smooth acceleration
        tween
          .delay(index * layerDelay) // Delay increases with each layer
          .to(
            duration,
            {
              worldPosition: new Vec3(
                originalPos.x + direction.x * moveDistance,
                originalPos.y + direction.y * moveDistance,
                originalPos.z
              ),
            },
            {
              easing: 'cubicOut', // Thay đổi easing function cho mượt mà hơn
            }
          )
          // Return to original position with bounce effect
          .to(
            duration,
            {
              worldPosition: new Vec3(
                originalPos.x,
                originalPos.y - mapMovementDuringFlight,
                originalPos.z
              ),
            },
            {
              // easing: 'bounceOut', // Sử dụng bounce effect cho chuyển động tự nhiên hơn
            }
          )
          .start();
      });
    });
  }

  lineBubbleBuffer(bubble: Node, collider: Node) {
    this.gameManager.returnBubbleToPool(bubble);
    const bubbleToDestroy = [];
    this.gameManager.bubblesArray.forEach(bb => {
      if (
        bb.getComponent(bubblesPrefab).getRowIndex() ==
          collider.getComponent(bubblesPrefab).getRowIndex() &&
        bb.getWorldPosition().y <= this.gameManager.screenSize.height
      ) {
        bubbleToDestroy.push(bb);
      }
    });
    this.gameManager
      .getFallingBubbleManager()
      .animateFallingBubbles(bubbleToDestroy);
    this.gameManager.getFallingBubbleManager().checkForFallingBubbles();
  }

  bombBuffer(bubble: Node, collider: Node) {
    this.gameManager.returnBubbleToPool(bubble);
    const bubbleToDestroy = [];
    this.gameManager.bubblesArray.forEach(bb => {
      const bbc = bb.getComponent(bubblesPrefab);
      const cc = collider.getComponent(bubblesPrefab);
      if (bb.getWorldPosition().y <= this.gameManager.screenSize.height) {
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
      }
    });
    this.gameManager
      .getFallingBubbleManager()
      .animateFallingBubbles(bubbleToDestroy);
    this.gameManager.getFallingBubbleManager().checkForFallingBubbles();
  }

  fireworkBuffer(bubble: Node) {
    this.gameManager.returnBubbleToPool(bubble);
    const mousePos = this.gameManager.currentMousePosition;
    const ray = this.gameManager.startLinePos.getWorldPosition();
    const rayOrigin = new Vec2(ray.x, ray.y);
    const direction = new Vec2();
    Vec2.subtract(direction, mousePos, rayOrigin);
    direction.normalize();
    const angle = Math.atan2(direction.y, direction.x);
    const lineLength = 1500;
    const endPoint = new Vec2(
      rayOrigin.x + Math.cos(angle) * lineLength,
      rayOrigin.y + Math.sin(angle) * lineLength
    );
    const results = PhysicsSystem2D.instance.raycast(
      rayOrigin,
      endPoint,
      ERaycast2DType.All
    );
    const bubbleToDestroy = [];
    results.forEach(r => {
      if (
        r.collider.node.layer == 1 &&
        r.collider.node.getWorldPosition().y <=
          this.gameManager.screenSize.height
      )
        bubbleToDestroy.push(r.collider.node);
    });

    this.gameManager
      .getFallingBubbleManager()
      .animateFallingBubbles(bubbleToDestroy);
    this.gameManager.getFallingBubbleManager().checkForFallingBubbles();
  }

  rainbowBubbleBuffer(bubble: Node) {
    const bubbleComponent = bubble.getComponent(bubblesPrefab);
    const adjBubble = this.getAdjacentBubbles(
      bubbleComponent.rowIndex,
      bubbleComponent.colIndex
    );
    this.gameManager.returnBubbleToPool(bubble);
    adjBubble.forEach(adj => {
      this.gameManager.getBubbleDestroyer().destroyBubble(adj, true);
    });
    this.gameManager.getFallingBubbleManager().checkForFallingBubbles();
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
    lastPath: Vec2,
    gridPos: { row: number; col: number },
    posX: number,
    posY: number
  ): { lastPath: Vec2; posX: number; posY: number } {
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
          if (position.row == 0) posX += BUBBLES_SIZE * position.col;
          else posX += BUBBLES_SIZE * position.col + BUBBLES_SIZE / 2;
          posY += BUBBLES_SIZE * position.row * 0.85;
          lastPath.x += BUBBLES_SIZE * position.col;
          lastPath.y += BUBBLES_SIZE * position.row * 0.85;
          bubble
            .getComponent(bubblesPrefab)
            .setGridPosition(
              newRow,
              newCol,
              bubble.getComponent(bubblesPrefab).bubbleIndex
            );
          return { lastPath, posX, posY };
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
          if (position.row == 0) posX += BUBBLES_SIZE * position.col;
          else posX += BUBBLES_SIZE * position.col - BUBBLES_SIZE / 2;
          posY += BUBBLES_SIZE * position.row * 0.85;
          lastPath.x += BUBBLES_SIZE * position.row;
          lastPath.y += BUBBLES_SIZE * position.col * 0.85;
          bubble
            .getComponent(bubblesPrefab)
            .setGridPosition(
              newRow,
              newCol,
              bubble.getComponent(bubblesPrefab).bubbleIndex
            );
          return { lastPath, posX, posY };
        }
      }
    }

    return { lastPath, posX, posY };
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
        const { posX, posY } = this.gameManager.gridIndexToPosition(
          position.row,
          position.col
        );

        const localPos = this.gameManager.node
          .getComponent(UITransform)
          .convertToNodeSpaceAR(new Vec3(pos.x, pos.y));
        const dist = this.distance(
          new Vec2(posX, posY),
          new Vec2(localPos.x, localPos.y)
        );

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
}
