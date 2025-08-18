import {
  _decorator,
  Component,
  instantiate,
  Node,
  NodePool,
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

  private bubblePool: NodePool = null;

  protected onLoad(): void {
    this.bubblePool = new NodePool();
  }

  destroyEffect(
    bubblesToDestroy: Node,
    disX: number,
    disY: number,
    sf?: SpriteFrame
  ) {
    const node = this.getFromPool();
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

  public getFromPool(): Node {
    let bubble: Node;
    if (this.bubblePool && this.bubblePool.size() > 0) {
      bubble = this.bubblePool.get();
    } else {
      bubble = instantiate(this.destroyedBubble);
    }

    bubble.active = true;
    return bubble;
  }

  public returnToPool(bubble: Node): void {
    if (!bubble || !bubble.isValid) return;
    bubble.active = false;
    bubble.removeFromParent();

    if (this.bubblePool) {
      this.bubblePool.put(bubble);
    }
  }
}
