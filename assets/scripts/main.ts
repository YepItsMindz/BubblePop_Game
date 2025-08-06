import { _decorator, Component, instantiate, Node, Prefab, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

export const BUBBLES_SIZE = 65;
@ccclass('main')
export class main extends Component {
  @property(Prefab)
  bubbles: Prefab = null;

  protected onLoad(): void {
    for (let i = 1; i <= 10; i++) {
      for (let j = 1; j <= 10; j++) {
        const node: Node = instantiate(this.bubbles);
        if (j % 2 == 0)
          node.setWorldPosition(
            new Vec3(i * BUBBLES_SIZE, j * BUBBLES_SIZE, 1)
          );
        else {
          node.setWorldPosition(
            new Vec3(i * BUBBLES_SIZE, (j * BUBBLES_SIZE) / 2, 1)
          );
        }
        this.node.addChild(node);
      }
    }
  }

  update(deltaTime: number) {}
}
