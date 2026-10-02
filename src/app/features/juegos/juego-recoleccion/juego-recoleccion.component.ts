import { Component, OnInit, OnDestroy, AfterViewInit, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import * as Phaser from 'phaser';

@Component({
  selector: 'juego-recoleccion',
  templateUrl: './juego-recoleccion.component.html',
  styleUrls: ['./juego-recoleccion.component.scss'],
})
export class JuegoRecoleccionComponent implements OnInit, OnDestroy, AfterViewInit {
  private game!: Phaser.Game;
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private timeoutId: any = null; // Para controlar el timer de inicialización
  
  protected showModal: boolean = false;
  protected showGameOverModal: boolean = false;
  protected finalScore: number = 0;
  protected finalDiscount: number = 0;

  ngOnInit() {}

  ngAfterViewInit() {
    // Limpiamos cualquier canvas rezagado en el DOM por seguridad
    const container = document.getElementById('phaser-game');
    if (container) {
      container.innerHTML = '';
    }

    this.timeoutId = setTimeout(() => {
      if (this.game) {
        return; 
      }

      (window as any).currentJuegoComponent = this;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,  
        width: 480,
        height: 800,
        parent: 'phaser-game',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 400, x: 0 },
            debug: false
          }
        },
        scale: {
          mode: Phaser.Scale.ENVELOP,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [FrutiCatScene]
      };

      this.game = new Phaser.Game(config);
    }, 100);
  }

  public finalizarPartidaDesdePhaser(scoreFinal: number) {
    this.ngZone.run(() => {
      this.finalScore = scoreFinal;
      this.finalDiscount = Math.floor(scoreFinal / 10);
      this.showGameOverModal = true;
      this.cdr.detectChanges();
    });
  }

  protected pedirSalida() {
    this.showModal = true;
    const escena = this.game?.scene.getScene('FrutiCatScene');
    if (escena) escena.scene.pause();
  }

  protected continuarJuego() {
    this.showModal = false;
    const escena = this.game?.scene.getScene('FrutiCatScene');
    if (escena) escena.scene.resume();
  }

  protected salirAjustes() {
    this.cleanupAndNavigate('/operacion');
  }

  private cleanupAndNavigate(route: string) {
    this.showModal = false;
    this.showGameOverModal = false;
    
    // Cancelamos el timeout pendiente si el usuario sale rápido
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if ((window as any).currentJuegoComponent === this) {
      delete (window as any).currentJuegoComponent;
    }

    if (this.game) {
      this.game.destroy(true);
      this.game = undefined as any;
    }

    // Limpiamos el contenedor DOM de Phaser
    const container = document.getElementById('phaser-game');
    if (container) {
      container.innerHTML = '';
    }

    this.router.navigate([route]);
  }

  ngOnDestroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if ((window as any).currentJuegoComponent === this) {
      delete (window as any).currentJuegoComponent;
    }

    if (this.game) {
      this.game.destroy(true);
      this.game = undefined as any;
    }

    const container = document.getElementById('phaser-game');
    if (container) {
      container.innerHTML = '';
    }
  }
}

// --- La clase FrutiCatScene se mantiene exactamente igual ---
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

    this.physics.add.overlap(this.player, this.fruitsGroup, (player, object) => {
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
    }, undefined, this);

    this.time.addEvent({
      delay: 1000,
      callback: this.spawnFruit,
      callbackScope: this,
      loop: true
    });

    this.time.addEvent({
      delay: 500,
      callback: this.spawnBrocoli,
      callbackScope: this,
      loop: true
    });
    
    this.scoreText = this.add.text(60, 40, 'Puntuación: 0', {
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });

    this.timerText = this.add.text(60, 80, 'Tiempo: 10s', {
      fontSize: '26px',
      color: '#ff4d4d',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
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
      loop: true
    });
  }

  spawnFruit() {
    const randomX = Phaser.Math.Between(40, 440); 
    const items = ['tortita', 'pollo', 'sopa', 'pizza'];
    const texturaAleatoria = Phaser.Math.RND.pick(items);

    const fruit = this.physics.add.sprite(randomX, -50, texturaAleatoria);
    if (texturaAleatoria === 'sopa' || texturaAleatoria === 'pizza') {
      fruit.setScale(0.1);
    } else {
      fruit.setScale(0.2);
    }
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

    const angularComp = (window as any).currentJuegoComponent;
    if (angularComp) {
      angularComp.finalizarPartidaDesdePhaser(this.score);
    }
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