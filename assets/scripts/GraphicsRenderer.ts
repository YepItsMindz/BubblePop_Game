import { Graphics, Color, Vec2 } from 'cc';

export class GraphicsRenderer {
  private gameManager: any;

  constructor(gameManager: any) {
    this.gameManager = gameManager;
  }

  public createLineNode(): void {
    this.gameManager.graphics.lineWidth = 3;
    this.gameManager.graphics.strokeColor = Color.RED;
  }

  public drawLine(startPos: Vec2, endPos: Vec2): void {
    this.gameManager.graphics.moveTo(startPos.x, startPos.y);
    this.gameManager.graphics.lineTo(endPos.x, endPos.y);
  }

  public clearGraphics(): void {
    this.gameManager.graphics.clear();
  }

  public stroke(): void {
    this.gameManager.graphics.stroke();
  }
}
