import {
  _decorator,
  BoxCollider2D,
  CircleCollider2D,
  Component,
  Contact2DType,
  EPhysics2DDrawFlags,
  instantiate,
  IPhysics2DContact,
  Label,
  Node,
  NodePool,
  PhysicsSystem2D,
  Prefab,
  tween,
  Vec3,
} from 'cc';
import { GameManager } from '../GameManager';
import { destroyBubble } from './destroyBubble';
const { ccclass, property } = _decorator;

@ccclass('tagPrefab')
export class tagPrefab extends Component {
  @property(GameManager)
  main: GameManager = null;

  @property(Prefab)
  scoreLabel: Prefab = null;

  private scorePool: NodePool = null;

  start() {
    // Initialize the score pool
    this.scorePool = new NodePool();
    // PhysicsSystem2D.instance.enable = true;
    // PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Shape;

    let collider = this.getComponent(BoxCollider2D);
    if (collider) {
      collider.sensor = true;
      collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
      collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
    }
  }
  onBeginContact(
    selfCollider: BoxCollider2D,
    otherCollider: CircleCollider2D,
    contact: IPhysics2DContact | null
  ) {
    //console.log('Sensor detected object:', this.node.name);
    this.main.score.string = (
      parseInt(this.main.score.string) +
      this.node.getComponent(BoxCollider2D).tag
    ).toString();

    const score = this.getScoreLabelFromPool().getComponent(Label);
    score.string = ('+' + this.node.getComponent(BoxCollider2D).tag).toString();
    this.node.addChild(score.node);
    tween(score.node)
      .to(0.5, { position: new Vec3(score.node.x, score.node.y + 30) })
      .call(() => {
        this.returnScoreLabelToPool(score.node);
      })
      .start();

    if (otherCollider.node && otherCollider.node.parent) {
      const comp = otherCollider.node.parent.getComponent(destroyBubble);
      if (comp) {
        comp.returnToPool(otherCollider.node);
      }
    }
  }

  onEndContact(selfCollider: BoxCollider2D, otherCollider: BoxCollider2D) {
    //console.log('Object left sensor:', this.node.name);
  }

  public getScoreLabelFromPool(): Node {
    let scoreLabel: Node;

    if (this.scorePool && this.scorePool.size() > 0) {
      scoreLabel = this.scorePool.get();
    } else {
      scoreLabel = instantiate(this.scoreLabel);
    }

    scoreLabel.active = true;
    return scoreLabel;
  }

  public returnScoreLabelToPool(scoreLabel: Node): void {
    if (!scoreLabel || !scoreLabel.isValid) return;
    scoreLabel.setPosition(0, 10, 0);
    scoreLabel.active = false;
    scoreLabel.removeFromParent();

    if (this.scorePool) {
      this.scorePool.put(scoreLabel);
    }
  }
}
