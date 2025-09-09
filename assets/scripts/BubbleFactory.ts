import { instantiate, Node, Vec3, resources, JsonAsset, UITransform } from 'cc';
import { BUBBLES_SIZE, GameManager } from './GameManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';

export class BubbleFactory {
  private gameManager: GameManager;
  private tokenMap: { [key: string]: number } = {};
  private difficultyTokens = {
    tm: ['o'],
    nm: ['o', 'p'],
    im: ['o', 'p', 'q', 'a', 'b', 'y'],
  };
  private difficultyRanges = {
    tm: { min: 4, max: 6 },
    nm: { min: 3, max: 7 },
    im: { min: 1, max: 7 },
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
        const difficulty = 'tm'; // Start with tm difficulty
        const patterns = data[difficulty];
        const chosenPattern =
          patterns[Math.floor(Math.random() * patterns.length)];

        // Reset and generate new token mappings based on difficulty
        this.tokenMap = {};
        const range = this.difficultyRanges[difficulty];
        const tokens = this.difficultyTokens[difficulty];
        const usedValues = new Set<number>();

        // Assign random values to tokens
        for (const token of tokens) {
          let value;
          do {
            value =
              Math.floor(Math.random() * (range.max - range.min + 1)) +
              range.min;
          } while (usedValues.has(value));
          this.tokenMap[token] = value;
          usedValues.add(value);
        }

        const rows = chosenPattern.length;
        const tokenized: string[][] = [];
        for (let r = 0; r < rows; r++) {
          const line = String(chosenPattern[r]).trim();
          const tokens = line.split(/\s+/);
          tokenized.push(tokens);
        }
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
        this.gameManager.rows = rows;

        if (
          this.gameManager.getMaxBubbleRowIndex() -
            this.gameManager.getMinBubbleRowIndex() <
          this.gameManager.totalRows
        ) {
          this.addNewRowsEfficient();
        }
      }
    });
  }

  private createBubbleFromToken(i: number, j: number, tokenRaw: string) {
    const token = String(tokenRaw).trim();
    let bubbleIndex: number;

    if (token === '-') {
      const difficulty =
        this.gameManager.rows > 200
          ? 'im'
          : this.gameManager.rows > 100
            ? 'nm'
            : 'tm';
      const range = this.difficultyRanges[difficulty];
      const usedValues = Object.keys(this.tokenMap).map(
        key => this.tokenMap[key]
      );

      do {
        bubbleIndex =
          Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      } while (usedValues.indexOf(bubbleIndex) !== -1);
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

  public addNewRowsEfficient(): void {
    const startRow = 10 + this.gameManager.rows;
    resources.load('patterns/patterns', JsonAsset, (err, jsonAsset) => {
      if (!err) {
        const data = jsonAsset.json as any;
        console.log(data['nm']);

        // Choose category based on maxRows
        let chosenCategory = 'tm';
        if (this.gameManager.rows > 200) {
          chosenCategory = 'im';
        } else if (this.gameManager.rows > 100) {
          chosenCategory = 'nm';
        }

        // Reset pattern pool to force loading new patterns for the current category
        this.patternPool = null;

        console.log(
          `Using pattern category: ${chosenCategory} for row ${this.gameManager.rows}`
        );

        const proceedWithPatterns = (data: any) => {
          // Always refresh pattern pool for the current category
          const patterns = data[chosenCategory];
          this.patternPool = patterns.map((p: string[]) => {
            return p.map(line =>
              String(line || '')
                .trim()
                .split(/\s+/)
            );
          });

          // Pick a new pattern from the pool
          const idx = Math.floor(Math.random() * this.patternPool.length);
          const pattern = this.patternPool[idx];

          // Reset and generate new token mappings based on current difficulty
          this.tokenMap = {};
          const range = this.difficultyRanges[chosenCategory];
          const tokens = this.difficultyTokens[chosenCategory];
          const usedValues = new Set<number>();

          // Assign random values to tokens
          for (const token of tokens) {
            let value;
            do {
              value =
                Math.floor(Math.random() * (range.max - range.min + 1)) +
                range.min;
            } while (usedValues.has(value));
            this.tokenMap[token] = value;
            usedValues.add(value);
          }

          // Add all rows from the pattern
          let rowsAdded = 0;
          for (let row = 0; row < pattern.length; row++) {
            const tokens = pattern[row];
            const i = startRow + rowsAdded;

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
            rowsAdded++;
          }

          // Update rows count based on the pattern height
          this.gameManager.rows += pattern.length;
        };

        if (this.patternPool) {
          // we already have patterns cached — proceed synchronously
          // build a fake data object to satisfy proceedWithPatterns shape
          const dataObj: any = {};
          dataObj[chosenCategory] = this.patternPool.map(p =>
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
