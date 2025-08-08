import { _decorator, Component, Node, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('bubblesPrefab')
export class bubblesPrefab extends Component {
  @property(Sprite)
  bubbles: Sprite = null;

  @property(Node)
  glow: Node = null;

  setImage(sf: SpriteFrame) {
    this.bubbles.spriteFrame = sf;
  }


  update(deltaTime: number) {}
}
