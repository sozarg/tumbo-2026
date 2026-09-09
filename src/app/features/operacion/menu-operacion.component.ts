import { Component, computed, input, output } from '@angular/core';
import { PerfilUsuario } from '../../core/models/usuario';
import { IonIcon } from '@ionic/angular/ion-icon';
import { AccesoSeccion, Seccion } from '../../core/navegacion/secciones';
import { NotificacionDemo, PedidoDemo, SectorProducto } from '../../core/models/demo-restaurante';

@Component({
  selector: 'tumbo-menu-operacion',
  imports: [IonIcon],
  templateUrl: './menu-operacion.component.html',
  styleUrl: './menu-operacion.component.scss',
  host: { '[class.grouped-home]': '!sector()', '[class.sector-home]': '!!sector()' },
})
export class MenuOperacion {
  readonly accesos = input.required<readonly AccesoSeccion[]>();
  readonly actividad = input.required<readonly NotificacionDemo[]>();
  readonly pedido = input.required<PedidoDemo>();
  readonly perfil = input.required<PerfilUsuario>();
  readonly seleccionar = output<Seccion>();

  protected readonly destacado = computed(() => this.accesos()[0]);
  protected readonly secundarios = computed(() => this.accesos().slice(1));
  protected readonly sector = computed<SectorProducto | undefined>(() => {
    const id = this.destacado()?.id;
    return id === 'cocina' ? 'cocina' : id === 'barra' ? 'bar' : undefined;
  });
  protected readonly tituloEstado = computed(() =>
    this.sector() === 'cocina'
      ? 'Estado de cocina'
      : this.sector() === 'bar'
        ? 'Estado de barra'
        : 'Actividad',
  );
  protected readonly pendientes = computed(() => {
    const sector = this.sector();
    const pedido = this.pedido();
    if (
      !sector ||
      !['confirmado', 'en_preparacion'].includes(pedido.estado) ||
      pedido.sectoresListos[sector]
    )
      return [];
    return pedido.items.filter((item) => item.sector === sector);
  });
  protected readonly administracion = computed(() =>
    ['dueno', 'supervisor'].includes(this.perfil()),
  );
  protected readonly tituloPrincipal = computed(() =>
    this.administracion()
      ? 'Gestión'
      : this.perfil() === 'metre'
        ? 'Recepción'
        : this.perfil() === 'mozo'
          ? 'Atención de mesas'
          : 'Tu visita',
  );
  protected readonly principales = computed(() => {
    const ids: readonly Seccion[] = this.administracion()
      ? ['personal', 'productos', 'clientes']
      : this.perfil() === 'metre'
        ? ['espera']
        : this.perfil() === 'mozo'
          ? ['pedidos']
          : ['entrada', 'menu', 'pedidos'];
    return this.buscarAccesos(ids);
  });
  protected readonly grupos = computed(() => {
    if (this.perfil() === 'mozo') {
      return [{ titulo: 'Servicio', accesos: this.buscarAccesos(['mesas', 'consulta', 'cuenta']) }];
    }
    const internos = this.administracion() || ['metre', 'mozo'].includes(this.perfil());
    const grupos: readonly { titulo: string; ids: readonly Seccion[] }[] = internos
      ? [
          { titulo: 'Operación', ids: ['pedidos', 'mesas', 'espera', 'clientes'] },
          { titulo: 'Servicio', ids: ['cocina', 'barra', 'entrada'] },
          { titulo: 'Experiencia del cliente', ids: ['menu', 'juegos', 'encuesta'] },
          { titulo: 'Seguimiento', ids: ['reportes', 'consulta', 'cuenta'] },
        ]
      : [
          { titulo: 'Atención', ids: ['consulta', 'cuenta'] },
          { titulo: 'Experiencia', ids: ['juegos', 'encuesta', 'reportes'] },
        ];
    return grupos
      .map((grupo) => ({
        titulo: grupo.titulo,
        accesos: this.buscarAccesos(grupo.ids).filter(
          (acceso) => !this.principales().includes(acceso),
        ),
      }))
      .filter((grupo) => grupo.accesos.length);
  });
  private buscarAccesos(ids: readonly Seccion[]): readonly AccesoSeccion[] {
    return ids.flatMap((id) => this.accesos().filter((acceso) => acceso.id === id));
  }
  protected descripcion(acceso: AccesoSeccion): string {
    switch (acceso.id) {
      case 'cocina':
        return 'Preparar pedidos pendientes';
      case 'barra':
        return 'Preparar bebidas pendientes';
      case 'productos':
        return `Administrar ${acceso.titulo.toLowerCase()} del menú`;
      case 'espera':
        return 'Organizar la lista de espera';
      case 'mesas':
        return 'Consultar mesas y disponibilidad';
      case 'clientes':
        return 'Registrar y consultar clientes';
      case 'pedidos':
        return 'Consultar y gestionar pedidos';
      case 'consulta':
        return 'Responder consultas de clientes';
      case 'cuenta':
        return 'Consultar cuentas y pagos';
      default:
        return '';
    }
  }
}
