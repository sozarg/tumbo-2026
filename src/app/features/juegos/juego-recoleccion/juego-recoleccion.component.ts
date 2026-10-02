import { Component, OnDestroy, AfterViewInit, inject, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import * as Phaser from 'phaser';
import { OperacionService } from '../../../core/services/operacion.service';
import { SesionService } from '../../../core/services/sesion.service';

/**
 * «Recolección tumbito» (punto 15), el juego de Bianucci. En la base es
 * «Memoria de la carta», el del 10 %.
 *
 * Se gana juntando `PUNTOS_PARA_GANAR` en los diez segundos. El resultado
 * va a la base con `jugar('memoria', gano)` y lo que se muestra es lo que
 * la base decidió: el descuento solo existe si gana en el primer intento
 * y si la estadía todavía no tiene otro.
 */
export const PUNTOS_PARA_GANAR = 50;

/**
 * La escena de Phaser no conoce al componente: al terminar llama a esta
 * función, que el componente registra mientras la partida está abierta.
 */
let partidaEnCurso: ((puntos: number) => void) | null = null;

@Component({
  selector: 'juego-recoleccion',
  templateUrl: './juego-recoleccion.component.html',
  styleUrls: ['./juego-recoleccion.component.scss'],
})
export class JuegoRecoleccionComponent implements AfterViewInit, OnDestroy {
  private game?: Phaser.Game;
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly operacion = inject(OperacionService);
  private readonly sesion = inject(SesionService);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  protected readonly objetivo = PUNTOS_PARA_GANAR;
  protected readonly showModal = signal(false);
  protected readonly showGameOverModal = signal(false);
  protected readonly finalScore = signal(0);
  /** Lo que se le dice al terminar: ganó con descuento, ganó sin él o no llegó. */
  protected readonly resultado = signal('');
  protected readonly guardando = signal(false);

  ngAfterViewInit(): void {
    // Solo el cliente registrado, con el pedido ya confirmado (punto 14).
    if (
      this.sesion.usuario()?.perfil !== 'cliente_registrado' ||
      !this.operacion.juegosHabilitados()
    ) {
      void this.router.navigate(['/operacion'], { replaceUrl: true });
      return;
    }

    const container = document.getElementById('phaser-game');
    if (container) container.innerHTML = '';

    this.timeoutId = setTimeout(() => {
      if (this.game) return;
      partidaEnCurso = (puntos) => this.finalizarPartida(puntos);

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 480,
        height: 800,
        parent: 'phaser-game',
        physics: {
          default: 'arcade',
          arcade: { gravity: { y: 400, x: 0 }, debug: false },
        },
        scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [FrutiCatScene],
      };
      this.game = new Phaser.Game(config);
    }, 100);
  }

  private finalizarPartida(puntos: number): void {
    this.ngZone.run(async () => {
      this.finalScore.set(puntos);
      this.showGameOverModal.set(true);
      this.guardando.set(true);
      const gano = puntos >= PUNTOS_PARA_GANAR;
      const antes = this.operacion.descuento();
      const r = await this.operacion.jugar('memoria', gano);
      this.guardando.set(false);
      this.resultado.set(
        !r.ok
          ? 'No pudimos registrar la partida. Revisá la conexión.'
          : !gano
            ? `Necesitabas ${PUNTOS_PARA_GANAR} puntos. Podés volver a jugar, pero el descuento es solo para el primer intento.`
            : r.descuento > antes
              ? `¡Ganaste! Tenés ${r.descuento} % de descuento en la cuenta.`
              : antes > 0
                ? `¡Ganaste! Ya tenías tu descuento de ${antes} %: no se acumula.`
                : 'Ganaste, pero el descuento es solo para el primer intento.',
      );
    });
  }

  protected pedirSalida(): void {
    this.showModal.set(true);
    this.game?.scene.getScene('FrutiCatScene')?.scene.pause();
  }

  protected continuarJuego(): void {
    this.showModal.set(false);
    this.game?.scene.getScene('FrutiCatScene')?.scene.resume();
  }

  protected salir(): void {
    this.showModal.set(false);
    this.showGameOverModal.set(false);
    this.limpiar();
    void this.router.navigate(['/operacion']);
  }

  private limpiar(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    partidaEnCurso = null;
    this.game?.destroy(true);
    this.game = undefined;
    const container = document.getElementById('phaser-game');
    if (container) container.innerHTML = '';
  }

  ngOnDestroy(): void {
    this.limpiar();
  }
}

