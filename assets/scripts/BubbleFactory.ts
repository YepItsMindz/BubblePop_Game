import { instantiate, Node, Vec3 } from 'cc';
import { BUBBLES_SIZE } from './GameManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';

export class BubbleFactory {
  private gameManager: any;

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public createMaps(): void {
    for (let i = 10; i < this.gameManager.rows + 10; i++) {
      if (i % 2 == 0) {
        for (let j = 0; j < this.gameManager.cols; j++) {
          this.createBubbles(i, j);
        }
      } else {
        for (let j = 1; j < this.gameManager.cols; j++) {
          this.createBubbles(i, j);
        }
      }
    }
  }

  public addNewRowsEfficient(numRows: number): void {
    console.log(`Adding ${numRows} new rows to the map efficiently`);

    const newBubbles: Node[] = [];
    // Calculate the starting row for new bubbles
    // The grid starts at row 10 and goes to row (10 + this.gameManager.rows - 1)
    // So new rows should start at row (10 + this.gameManager.rows)
    const startRow = 10 + this.gameManager.rows;

    for (let i = startRow; i < startRow + numRows; i++) {
      if (i % 2 == 0) {
        for (let j = 0; j < this.gameManager.cols; j++) {
          const node = this.gameManager.getBubbleFromPool();
          const randomBallIndex = Math.floor(Math.random() * 3) + 4;
          const sf = this.gameManager.spriteAtlas.getSpriteFrame(
            `ball_${randomBallIndex}`
          );

          const bubbleComponent = node.getComponent(bubblesPrefab);
          bubbleComponent.setImage(sf);
          bubbleComponent.setGridPosition(i, j);

          this.setOriginPos(node, i, j);
          newBubbles.push(node);
        }
      } else {
        for (let j = 1; j < this.gameManager.cols; j++) {
          const node = this.gameManager.getBubbleFromPool();
          const randomBallIndex = Math.floor(Math.random() * 3) + 4;
          const sf = this.gameManager.spriteAtlas.getSpriteFrame(
            `ball_${randomBallIndex}`
          );

          const bubbleComponent = node.getComponent(bubblesPrefab);
          bubbleComponent.setImage(sf);
          bubbleComponent.setGridPosition(i, j);

          this.setOriginPos(node, i, j);
          if (j === 0 || j === this.gameManager.cols)
            bubbleComponent.bubbles.node.active = false;
          newBubbles.push(node);
        }
      }
    }

    newBubbles.forEach(bubble => {
      this.gameManager.node.addChild(bubble);
      this.gameManager.bubblesArray.push(bubble);
    });

    this.gameManager.rows += numRows;
  }

  public createBubbles(i: number, j: number): void {
    const node: Node = this.gameManager.getBubbleFromPool();
    let sf = null;
    const randomBallIndex = Math.floor(Math.random() * 3) + 4;
    if (i % 2 === 0 && j === 0 && i % 2 === 0 && j === this.gameManager.cols) {
      sf = this.gameManager.spriteAtlas.getSpriteFrame(`ball_0`);
    } else {
      sf = this.gameManager.spriteAtlas.getSpriteFrame(
        `ball_${randomBallIndex}`
      );
    }

    const bubbleComponent = node.getComponent(bubblesPrefab);
    bubbleComponent.setImage(sf);
    bubbleComponent.setGridPosition(i, j);

    this.setOriginPos(node, i, j);
    this.gameManager.node.addChild(node);
    this.gameManager.bubblesArray.push(node);
  }

  public setOriginPos(node: Node, i: number, j: number): void {
    if (i % 2 == 0) {
      node.setWorldPosition(
        new Vec3(
          (j - (this.gameManager.cols - 1) / 2) * BUBBLES_SIZE,
          i * BUBBLES_SIZE * 0.85,
          1
        )
      );
    } else {
      node.setWorldPosition(
        new Vec3(
          (j - (this.gameManager.cols - 1) / 2) * BUBBLES_SIZE -
            BUBBLES_SIZE / 2,
          i * BUBBLES_SIZE * 0.85,
          1
        )
      );
      if (j === 0 || j === this.gameManager.cols) node.active = false;
    }
  }
}
