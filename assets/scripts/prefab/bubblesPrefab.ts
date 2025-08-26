import {
  _decorator,
  Component,
  Node,
  Sprite,
  SpriteFrame,
  Collider2D,
  Label,
} from 'cc';
import { GameManager } from '../GameManager';
const { ccclass, property } = _decorator;

@ccclass('bubblesPrefab')
export class bubblesPrefab extends Component {
  @property(Sprite)
  bubbles: Sprite = null;

  @property(Node)
  glow: Node = null;

  @property(Label)
  label: Label = null;

  // Store the grid position
  public rowIndex: number = -1;
  public colIndex: number = -1;
  public bubbleIndex: number = -1;

  // Flag for invisible placeholder bubbles
  public isInvisible: boolean = false;

  setImage(sf: SpriteFrame) {
    this.bubbles.spriteFrame = sf;
  }

  getSF() {
    return this.bubbles.spriteFrame;
  }

  setGridPosition(row: number, col: number, id: number) {
    this.rowIndex = row;
    this.colIndex = col;
    this.bubbleIndex = id;
  }

  getBubbleIndex(): number {
    return this.bubbleIndex;
  }

  getRowIndex(): number {
    return this.rowIndex;
  }

  getColIndex(): number {
    return this.colIndex;
  }

  getPosY(): number {
    const BUBBLES_SIZE = 68;
    return this.getRowIndex() * BUBBLES_SIZE * 0.85;
  }

  getPosX(): number {
    const BUBBLES_SIZE = 68;
    const main = this.node.getParent();
    if (this.getRowIndex() % 2 === 0) {
      return (
        (this.getColIndex() - (main.getComponent(GameManager).cols - 1) / 2) *
        BUBBLES_SIZE
      );
    } else {
      return (
        (this.getColIndex() - (main.getComponent(GameManager).cols - 1) / 2) *
          BUBBLES_SIZE -
        BUBBLES_SIZE / 2
      );
    }
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

  update(deltaTime: number) {
    //this.label.string = this.colIndex.toString();
  }
}
