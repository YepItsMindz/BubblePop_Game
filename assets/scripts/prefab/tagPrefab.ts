import {
  _decorator,
  BoxCollider2D,
  CircleCollider2D,
  Component,
  Contact2DType,
  IPhysics2DContact,
  Node,
} from 'cc';
import { GameManager } from '../GameManager';
const { ccclass, property } = _decorator;

@ccclass('tagPrefab')
export class tagPrefab extends Component {
  @property(GameManager)
  main: GameManager = null;
  start() {
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
    //this.main.bubblePool.put(otherCollider.node);
    otherCollider.node.active = false;
  }

  onEndContact(selfCollider: BoxCollider2D, otherCollider: BoxCollider2D) {
    //console.log('Object left sensor:', this.node.name);
  }
}
