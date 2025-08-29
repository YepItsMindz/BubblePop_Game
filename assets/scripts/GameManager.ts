import {
  _decorator,
  Component,
  Node,
  Prefab,
  SpriteAtlas,
  Graphics,
  Vec3,
  view,
  input,
  Input,
  Tween,
  tween,
  PhysicsSystem2D,
  Vec2,
  NodePool,
  instantiate,
  Label,
  SpriteFrame,
  RigidBody2D,
  director,
} from 'cc';
import { PreviewBubble } from './previewBubble';
import { BubbleFactory } from './BubbleFactory';
import { InputHandler } from './InputHandler';
import { BubbleAnimator } from './BubbleAnimator';
import { GraphicsRenderer } from './GraphicsRenderer';
import { BubbleDestroyer } from './BubbleDestroyer';
import { FallingBubbleManager } from './FallingBubbleManager';
import { bubblesPrefab } from './prefab/bubblesPrefab';

const { ccclass, property } = _decorator;

export const BUBBLES_SIZE = 68 * 0.625;
export const MAP_FALL_SPEED = 12; // Units per second

@ccclass('GameManager')
export class GameManager extends Component {
  @property(Prefab)
  bubbles: Prefab = null;

  @property(Node)
  predictBubble: Node = null;

  @property(SpriteAtlas)
  spriteAtlas: SpriteAtlas = null;

  @property(Node)
  destroyLayer: Node = null;

  @property(Graphics)
  graphics: Graphics = null;

  @property(Node)
  startLinePos: Node = null;

  @property(Node)
  leftWall: Node = null;

  @property(Node)
  rightWall: Node = null;

  @property(PreviewBubble)
  previewBubbleComponent: PreviewBubble = null;

  @property(Node)
  endLine: Node = null;

  @property(Node)
  minLine: Node = null;

  @property(Node)
  scoreHole: Node = null;

  @property(Label)
  score: Label = null;

  @property(SpriteFrame)
  raySf: SpriteFrame = null;

  public rows: number = 20;
  public cols: number = 13;
  public totalRows: number = 20;
  public bubblesArray: Node[] = [];
  public groupBubbles: Node[] = [];
  public bubblePool: NodePool = new NodePool();
  public path: Vec2[] = [];
  public screenSize = view.getVisibleSize();
  public lastCollider: Node = null;
  public velocity: number = 1500;

  // Game state variables
  public gameActive: boolean = true;
  public isMovingToMinLine: boolean = false;
  public shotBubbles: Set<Node> = new Set();
  public fallingBubbles: Set<Node> = new Set();
  public rowCounter: number = 1;
  public clickCooldown: boolean = false;
  public raycastActive: boolean = true;
  public currentMousePosition: Vec2 = new Vec2(0, 0);
  private raycastUpdateTimer: number = 0;
  private raycastUpdateInterval: number = 0.1;
  public predictCol: number;
  public predictRow: number;

  // Component references
  private bubbleFactory: BubbleFactory;
  private inputHandler: InputHandler;
  private bubbleAnimator: BubbleAnimator;
  private graphicsRenderer: GraphicsRenderer;
  private bubbleDestroyer: BubbleDestroyer;
  private fallingBubbleManager: FallingBubbleManager;

  protected onLoad(): void {
    this.initializeBubblePool();
    this.initializeComponents();
    this.initializeGame();
    this.setupInput();
  }

  private initializeBubblePool(): void {
    // Initialize bubble pool with some pre-instantiated bubbles
    this.bubblePool = new NodePool();

    // Create initial pool of bubbles
    const initialPoolSize = 50;
    for (let i = 0; i < initialPoolSize; i++) {
      const bubble = instantiate(this.bubbles);
      this.bubblePool.put(bubble);
    }
  }

  public getBubbleFromPool(): Node {
    let bubble: Node;

    if (this.bubblePool.size() > 0) {
      bubble = this.bubblePool.get();
    } else {
      // Pool is empty, create a new bubble
      bubble = instantiate(this.bubbles);
    }

    // Reset bubble state
    bubble.active = true;
    bubble.name = bubble.uuid;

    // Reset grid position and ensure collider is enabled
    const bubbleComponent = bubble.getComponent(bubblesPrefab);
    if (bubbleComponent) {
      bubbleComponent.setGridPosition(-1, -1, -1); // Reset to indicate not in grid yet
      bubbleComponent.enableCollider();
    }

    return bubble;
  }

