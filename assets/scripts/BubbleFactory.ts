import { instantiate, Node, Vec3, resources, JsonAsset } from 'cc';
import { BUBBLES_SIZE } from './GameManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';

export class BubbleFactory {
  private gameManager: any;
  private tokenMap: { [key: string]: number } = {
    // common mappings — letters map to fixed colours, unknown tokens fallback to random
    o: 4,
    p: 5,
    q: 6,
    a: 1,
    b: 2,
    y: 3,
    v: 7,
  };
  // Pattern cache and current pattern state so we can finish a pattern before switching
  private patternPool: string[][][] | null = null;
  private currentPatternLines: string[][] | null = null;
  private currentPatternPos: number = 0;

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public createMaps(): void {
    resources.load('patterns/patterns', JsonAsset, (err, jsonAsset) => {
      if (!err) {
        const data = jsonAsset.json as any;
        const patterns = data['tm'];
        const chosenPattern =
          patterns[Math.floor(Math.random() * patterns.length)];

        const rows = chosenPattern.length;
        const tokenized: string[][] = [];
        for (let r = 0; r < rows; r++) {
          const line = String(chosenPattern[r]).trim();
          const tokens = line.split(/\s+/);
          tokenized.push(tokens);
        }
        this.gameManager.rows = rows;

        for (let r = 0; r < rows; r++) {
          const i = 10 + r;
          const tokens = tokenized[r];
          if (i % 2 == 0) {
            for (let j = 0; j < tokens.length; j++) {
              this.createBubbleFromToken(i, j, tokens[j]);
            }
          } else {
            for (let k = 0; k < tokens.length; k++) {
              const j = k + 1;
              this.createBubbleFromToken(i, j, tokens[k]);
            }
          }
        }
      }
    });
  }

  private createBubbleFromToken(i: number, j: number, tokenRaw: string) {
    const token = String(tokenRaw).trim();
    let bubbleIndex: number;

    if (token === '-') {
      let num = 0;
      do {
        num = Math.floor(Math.random() * 3) + 4; // random trong [4,5,6]
      } while (num === 4);
      bubbleIndex = num;
    } else if (this.tokenMap.hasOwnProperty(token)) {
      bubbleIndex = this.tokenMap[token];
    }

    const node: Node = this.gameManager.getBubbleFromPool();
    const sf = this.gameManager.spriteAtlas.getSpriteFrame(
      `ball_${bubbleIndex}`
    );
    const bubbleComponent = node.getComponent(bubblesPrefab);
    bubbleComponent.setImage(sf);
    bubbleComponent.setGridPosition(i, j, bubbleIndex);

    this.setOriginPos(node, i, j);
    this.gameManager.node.addChild(node);
    this.gameManager.bubblesArray.push(node);
  }

  public addNewRowsEfficient(numRows: number): void {
    console.log(`Adding ${numRows} new rows to the map efficiently`);

    const newBubbles: Node[] = [];
    const startRow = 10 + this.gameManager.rows;
    resources.load('patterns/patterns', JsonAsset, (err, jsonAsset) => {
      if (!err) {
        const data = jsonAsset.json as any;
        const categories = Object.keys(data);
        const chosenCategory = 'tm';
        const proceedWithPatterns = (data: any) => {
          if (!this.patternPool) {
            const patterns = data[chosenCategory];
            this.patternPool = patterns.map((p: string[]) => {
              return p.map(line =>
                String(line || '')
                  .trim()
                  .split(/\s+/)
              );
            });
          }

          // If there is no current pattern or it is finished, pick a new one from the pool
          const pickNewPattern = () => {
            if (!this.patternPool || this.patternPool.length === 0) return null;
            const idx = Math.floor(Math.random() * this.patternPool.length);
            this.currentPatternLines = this.patternPool[idx];
            this.currentPatternPos = 0;
            return this.currentPatternLines;
          };

          if (
            !this.currentPatternLines ||
            this.currentPatternPos >= (this.currentPatternLines.length || 0)
          ) {
            pickNewPattern();
          }

          // fill rows, finishing current pattern first then picking new patterns as needed
          let rowsAdded = 0;
          while (rowsAdded < numRows) {
            if (
              !this.currentPatternLines ||
              this.currentPatternLines.length === 0
            ) {
              // no valid pattern lines — fallback to random for the remaining rows
              const remaining = numRows - rowsAdded;
              for (let rr = 0; rr < remaining; rr++) {
                const i = startRow + rowsAdded + rr;
                if (i % 2 == 0) {
                  for (let j = 0; j < this.gameManager.cols; j++) {
                    const node = this.gameManager.getBubbleFromPool();
                    const randomBallIndex = Math.floor(Math.random() * 3) + 4;
                    const sf = this.gameManager.spriteAtlas.getSpriteFrame(
                      `ball_${randomBallIndex}`
                    );
                    const bubbleComponent = node.getComponent(bubblesPrefab);
                    bubbleComponent.setImage(sf);
                    bubbleComponent.setGridPosition(i, j, randomBallIndex);
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
                    bubbleComponent.setGridPosition(i, j, randomBallIndex);
                    this.setOriginPos(node, i, j);
                    if (j === 0 || j === this.gameManager.cols)
                      bubbleComponent.bubbles.node.active = false;
                    newBubbles.push(node);
                  }
                }
              }
              rowsAdded = numRows;
              break;
            }

            // take the next line from current pattern
            const tokens =
              this.currentPatternLines[this.currentPatternPos] || [];
            const i = startRow + rowsAdded;
            if (i % 2 === 0) {
              for (let j = 0; j <= tokens.length; j++)
                this.createBubbleFromToken(i, j, tokens[j]);
            } else {
              for (let k = 0; k < tokens.length; k++) {
                const j = k + 1;
                this.createBubbleFromToken(i, j, tokens[k]);
              }
            }

            rowsAdded++;
            this.currentPatternPos++;

            // if we've finished the current pattern, reset so next loop picks a new one
            if (this.currentPatternPos >= this.currentPatternLines.length) {
              this.currentPatternLines = null;
              this.currentPatternPos = 0;
            }
          }

          // If we used createBubbleFromToken directly, we must still collect the created nodes into newBubbles for parenting
          // (createBubbleFromToken already adds to gameManager.bubblesArray and node parent, but to be consistent with previous flow,
          // we won't duplicate adding here.)

          // update rows count
          this.gameManager.rows += numRows;
        };

        if (this.patternPool) {
          // we already have patterns cached — proceed synchronously
          // build a fake data object to satisfy proceedWithPatterns shape
          const dataObj: any = {};
          dataObj['tm'] = this.patternPool.map(p =>
            p.map(lineTokens => lineTokens.join(' '))
          );
          proceedWithPatterns(dataObj);
        } else {
          resources.load('patterns/patterns', JsonAsset, (err, jsonAsset) => {
            if (err) {
              console.warn(
                'Failed to load patterns for addNewRowsEfficient, using random rows',
                err
              );
              proceedWithPatterns({});
              return;
            }
            proceedWithPatterns(jsonAsset.json);
          });
        }
      }
    });
  }

  public createBubbles(i: number, j: number): void {
    const node: Node = this.gameManager.getBubbleFromPool();
    let sf = null;
    const randomBallIndex = Math.floor(Math.random() * 3) + 4;
    sf = this.gameManager.spriteAtlas.getSpriteFrame(`ball_${randomBallIndex}`);

    const bubbleComponent = node.getComponent(bubblesPrefab);
    bubbleComponent.setImage(sf);
    bubbleComponent.setGridPosition(i, j, randomBallIndex);

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
