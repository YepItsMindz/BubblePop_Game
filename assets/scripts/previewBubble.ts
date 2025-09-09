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

  @property(Node)
  curBubble: Node = null;

  @property(Node)
  preBubble: Node = null;

  public currentBubble: Node = null;
  public previewBubble: Node = null;
  public nextBubbleIndex: number = 0;
  public currentBubbleIndex: number = 0;
  public rows: number = 0;

  private getDifficultyRange(): { min: number; max: number } {
    if (this.rows > 200) {
      return { min: 1, max: 7 }; // im difficulty
    } else if (this.rows > 100) {
      return { min: 3, max: 7 }; // nm difficulty
    } else {
      return { min: 4, max: 6 }; // tm difficulty
    }
  }

  private getRandomBubbleIndex(): number {
    const range = this.getDifficultyRange();
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }

  // Reference to the newPosition method from main class
  public newPosition: (nodePos: Vec2, point: Vec2) => Vec2;

  createShootBubble() {
    if (!this.previewBubble) {
      this.currentBubble = instantiate(this.bubbles);
      this.currentBubbleIndex = this.getRandomBubbleIndex();
      const sf = this.spriteAtlas.getSpriteFrame(
        `ball_${this.currentBubbleIndex}`
      );
      this.currentBubble.getComponent(bubblesPrefab).setImage(sf);
      this.currentBubble.getComponent(bubblesPrefab).bubbleIndex =
        this.currentBubbleIndex;
      this.node.addChild(this.currentBubble);
      this.currentBubble.setWorldPosition(this.curBubble.getWorldPosition());

      this.previewBubble = instantiate(this.bubbles);
      this.nextBubbleIndex = this.getRandomBubbleIndex();
      const sf2 = this.spriteAtlas.getSpriteFrame(
        `ball_${this.nextBubbleIndex}`
      );
      this.previewBubble.getComponent(bubblesPrefab).setImage(sf2);
      this.previewBubble.getComponent(bubblesPrefab).bubbleIndex =
        this.nextBubbleIndex;
      this.node.addChild(this.previewBubble);
      this.previewBubble.setWorldPosition(this.preBubble.getWorldPosition());
    }
  }

  updateShootBubble() {
    if (this.previewBubble) {
      this.currentBubbleIndex = this.nextBubbleIndex;
      const sf = this.spriteAtlas.getSpriteFrame(
        `ball_${this.currentBubbleIndex}`
      );
      this.currentBubble.getComponent(bubblesPrefab).setImage(sf);
      this.currentBubble.getComponent(bubblesPrefab).bubbleIndex =
        this.currentBubbleIndex;

      this.nextBubbleIndex = this.getRandomBubbleIndex();
      const sf2 = this.spriteAtlas.getSpriteFrame(
        `ball_${this.nextBubbleIndex}`
      );
      this.previewBubble.getComponent(bubblesPrefab).setImage(sf2);
      this.previewBubble.getComponent(bubblesPrefab).bubbleIndex =
        this.nextBubbleIndex;
    }
  }

  switchBubble() {
    const temp = this.currentBubbleIndex;
    this.currentBubbleIndex = this.nextBubbleIndex;
    this.nextBubbleIndex = temp;

    const sf = this.spriteAtlas.getSpriteFrame(
      `ball_${this.currentBubbleIndex}`
    );
    this.currentBubble.getComponent(bubblesPrefab).setImage(sf);
    this.currentBubble.getComponent(bubblesPrefab).bubbleIndex =
      this.currentBubbleIndex;

    const sf2 = this.spriteAtlas.getSpriteFrame(`ball_${this.nextBubbleIndex}`);
    this.previewBubble.getComponent(bubblesPrefab).setImage(sf2);
    this.previewBubble.getComponent(bubblesPrefab).bubbleIndex =
      this.nextBubbleIndex;
  }

  lineBubbleBuffer() {
    this.currentBubbleIndex = 10;
    const sf = this.spriteAtlas.getSpriteFrame(
      `ball_${this.currentBubbleIndex}`
    );
    this.currentBubble.getComponent(bubblesPrefab).setImage(sf);
    this.currentBubble.getComponent(bubblesPrefab).bubbleIndex =
      this.currentBubbleIndex;
  }

  bombBuffer() {
    this.currentBubbleIndex = 9;
    const sf = this.spriteAtlas.getSpriteFrame(
      `ball_${this.currentBubbleIndex}`
    );
    this.currentBubble.getComponent(bubblesPrefab).setImage(sf);
    this.currentBubble.getComponent(bubblesPrefab).bubbleIndex =
      this.currentBubbleIndex;
  }

  rainbowBubbleBuffer() {
    this.currentBubbleIndex = 11;
    const sf = this.spriteAtlas.getSpriteFrame(
      `ball_${this.currentBubbleIndex}`
    );
    this.currentBubble.getComponent(bubblesPrefab).setImage(sf);
    this.currentBubble.getComponent(bubblesPrefab).bubbleIndex =
      this.currentBubbleIndex;
  }

  fireworkBuffer() {
    this.currentBubbleIndex = 8;
    const sf = this.spriteAtlas.getSpriteFrame(
      `ball_${this.currentBubbleIndex}`
    );
    this.currentBubble.getComponent(bubblesPrefab).setImage(sf);
    this.currentBubble.getComponent(bubblesPrefab).bubbleIndex =
      this.currentBubbleIndex;
  }

  start() {}

  update(deltaTime: number) {
    // Update logic if needed
  }
}
