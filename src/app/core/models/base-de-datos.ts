// ═══════════════════════════════════════════════════════════════════
// TUMBO · Tipos de la base de datos
//
// ARCHIVO GENERADO — no editar a mano.
// Se regenera con el CLI de Supabase, desde la raíz del proyecto:
//
//   supabase gen types typescript --linked > src/app/core/models/base-de-datos.ts
//
// Cada vez que alguien agregue o cambie una tabla, hay que volver a
// generarlo: es lo que le da tipos reales a las consultas y lo que
// evita tener que usar `any`, que AGENTS.md prohíbe.
// ═══════════════════════════════════════════════════════════════════

export type Json =
  string | number | boolean | null | { [clave: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      correos_enviados: {
        Row: {
          id: string;
          destinatario: string;
          plantilla: string;
          asunto: string;
          estado: string;
          proveedor_id: string | null;
          enviado_en: string;
        };
        Insert: {
          id?: string;
          destinatario: string;
          plantilla: string;
          asunto: string;
          estado?: string;
          proveedor_id?: string | null;
          enviado_en?: string;
        };
        Update: {
          id?: string;
          destinatario?: string;
          plantilla?: string;
          asunto?: string;
          estado?: string;
          proveedor_id?: string | null;
          enviado_en?: string;
        };
      };
      cuentas: {
        Row: {
          id: string;
          sesion_mesa_id: string;
          subtotal: number;
          descuento_pct: number;
          descuento_monto: number;
          nivel_propina: Enums<'nivel_satisfaccion'> | null;
          propina_pct: number | null;
          propina_monto: number;
          total: number;
          estado: Enums<'estado_cuenta'>;
          mozo_id: string | null;
          solicitada_en: string;
          pagada_en: string | null;
          confirmada_en: string | null;
        };
        Insert: {
          id?: string;
          sesion_mesa_id: string;
          subtotal?: number;
          descuento_pct?: number;
          descuento_monto?: number;
          nivel_propina?: Enums<'nivel_satisfaccion'> | null;
          propina_pct?: number | null;
          propina_monto?: number;
          total?: number;
          estado?: Enums<'estado_cuenta'>;
          mozo_id?: string | null;
          solicitada_en?: string;
          pagada_en?: string | null;
          confirmada_en?: string | null;
        };
        Update: {
          id?: string;
          sesion_mesa_id?: string;
          subtotal?: number;
          descuento_pct?: number;
          descuento_monto?: number;
          nivel_propina?: Enums<'nivel_satisfaccion'> | null;
          propina_pct?: number | null;
          propina_monto?: number;
          total?: number;
          estado?: Enums<'estado_cuenta'>;
          mozo_id?: string | null;
          solicitada_en?: string;
          pagada_en?: string | null;
          confirmada_en?: string | null;
        };
      };
      dispositivos_push: {
        Row: {
          id: string;
          usuario_id: string;
          token: string;
          plataforma: Enums<'plataforma_push'>;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          token: string;
          plataforma?: Enums<'plataforma_push'>;
          actualizado_en?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          token?: string;
          plataforma?: Enums<'plataforma_push'>;
          actualizado_en?: string;
        };
      };
      encuestas: {
        Row: {
          id: string;
          sesion_mesa_id: string;
          cliente_id: string;
          creado_en: string;
        };
        Insert: {
          id?: string;
          sesion_mesa_id: string;
          cliente_id: string;
          creado_en?: string;
        };
        Update: {
          id?: string;
          sesion_mesa_id?: string;
          cliente_id?: string;
          creado_en?: string;
        };
      };
      juegos: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string;
          porcentaje_descuento: number;
          activo: boolean;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion: string;
          porcentaje_descuento: number;
          activo?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          descripcion?: string;
          porcentaje_descuento?: number;
          activo?: boolean;
        };
      };
      lista_espera: {
        Row: {
          id: string;
          cliente_id: string;
          estado: Enums<'estado_espera'>;
          mesa_id: string | null;
          creado_en: string;
          asignado_en: string | null;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          estado?: Enums<'estado_espera'>;
          mesa_id?: string | null;
          creado_en?: string;
          asignado_en?: string | null;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          estado?: Enums<'estado_espera'>;
          mesa_id?: string | null;
          creado_en?: string;
          asignado_en?: string | null;
        };
      };
      mensajes: {
        Row: {
          id: string;
          sesion_mesa_id: string;
          autor_id: string;
          tipo: Enums<'tipo_mensaje'>;
          cuerpo: string;
          enviado_en: string;
        };
        Insert: {
          id?: string;
          sesion_mesa_id: string;
          autor_id: string;
          tipo: Enums<'tipo_mensaje'>;
          cuerpo: string;
          enviado_en?: string;
        };
        Update: {
          id?: string;
          sesion_mesa_id?: string;
          autor_id?: string;
          tipo?: Enums<'tipo_mensaje'>;
          cuerpo?: string;
          enviado_en?: string;
        };
      };
      mesas: {
        Row: {
          id: string;
          numero: number;
          cantidad_comensales: number;
          tipo: Enums<'tipo_mesa'>;
          estado: Enums<'estado_mesa'>;
          foto_url: string | null;
          qr_token: string;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          numero: number;
          cantidad_comensales: number;
          tipo: Enums<'tipo_mesa'>;
          estado?: Enums<'estado_mesa'>;
          foto_url?: string | null;
          qr_token?: string;
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: {
          id?: string;
          numero?: number;
          cantidad_comensales?: number;
          tipo?: Enums<'tipo_mesa'>;
          estado?: Enums<'estado_mesa'>;
          foto_url?: string | null;
          qr_token?: string;
          creado_en?: string;
          actualizado_en?: string;
        };
      };
      niveles_propina: {
        Row: {
          nivel: Enums<'nivel_satisfaccion'>;
          porcentaje: number;
          etiqueta: string;
          qr_token: string;
        };
        Insert: {
          nivel: Enums<'nivel_satisfaccion'>;
          porcentaje: number;
          etiqueta: string;
          qr_token: string;
        };
        Update: {
          nivel?: Enums<'nivel_satisfaccion'>;
          porcentaje?: number;
          etiqueta?: string;
          qr_token?: string;
        };
      };
      notificaciones: {
        Row: {
          id: string;
          usuario_id: string;
          titulo: string;
          cuerpo: string;
          datos: Json | null;
          enviada_en: string;
          leida_en: string | null;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          titulo: string;
          cuerpo: string;
          datos?: Json | null;
          enviada_en?: string;
          leida_en?: string | null;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          titulo?: string;
          cuerpo?: string;
          datos?: Json | null;
          enviada_en?: string;
          leida_en?: string | null;
        };
      };
      partidas_juego: {
        Row: {
          id: string;
          juego_id: string;
          sesion_mesa_id: string;
          cliente_id: string;
          intento: number;
          gano: boolean;
          descuento_otorgado: number;
          jugado_en: string;
        };
        Insert: {
          id?: string;
          juego_id: string;
          sesion_mesa_id: string;
          cliente_id: string;
          intento: number;
          gano: boolean;
          descuento_otorgado?: number;
          jugado_en?: string;
        };
        Update: {
          id?: string;
          juego_id?: string;
          sesion_mesa_id?: string;
          cliente_id?: string;
          intento?: number;
          gano?: boolean;
          descuento_otorgado?: number;
          jugado_en?: string;
        };
      };
      pedido_items: {
        Row: {
          id: string;
          pedido_id: string;
          producto_id: string;
          cantidad: number;
          precio_unitario: number;
          sector: Enums<'sector_preparacion'>;
          estado: Enums<'estado_item'>;
          listo_en: string | null;
        };
        Insert: {
          id?: string;
          pedido_id: string;
          producto_id: string;
          cantidad: number;
          precio_unitario: number;
          sector: Enums<'sector_preparacion'>;
          estado?: Enums<'estado_item'>;
          listo_en?: string | null;
        };
        Update: {
          id?: string;
          pedido_id?: string;
          producto_id?: string;
          cantidad?: number;
          precio_unitario?: number;
          sector?: Enums<'sector_preparacion'>;
          estado?: Enums<'estado_item'>;
          listo_en?: string | null;
        };
      };
      pedidos: {
        Row: {
          id: string;
          sesion_mesa_id: string;
          estado: Enums<'estado_pedido'>;
          mozo_id: string | null;
          motivo_rechazo: string | null;
          creado_en: string;
          enviado_en: string | null;
          confirmado_en: string | null;
          listo_en: string | null;
          entregado_en: string | null;
        };
        Insert: {
          id?: string;
          sesion_mesa_id: string;
          estado?: Enums<'estado_pedido'>;
          mozo_id?: string | null;
          motivo_rechazo?: string | null;
          creado_en?: string;
          enviado_en?: string | null;
          confirmado_en?: string | null;
          listo_en?: string | null;
          entregado_en?: string | null;
        };
        Update: {
          id?: string;
          sesion_mesa_id?: string;
          estado?: Enums<'estado_pedido'>;
          mozo_id?: string | null;
          motivo_rechazo?: string | null;
          creado_en?: string;
          enviado_en?: string | null;
          confirmado_en?: string | null;
          listo_en?: string | null;
          entregado_en?: string | null;
        };
      };
      preguntas_encuesta: {
        Row: {
          id: string;
          texto: string;
          tipo: Enums<'tipo_control'>;
          opciones: Json | null;
          minimo: number | null;
          maximo: number | null;
          orden: number;
          activa: boolean;
          requerida: boolean;
        };
        Insert: {
          id?: string;
          texto: string;
          tipo: Enums<'tipo_control'>;
          opciones?: Json | null;
          minimo?: number | null;
          maximo?: number | null;
          orden: number;
          activa?: boolean;
          requerida?: boolean;
        };
        Update: {
          id?: string;
          texto?: string;
          tipo?: Enums<'tipo_control'>;
          opciones?: Json | null;
          minimo?: number | null;
          maximo?: number | null;
          orden?: number;
          activa?: boolean;
          requerida?: boolean;
        };
      };
      producto_fotos: {
        Row: {
          id: string;
          producto_id: string;
          url: string;
          orden: number;
          creado_en: string;
        };
        Insert: {
          id?: string;
          producto_id: string;
          url: string;
          orden: number;
          creado_en?: string;
        };
        Update: {
          id?: string;
          producto_id?: string;
          url?: string;
          orden?: number;
          creado_en?: string;
        };
      };
      productos: {
        Row: {
          id: string;
          tipo: Enums<'tipo_producto'>;
          nombre: string;
          descripcion: string;
          tiempo_elaboracion_min: number;
          precio: number;
          sector: Enums<'sector_preparacion'>;
          activo: boolean;
          creado_por: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          tipo: Enums<'tipo_producto'>;
          nombre: string;
          descripcion: string;
          tiempo_elaboracion_min: number;
          precio: number;
          sector: Enums<'sector_preparacion'>;
          activo?: boolean;
          creado_por?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: {
          id?: string;
          tipo?: Enums<'tipo_producto'>;
          nombre?: string;
          descripcion?: string;
          tiempo_elaboracion_min?: number;
          precio?: number;
          sector?: Enums<'sector_preparacion'>;
          activo?: boolean;
          creado_por?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
      };
      respuestas_encuesta: {
        Row: {
          id: string;
          encuesta_id: string;
          pregunta_id: string;
          valor: Json;
        };
        Insert: {
          id?: string;
          encuesta_id: string;
          pregunta_id: string;
          valor: Json;
        };
        Update: {
          id?: string;
          encuesta_id?: string;
          pregunta_id?: string;
          valor?: Json;
        };
      };
      sesiones_mesa: {
        Row: {
          id: string;
          mesa_id: string;
          cliente_id: string;
          estado: Enums<'estado_sesion'>;
          comensales: number;
          abierta_en: string;
          cerrada_en: string | null;
        };
        Insert: {
          id?: string;
          mesa_id: string;
          cliente_id: string;
          estado?: Enums<'estado_sesion'>;
          comensales?: number;
          abierta_en?: string;
          cerrada_en?: string | null;
        };
        Update: {
          id?: string;
          mesa_id?: string;
          cliente_id?: string;
          estado?: Enums<'estado_sesion'>;
          comensales?: number;
          abierta_en?: string;
          cerrada_en?: string | null;
        };
      };
      usuarios: {
        Row: {
          id: string;
          apellidos: string | null;
          nombres: string;
          dni: string | null;
          cuil: string | null;
          correo: string | null;
          perfil: Enums<'perfil_usuario'>;
          estado: Enums<'estado_registro'>;
          foto_url: string | null;
          motivo_rechazo: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id: string;
          apellidos?: string | null;
          nombres: string;
          dni?: string | null;
          cuil?: string | null;
          correo?: string | null;
          perfil: Enums<'perfil_usuario'>;
          estado?: Enums<'estado_registro'>;
          foto_url?: string | null;
          motivo_rechazo?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: {
          id?: string;
          apellidos?: string | null;
          nombres?: string;
          dni?: string | null;
          cuil?: string | null;
          correo?: string | null;
          perfil?: Enums<'perfil_usuario'>;
          estado?: Enums<'estado_registro'>;
          foto_url?: string | null;
          motivo_rechazo?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
      };
    };
    Views: {
      accesos_rapidos: {
        Row: {
          id: string | null;
          nombres: string | null;
          apellidos: string | null;
          correo: string | null;
          perfil: Enums<'perfil_usuario'> | null;
          foto_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      calcular_cuenta: {
        Args: { p_sesion_id: string };
        Returns: {
          subtotal: number;
          descuento_pct: number;
          descuento_monto: number;
          base: number;
        }[];
      };
    };
    Enums: {
      estado_cuenta: 'pendiente' | 'pagada' | 'confirmada';
      estado_espera: 'esperando' | 'asignado' | 'eliminado';
      estado_item: 'pendiente' | 'en_preparacion' | 'listo';
      estado_mesa: 'libre' | 'ocupada';
      estado_pedido:
        | 'borrador'
        | 'pendiente_confirmacion'
        | 'rechazado'
        | 'confirmado'
        | 'en_preparacion'
        | 'listo'
        | 'entregado'
        | 'pagado';
      estado_registro: 'pendiente' | 'aprobado' | 'rechazado';
      estado_sesion: 'activa' | 'cuenta_solicitada' | 'pagada' | 'cerrada';
      nivel_satisfaccion: 'excelente' | 'muy_bueno' | 'bueno' | 'regular' | 'malo';
      perfil_usuario:
        | 'dueno'
        | 'supervisor'
        | 'metre'
        | 'mozo'
        | 'cocinero'
        | 'cantinero'
        | 'cliente_registrado'
        | 'cliente_anonimo';
      plataforma_push: 'android' | 'ios' | 'web';
      sector_preparacion: 'cocina' | 'bar';
      tipo_control:
        'radio' | 'checkbox' | 'select' | 'rango' | 'estrellas' | 'texto_largo' | 'interruptor';
      tipo_mensaje: 'consulta' | 'respuesta';
      tipo_mesa: 'vip' | 'estandar' | 'movilidad_reducida';
      tipo_producto: 'plato' | 'bebida' | 'postre';
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tablas<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Insertar<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Actualizar<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Vistas<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
