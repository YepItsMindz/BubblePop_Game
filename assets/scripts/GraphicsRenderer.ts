import { Graphics, Color, Vec2, Node, Sprite, instantiate, Vec3, NodePool } from 'cc';

export class GraphicsRenderer {
  private gameManager: any;
  private lineNodes: Node[] = [];
  private graphicPool : NodePool = new NodePool();

  constructor(gameManager: any) {
    this.gameManager = gameManager;
    this.graphicPool = new NodePool();
  }

  public createLineNode(): void {
    this.clearLineNodes();
  }

  public drawLine(startPos: Vec2, endPos: Vec2): void {
    if (!this.gameManager.raySf) {
      console.warn('No raySf SpriteFrame available for drawing line');
      return;
    }

    const direction = new Vec2(endPos.x - startPos.x, endPos.y - startPos.y);
    const length = direction.length();

    const normalizedDirection = direction.normalize();

    const dotSpacing = 30;
    const dotSize = 30;
    const numDots = Math.floor(length / dotSpacing);

    for (let i = 0; i <= numDots; i++) {
      const distance = i * dotSpacing;
      if (distance > length) break;

      const dotPos = new Vec3(
        startPos.x + normalizedDirection.x * distance,
        startPos.y + normalizedDirection.y * distance,
        0
      );

      const dotNode = new Node('DotSprite');
      const sprite = dotNode.addComponent(Sprite);
      sprite.spriteFrame = this.gameManager.raySf;

      dotNode.setPosition(dotPos);

      const spriteSize = sprite.spriteFrame.rect;
      const scale = dotSize / Math.max(spriteSize.width, spriteSize.height);
      dotNode.setScale(scale, scale, 1);

      if (this.gameManager.graphics && this.gameManager.graphics.node) {
        this.gameManager.graphics.node.addChild(dotNode);
      } else {
        this.gameManager.node.addChild(dotNode);
      }

      this.lineNodes.push(dotNode);
    }
  }

  public clearGraphics(): void {
    this.gameManager.graphics.clear();
    this.clearLineNodes();
  }

  private clearLineNodes(): void {
    this.lineNodes.forEach(node => {
      if (node && node.isValid) {
        this.graphicPool.put(node);
      }
    });
    this.lineNodes = [];
  }

  public stroke(): void {}
}
