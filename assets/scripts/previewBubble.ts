import {
  _decorator,
  Component,
  instantiate,
  Node,
  Prefab,
  SpriteAtlas,
  Vec2,
  Vec3,
} from 'cc';
const { ccclass, property } = _decorator;

import { bubblesPrefab } from './prefab/bubblesPrefab';

@ccclass('PreviewBubble')
export class PreviewBubble extends Component {
  @property(Prefab)
  bubbles: Prefab = null;

  @property(SpriteAtlas)
  spriteAtlas: SpriteAtlas = null;

  @property(Node)
  startLinePos: Node = null;

  public previewBubble: Node = null;
  public nextBubbleIndex: number = 0;

  // Reference to the newPosition method from main class
  public newPosition: (nodePos: Vec2, point: Vec2) => Vec2;

  createPreviewBubble() {
    this.previewBubble = instantiate(this.bubbles);
    this.generateNextBubble();
    this.node.addChild(this.previewBubble);
    this.previewBubble.setWorldPosition(this.startLinePos.getWorldPosition());
  }

  generateNextBubble() {
    this.nextBubbleIndex = Math.floor(Math.random() * 3) + 4;
    const sf = this.spriteAtlas.getSpriteFrame(`ball_${this.nextBubbleIndex}`);
    this.previewBubble.getComponent(bubblesPrefab).setImage(sf);
  }

  start() {
    // Initialize the preview bubble when the component starts
    this.createPreviewBubble();
  }

  update(deltaTime: number) {
    // Update logic if needed
  }
}