  public returnBubbleToPool(bubble: Node): void {
    if (!bubble || !bubble.isValid) return;

    // Reset bubble state before returning to pool
    bubble.active = false;
    bubble.removeFromParent();

    // Reset grid position to default values
    const bubbleComponent = bubble.getComponent(bubblesPrefab);
    if (bubbleComponent) {
      bubbleComponent.setGridPosition(-1, -1, -1);
    }

    // Remove from tracking sets
    this.shotBubbles.delete(bubble);
    this.fallingBubbles.delete(bubble);

    // Remove from bubbles array
    const index = this.bubblesArray.indexOf(bubble);
    if (index > -1) {
      this.bubblesArray.splice(index, 1);
    }

    // Return to pool
    this.bubblePool.put(bubble);
  }

  public getBubblePoolSize(): number {
    return this.bubblePool.size();
  }

  private initializeComponents(): void {
    this.bubbleFactory = new BubbleFactory(this);
    this.inputHandler = new InputHandler(this);
    this.bubbleAnimator = new BubbleAnimator(this);
    this.graphicsRenderer = new GraphicsRenderer(this);
    this.bubbleDestroyer = new BubbleDestroyer(this);
    this.fallingBubbleManager = new FallingBubbleManager(this);
  }
  protected __preload(): void {
    PhysicsSystem2D.instance.enable = true;
    PhysicsSystem2D.instance.gravity = new Vec2(0, -700);
  }

  private initializeGame(): void {
    this.bubbleFactory.createMaps();
    this.graphicsRenderer.createLineNode();

    if (this.previewBubbleComponent) {
      this.previewBubbleComponent.createShootBubble();
    }
  }

  private setupInput(): void {
    input.on(
      Input.EventType.MOUSE_MOVE,
      this.inputHandler.onMouseMove.bind(this.inputHandler),
      this
    );
    input.on(
      Input.EventType.MOUSE_DOWN,
      this.inputHandler.onMouseDown.bind(this.inputHandler),
      this
    );
  }

  protected onDestroy(): void {
    input.off(
      Input.EventType.MOUSE_MOVE,
      this.inputHandler.onMouseMove.bind(this.inputHandler),
      this
    );
    input.off(
      Input.EventType.MOUSE_DOWN,
      this.inputHandler.onMouseDown.bind(this.inputHandler),
      this
    );

    Tween.stopAll();
    this.shotBubbles.clear();
    this.fallingBubbles.clear();

    // Clear the bubble pool
    this.bubblePool.clear();
  }

  public getBubbleFactory(): BubbleFactory {
    return this.bubbleFactory;
  }

  public getBubbleAnimator(): BubbleAnimator {
    return this.bubbleAnimator;
  }

  public getGraphicsRenderer(): GraphicsRenderer {
    return this.graphicsRenderer;
  }

  public getBubbleDestroyer(): BubbleDestroyer {
    return this.bubbleDestroyer;
  }

  public getFallingBubbleManager(): FallingBubbleManager {
    return this.fallingBubbleManager;
  }

  public getMinBubblePosition(): number {
    let minY = Infinity;

    this.bubblesArray.forEach(bubble => {
      if (
        bubble.active &&
        !this.shotBubbles.has(bubble) &&
        !this.fallingBubbles.has(bubble)
      ) {
        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        if (bubbleComponent && bubbleComponent.isGridBubble()) {
          const bubbleY = bubble.getWorldPosition().y;
          if (bubbleY < minY) {
            minY = bubbleY;
          }
        }
      }
    });

    return minY === Infinity ? 0 : minY;
  }

  public getMinBubbleRowIndex(): number {
    let rowY = Infinity;
    this.bubblesArray.forEach(bubble => {
      if (
        bubble.active &&
        !this.shotBubbles.has(bubble) &&
        !this.fallingBubbles.has(bubble)
      ) {
        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        if (bubbleComponent && bubbleComponent.isGridBubble()) {
          const bubbleY = bubbleComponent.getRowIndex();
          if (bubbleY < rowY) {
            rowY = bubbleY;
          }
        }
      }
    });

    return rowY === Infinity ? 0 : rowY;
  }

