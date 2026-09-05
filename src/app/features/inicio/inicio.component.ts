import { NgOptimizedImage } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  chatbubbleEllipsesOutline,
  clipboardOutline,
  documentTextOutline,
  gameControllerOutline,
  logOutOutline,
  peopleOutline,
  restaurantOutline,
  sparklesOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons';
import { esGerencia, esPersonal } from '../../core/models/usuario';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { SesionService } from '../../core/services/sesion.service';
import { FondoDecorativo } from '../../shared/components/fondo-decorativo/fondo-decorativo.component';

interface AccionPanel {
  readonly icono: string;
  readonly titulo: string;
  readonly descripcion: string;
}

/**
 * Las tarjetas del panel dependen del perfil.
 *
 * Antes eran cuatro fijas para todos, así que un cliente registrado veía
 * "Equipo de trabajo · Altas, perfiles y seguimiento de colaboradores",
 * que no tiene nada que ver con él. El enunciado separa con claridad lo
 * que ve el personal de lo que ve el cliente (ver el apartado "QR de
 * mesa" del trabajo práctico), y esto es lo mínimo para respetarlo sin
 * rehacer la navegación.
 */
const ACCIONES_GERENCIA: readonly AccionPanel[] = [
  {
    icono: 'restaurant-outline',
    titulo: 'Operación del salón',
    descripcion: 'Mesas, pedidos, estados y atención al cliente.',
  },
  {
    icono: 'people-outline',
    titulo: 'Equipo de trabajo',
    descripcion: 'Altas, perfiles y seguimiento de colaboradores.',
  },
  {
    icono: 'clipboard-outline',
    titulo: 'Carta y productos',
    descripcion: 'Platos, bebidas, disponibilidad y cocina.',
  },
  {
    icono: 'bar-chart-outline',
    titulo: 'Encuestas y reportes',
    descripcion: 'Valoraciones, métricas y evolución del servicio.',
  },
];

const ACCIONES_PERSONAL: readonly AccionPanel[] = [
  {
    icono: 'restaurant-outline',
    titulo: 'Operación del salón',
    descripcion: 'Mesas, pedidos, estados y atención al cliente.',
  },
  {
    icono: 'clipboard-outline',
    titulo: 'Carta y productos',
    descripcion: 'Platos, bebidas y tiempos de elaboración.',
  },
  {
    icono: 'time-outline',
    titulo: 'Estado de los pedidos',
    descripcion: 'Qué está en preparación y qué ya está listo.',
  },
  {
    icono: 'bar-chart-outline',
    titulo: 'Encuestas y reportes',
    descripcion: 'Valoraciones, métricas y evolución del servicio.',
  },
];

const ACCIONES_CLIENTE: readonly AccionPanel[] = [
  {
    icono: 'restaurant-outline',
    titulo: 'Menú y pedido',
    descripcion: 'Elegí tus platos y seguí el estado de tu pedido.',
  },
  {
    icono: 'chatbubble-ellipses-outline',
    titulo: 'Consulta al mozo',
    descripcion: 'Escribile al mozo desde tu mesa cuando lo necesites.',
  },
  {
    icono: 'game-controller-outline',
    titulo: 'Juegos y beneficios',
    descripcion: 'Jugá y ganá un descuento para tu cuenta.',
  },
  {
    icono: 'wallet-outline',
    titulo: 'Encuesta y cuenta',
    descripcion: 'Contanos cómo te fue y pedí la cuenta.',
  },
];

@Component({
  imports: [
    FondoDecorativo,
    IonButton,
    IonCard,
    IonCardContent,
    IonContent,
    IonIcon,
    NgOptimizedImage,
  ],
  selector: 'tumbo-inicio',
  styleUrl: './inicio.component.scss',
  templateUrl: './inicio.component.html',
})
export class Inicio implements OnInit {
  private readonly router = inject(Router);
  private readonly autenticacion = inject(AUTENTICACION);
  private readonly sesion = inject(SesionService);
  protected readonly usuario = this.sesion.usuario;

  protected readonly acciones = computed<readonly AccionPanel[]>(() => {
    const perfil = this.usuario()?.perfil;
    if (!perfil) {
      return ACCIONES_CLIENTE;
    }
    if (esGerencia(perfil)) {
      return ACCIONES_GERENCIA;
    }
    return esPersonal(perfil) ? ACCIONES_PERSONAL : ACCIONES_CLIENTE;
  });

  constructor() {
    addIcons({
      barChartOutline,
      chatbubbleEllipsesOutline,
      clipboardOutline,
      documentTextOutline,
      gameControllerOutline,
      logOutOutline,
      peopleOutline,
      restaurantOutline,
      sparklesOutline,
      timeOutline,
      walletOutline,
    });
  }

  ngOnInit(): void {
    if (!this.sesion.estaAutenticado()) {
      void this.router.navigate(['/ingreso'], { replaceUrl: true });
    }
  }

  protected async cerrarSesion(): Promise<void> {
    await this.autenticacion.cerrarSesion();
    await this.router.navigate(['/ingreso'], { replaceUrl: true });
  }

  protected abrirOperacion(): void {
    void this.router.navigate(['/operacion']);
  }
}
