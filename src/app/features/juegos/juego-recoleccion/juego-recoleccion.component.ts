import { Component, OnInit, OnDestroy } from '@angular/core';
import * as Phaser from 'phaser';

@Component({
  selector: 'app-juego-recoleccion',
  templateUrl: './juego-recoleccion.component.html',
  styleUrls: ['./juego-recoleccion.component.scss']
})
export class JuegoRecoleccionComponent implements OnInit, OnDestroy {
  private game!: Phaser.Game;

  ngOnInit() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      // Dimensiones adaptadas comúnmente a pantallas verticales de móviles
      width: 360,
      height: 640,
      parent: 'phaser-game-container',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 300, x: 0 }, // Gravedad para las frutas/bombas
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: {
        preload: this.preload,
        create: this.create,
        update: this.update
      }
    };

    this.game = new Phaser.Game(config);
  }

  preload() {
    // 1. Carga aquí tus imágenes guardadas en src/assets/
    // Ejemplo:
    // this.load.image('fondo', 'assets/images/fondo.png');
    // this.load.image('gatito', 'assets/images/cat.png');
    // this.load.image('fruta', 'assets/images/fruit.png');
    // this.load.image('bomba', 'assets/images/bomb.png');
  }

  create() {
    // 2. Inicializa elementos en pantalla:
    // - Fondo de pantalla
    // - Tu personaje (el gato) con físicas estáticas o controladas por toque/mouse
    // - Grupos de objetos (frutas y bombas)
    // - Textos de puntuación
  }

  update(time: number, delta: number) {
    // 3. Lógica que corre en cada frame (60 veces por segundo):
    // - Detectar si el usuario está arrastrando el dedo para mover al gato
    // - Controlar las colisiones entre el gato y las frutas/bombas
  }

  ngOnDestroy() {
    // MUY IMPORTANTE: Cuando el usuario sale de este componente en Angular,
    // destruimos la instancia de Phaser para liberar la memoria RAM y evitar bugs de renderizado.
    if (this.game) {
      this.game.destroy(true);
    }
  }
}