  public getMaxBubbleRowIndex(): number {
    let rowY = 0;
    this.bubblesArray.forEach(bubble => {
      if (
        bubble.active &&
        !this.shotBubbles.has(bubble) &&
        !this.fallingBubbles.has(bubble)
      ) {
        const bubbleComponent = bubble.getComponent(bubblesPrefab);
        if (bubbleComponent && bubbleComponent.isGridBubble()) {
          const bubbleY = bubbleComponent.getRowIndex();
          if (bubbleY > rowY) {
            rowY = bubbleY;
          }
        }
      }
    });

    return rowY;
  }

  public gridIndexToPosition(
    rowIndex: number,
    colIndex: number
  ): { posX: number; posY: number } {
    const posY = rowIndex * BUBBLES_SIZE * 0.85;
    let posX;
    if (rowIndex % 2 === 0) {
      posX = (colIndex - (this.cols - 1) / 2) * BUBBLES_SIZE;
    } else {
      posX = (colIndex - (this.cols - 1) / 2) * BUBBLES_SIZE - BUBBLES_SIZE / 2;
    }
    return { posX, posY };
  }

  public moveMapToMinLine(): void {
    if (this.isMovingToMinLine || !this.gameActive) return;

    const minBubbleY = this.getMinBubblePosition();
    const minLineY = this.minLine.getWorldPosition().y;
    const currentMapY = this.node.getPosition().y;

    const targetMapY = currentMapY + (minLineY - minBubbleY);

    this.isMovingToMinLine = true;

    tween(this.node)
      .to(0.3, {
        position: new Vec3(
          this.node.getPosition().x,
          targetMapY,
          this.node.getPosition().z
        ),
      })
      .call(() => {
        this.isMovingToMinLine = false;
      })
      .start();
  }

  public checkGameEnd(): void {
    if (!this.gameActive) return;

    const minBubbleY = this.getMinBubblePosition();
    const endLineY = this.endLine.getWorldPosition().y;

    if (minBubbleY < endLineY) {
      this.endGame();
    }
  }

  public endGame(): void {
    this.gameActive = false;
    console.log('Game Over! Bubbles reached the end line.');

    Tween.stopAll();

    input.off(
      Input.EventType.MOUSE_MOVE,
      this.inputHandler.onMouseMove.bind(this.inputHandler),
      this
    );
    input.off(
      Input.EventType.MOUSE_DOWN,
      this.inputHandler.onMouseDown.bind(this.inputHandler),
      this
    );
  }

  public restartGame(): void {
    this.gameActive = true;
    this.isMovingToMinLine = false;
    this.shotBubbles.clear();
    this.fallingBubbles.clear();
    this.rowCounter = 0;
    this.clickCooldown = false;
    this.raycastActive = true;

    input.on(
      Input.EventType.MOUSE_MOVE,
      this.inputHandler.onMouseMove.bind(this.inputHandler),
      this
    );
    input.on(
      Input.EventType.MOUSE_DOWN,
      this.inputHandler.onMouseDown.bind(this.inputHandler),
      this
    );

    console.log('Game restarted!');
  }

  private updateRaycastRealTime(): void {
    const event = {
      getUILocation: () => this.currentMousePosition,
    } as any;

    this.path.length = 0;
    this.inputHandler.createRayToMouse(event);
    this.inputHandler.predictedBubble(this.lastCollider);
  }

  update(deltaTime: number): void {
    if (!this.gameActive) return;
    //console.log(this.bubblePool);
    console.log(this.rows, this.getMinBubbleRowIndex());

    if (this.raycastActive && this.currentMousePosition) {
      this.raycastUpdateTimer += deltaTime;
      if (this.raycastUpdateTimer >= this.raycastUpdateInterval) {
        this.updateRaycastRealTime();
        this.raycastUpdateTimer = 0;
      }
    }

    if (!this.isMovingToMinLine) {
      this.node.setPosition(
        new Vec3(
          this.node.getPosition().x,
          this.node.getPosition().y - deltaTime * MAP_FALL_SPEED,
          1
        )
      );

      const minBubbleY = this.getMinBubblePosition();
      const minLineY = this.minLine.getWorldPosition().y;

      if (minBubbleY > minLineY) {
        this.moveMapToMinLine();
      }

      this.checkGameEnd();
    }
  }
}
