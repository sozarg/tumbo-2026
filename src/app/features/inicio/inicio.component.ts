import { NgOptimizedImage } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonChip } from '@ionic/angular/ion-chip';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  clipboardOutline,
  logOutOutline,
  peopleOutline,
  restaurantOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { SesionService } from '../../core/services/sesion.service';

interface AccionPanel {
  readonly icono: string;
  readonly titulo: string;
  readonly descripcion: string;
}

@Component({
  imports: [
    IonButton,
    IonCard,
    IonCardContent,
    IonChip,
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
  protected readonly acciones: readonly AccionPanel[] = [
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

  constructor() {
    addIcons({
      barChartOutline,
      clipboardOutline,
      logOutOutline,
      peopleOutline,
      restaurantOutline,
      sparklesOutline,
    });
  }

  ngOnInit(): void {
    if (!this.sesion.estaAutenticado()) {
      void this.router.navigate(['/ingreso'], { replaceUrl: true });
    }
  }

  /**
   * Se espera el cierre antes de navegar: la cátedra pide verificar que
   * las credenciales se borren, y si se navega sin esperar el token
   * puede seguir en el almacenamiento unos milisegundos más.
   * replaceUrl evita que el botón 'atrás' vuelva a la sesión cerrada.
   */
  protected async cerrarSesion(): Promise<void> {
    await this.autenticacion.cerrarSesion();
    await this.router.navigate(['/ingreso'], { replaceUrl: true });
  }

  protected abrirOperacion(): void {
    void this.router.navigate(['/operacion']);
  }
}