// --- La escena del juego (Bianucci) ---
class FrutiCatScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private fruitsGroup!: Phaser.Physics.Arcade.Group;

  private timeLeft: number = 10;
  private timerText!: Phaser.GameObjects.Text;
  private gameTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('FrutiCatScene');
  }

  preload() {
    this.load.image('background', '/assets/juego-recoleccion-assets/fondo.png');
    this.load.image('tumbito', '/assets/juego-recoleccion-assets/tumbito-avatar.png');
    this.load.image('tortita', '/assets/juego-recoleccion-assets/tortita.png');
    this.load.image('brocoli', '/assets/juego-recoleccion-assets/brocoli.png');
    this.load.image('pollo', '/assets/juego-recoleccion-assets/pollo.png');
    this.load.image('sopa', '/assets/juego-recoleccion-assets/sopa.png');
    this.load.image('pizza', '/assets/juego-recoleccion-assets/pizza.png');
  }

  create() {
    this.timeLeft = 10;
    this.score = 0;
    this.physics.resume();

    this.add.image(240, 400, 'background');

    if (this.fruitsGroup) {
      this.fruitsGroup.clear(true, true);
    }
    this.fruitsGroup = this.physics.add.group();

    this.player = this.physics.add.sprite(240, 720, 'tumbito');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.35);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.scene.isPaused()) return;
      if (pointer.isDown) {
        this.player.x = pointer.x;
      }
    });

    this.physics.add.overlap(
      this.player,
      this.fruitsGroup,
      (player, object) => {
        const fruit = object as Phaser.Physics.Arcade.Sprite;

        if (
          fruit.texture.key === 'tortita' ||
          fruit.texture.key === 'pollo' ||
          fruit.texture.key === 'sopa' ||
          fruit.texture.key === 'pizza'
        ) {
          this.score += 10;
        } else if (fruit.texture.key === 'brocoli') {
          this.score = Math.max(0, this.score - 10);
        }

        fruit.destroy();
        this.scoreText.setText('Puntuación: ' + this.score);
      },
      undefined,
      this,
    );

    this.time.addEvent({
      delay: 1000,
      callback: this.spawnFruit,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 500,
      callback: this.spawnBrocoli,
      callbackScope: this,
      loop: true,
    });

    this.scoreText = this.add.text(60, 40, 'Puntuación: 0', {
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.timerText = this.add.text(60, 80, 'Tiempo: 10s', {
      fontSize: '26px',
      color: '#ff4d4d',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.gameTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText('Tiempo: ' + this.timeLeft + 's');

        if (this.timeLeft <= 0) {
          this.finalizarJuego();
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  spawnFruit() {
    const randomX = Phaser.Math.Between(40, 440);
    const items = ['tortita', 'pollo', 'sopa', 'pizza'];
    const texturaAleatoria = Phaser.Math.RND.pick(items);

    const fruit = this.physics.add.sprite(randomX, -50, texturaAleatoria);
    // Pizza y sopa vienen achicadas a la mitad: con 0,2 se ven igual que antes.
    fruit.setScale(0.2);
    this.fruitsGroup.add(fruit);
  }

  spawnBrocoli() {
    const randomX = Phaser.Math.Between(40, 440);
    const brocoli = this.physics.add.sprite(randomX, -50, 'brocoli');
    this.fruitsGroup.add(brocoli);
    brocoli.setScale(0.2);
  }

  private finalizarJuego() {
    if (this.gameTimer) {
      this.gameTimer.remove();
    }

    this.physics.pause();
    this.scene.pause();

    // La escena no conoce al componente de Angular: le avisa por el
    // registro de la partida en curso (ver `partidaEnCurso`).
    partidaEnCurso?.(this.score);
  }

  override update() {
    if (this.cursors) {
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-400);
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(400);
      } else {
        this.player.setVelocityX(0);
      }
    }
  }
}
