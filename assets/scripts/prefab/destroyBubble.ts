import {
  _decorator,
  Component,
  instantiate,
  Node,
  Prefab,
  RigidBody2D,
  Sprite,
  SpriteFrame,
  Vec2,
  Vec3,
} from 'cc';
const { ccclass, property } = _decorator;


@ccclass('destroyBubble')
export class destroyBubble extends Component {
  @property(Prefab)
  destroyedBubble: Prefab = null;

  destroyEffect(
    bubblesToDestroy: Node,
    disX: number,
    disY: number,
    sf?: SpriteFrame
  ) {
    const node: Node = instantiate(this.destroyedBubble);
    this.node.addChild(node);
    node.setWorldPosition(
      new Vec3(
        bubblesToDestroy.getWorldPosition().x,
        bubblesToDestroy.getWorldPosition().y,
        1
      )
    );

    if (sf) {
      const spriteComponent = node.getComponent(Sprite);
      if (spriteComponent) {
        spriteComponent.spriteFrame = sf;
      }
    }

    const rg = node.getComponent(RigidBody2D);
    rg.linearVelocity = new Vec2(disX, disY);
    // setTimeout(() => {
    //   node.active = false;
    // }, 2000);
  }

  update(deltaTime: number) {}
}
