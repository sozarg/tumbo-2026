import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import * as Phaser from 'phaser';

@Component({
  selector: 'juego-recoleccion',
  templateUrl: './juego-recoleccion.component.html',
  styleUrls: ['./juego-recoleccion.component.scss'],
})
export class JuegoRecoleccionComponent implements OnInit, OnDestroy {
  private game!: Phaser.Game;
  private router = inject(Router);
  private ngZone = inject(NgZone);
  
  protected showModal: boolean = false;
  protected showGameOverModal: boolean = false;
  protected finalScore: number = 0;

  ngOnInit() {
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
    // Inyectamos la referencia del componente de Angular a la escena de Phaser
    this.game.registry.set('angularComponent', this);
  }

  // Método que llamará Phaser al terminar el tiempo
  public finalizarPartidaDesdePhaser(scoreFinal: number) {
    this.ngZone.run(() => {
      this.finalScore = scoreFinal;
      this.showGameOverModal = true;
    });
  }

  protected pedirSalida() {
    this.showModal = true;
    const escena = this.game.scene.getScene('FrutiCatScene');
    if (escena) escena.scene.pause();
  }

  protected continuarJuego() {
    this.showModal = false;
    const escena = this.game.scene.getScene('FrutiCatScene');
    if (escena) escena.scene.resume();
  }

  protected salirAjustes() {
    this.showModal = false;
    this.showGameOverModal = false;
    this.router.navigate(['/home']); 
  }

  ngOnDestroy() {
    if (this.game) {
      this.game.registry.remove('angularComponent');
      this.game.destroy(true);
    }
  }
}

class FrutiCatScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private fruitsGroup!: Phaser.Physics.Arcade.Group;
  
  private timeLeft: number = 30;          
  private timerText!: Phaser.GameObjects.Text;
  private gameTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('FrutiCatScene');
  }

  preload() {
    this.load.image('background', 'assets/juego-recoleccion-assets/fondo.png');
    this.load.image('tumbito', 'assets/juego-recoleccion-assets/tumbito-avatar.png');
    this.load.image('tortita', 'assets/juego-recoleccion-assets/tortita.png');
    this.load.image('brocoli', 'assets/juego-recoleccion-assets/brocoli.png'); 
    this.load.image('pollo', 'assets/juego-recoleccion-assets/pollo.png');
    this.load.image('sopa', 'assets/juego-recoleccion-assets/sopa.png');
    this.load.image('pizza', 'assets/juego-recoleccion-assets/pizza.png');
  }

  create() {
    this.timeLeft = 30;
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

    // --- LÓGICA DE COLISIÓN DIFERENCIADA CON LÍMITE EN 0 ---
    this.physics.add.overlap(this.player, this.fruitsGroup, (player, object) => {
      const fruit = object as Phaser.Physics.Arcade.Sprite;
      
      if (fruit.texture.key === 'tortita' || fruit.texture.key === 'pollo' || fruit.texture.key === 'sopa' || fruit.texture.key === 'pizza') {
        this.score += 10; // Suma puntos
      } else if (fruit.texture.key === 'brocoli') {
        // Resta 10, pero nos aseguramos de que nunca baje de 0
        this.score = Math.max(0, this.score - 10); 
      }

      fruit.destroy();
      this.scoreText.setText('Puntuación: ' + this.score);
    }, undefined, this);

    // Generador de tortitas cada 1 segundo
    this.time.addEvent({
      delay: 1000,
      callback: this.spawnFruit,
      callbackScope: this,
      loop: true
    });

    // Generador de brócolis cada 0.5 segundos
    this.time.addEvent({
      delay: 500,
      callback: this.spawnBrocoli,
      callbackScope: this,
      loop: true
    });
    
    // Texto de Puntuación
    // --- Texto de Puntuación con margen seguro ---
    this.scoreText = this.add.text(60, 40, 'Puntuación: 0', {
      fontSize: '26px',
      color: '#black',
      fontStyle: 'bold',
      stroke: '#000000', // Borde negro alrededor de las letras para que se lea perfecto
      strokeThickness: 2
    });

    // --- Texto del Timer con espacio debajo del puntaje ---
    this.timerText = this.add.text(60, 80, 'Tiempo: 30s', {
      fontSize: '26px',
      color: '#380000', // Color rojizo destacado
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });

    // Temporizador de cuenta regresiva
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
    
    // Array con las 4 opciones de imágenes
    const items = ['tortita', 'pollo', 'sopa', 'pizza'];
    
    // Elegimos una al azar del array
    const texturaAleatoria = Phaser.Math.RND.pick(items);

    const fruit = this.physics.add.sprite(randomX, -50, texturaAleatoria);
    if (texturaAleatoria === 'sopa' || texturaAleatoria === 'pizza') {
      fruit.setScale(0.1);
    }
    else{
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

    // Notificamos a Angular para abrir el modal con la puntuación final
    const angularComponent = this.registry.get('angularComponent');
    if (angularComponent) {
      angularComponent.finalizarPartidaDesdePhaser(this.score);
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