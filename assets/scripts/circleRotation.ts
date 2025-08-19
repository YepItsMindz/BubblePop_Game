import { _decorator, Component, Node, tween, v3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('circleRotation')
export class circleRotation extends Component {
  protected onLoad(): void {
    tween(this.node)
      .by(10, { eulerAngles: v3(0, 0, -360) })
      .repeatForever()
      .start();
  }

  update(deltaTime: number) {}
}
