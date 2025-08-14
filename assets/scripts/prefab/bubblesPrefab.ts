import {
  _decorator,
  Component,
  Node,
  Sprite,
  SpriteFrame,
  Collider2D,
} from 'cc';
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

  // Disable the collider when bubble is falling
  disableCollider() {
    const collider = this.node.getComponent(Collider2D);
    if (collider) {
      collider.enabled = false;
      //console.log('Bubble collider disabled for falling bubble');
    }
  }

  // Enable the collider (in case needed for reuse)
  enableCollider() {
    const collider = this.node.getComponent(Collider2D);
    if (collider) {
      collider.enabled = true;
      //console.log('Bubble collider enabled');
    }
  }

  update(deltaTime: number) {}
}
