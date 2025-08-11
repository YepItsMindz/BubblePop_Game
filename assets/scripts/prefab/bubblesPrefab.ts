import { _decorator, Component, Node, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('bubblesPrefab')
export class bubblesPrefab extends Component {
  @property(Sprite)
  bubbles: Sprite = null;

  @property(Node)
  glow: Node = null;

  // Store the grid position
  public rowIndex: number = -1;
  public colIndex: number = -1;

  // Flag for invisible placeholder bubbles
  public isInvisible: boolean = false;

  setImage(sf: SpriteFrame) {
    this.bubbles.spriteFrame = sf;
  }

  setGridPosition(row: number, col: number) {
    this.rowIndex = row;
    this.colIndex = col;
  }

  getRowIndex(): number {
    return this.rowIndex;
  }

  getColIndex(): number {
    return this.colIndex;
  }

  isGridBubble(): boolean {
    return this.rowIndex >= 0 && this.colIndex >= 0;
  }

  isVisibleBubble(): boolean {
    return !this.isInvisible;
  }

  update(deltaTime: number) {}
}
