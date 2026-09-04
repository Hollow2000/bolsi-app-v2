import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonDirective } from '../../shared/components/button/button.directive';

interface WelcomeItem {
  icon: string;
  title: string;
  description: string;
}

const BENEFITS: readonly WelcomeItem[] = [
  {
    icon: 'lock',
    title: 'Tus datos, privados',
    description:
      'Todo se guarda localmente en tu dispositivo. No hay cuentas ni servidores: nadie más tiene acceso a tus finanzas.',
  },
  {
    icon: 'cloud_off',
    title: 'Funciona sin internet',
    description:
      'Bolsi es una PWA. Registra gastos e ingresos aunque no tengas señal y consulta tu información al instante.',
  },
  {
    icon: 'install_mobile',
    title: 'Instálala en un toque',
    description:
      'Agrégala a la pantalla de inicio de tu celular y úsala como una app nativa, sin tiendas ni instalaciones.',
  },
];

const FEATURES: readonly WelcomeItem[] = [
  {
    icon: 'home',
    title: 'Dashboard y balance',
    description:
      'El balance del mes, la proyección de fin de mes y tus deudas en un solo vistazo, con widgets de bolsillos, pagos urgentes y estado de tarjetas.',
  },
  {
    icon: 'wallet',
    title: 'Bolsillos',
    description:
      'Reparte tu ingreso en porcentajes: vivienda, ahorro, entretenimiento. Crea tus propios bolsillos y revisa cuánto te queda en cada uno.',
  },
  {
    icon: 'shopping_cart',
    title: 'Gastos',
    description:
      'Registra gastos con categoría, bolsillo y método de pago. Valida tu saldo antes de gastar y usa plantillas para repetir tus compras frecuentes.',
  },
  {
    icon: 'trending_up',
    title: 'Ingresos',
    description:
      'Registra ingresos únicos, mensuales o quincenales. Bolsi los replica automáticamente cada mes para que tu balance siempre esté al día.',
  },
  {
    icon: 'credit_card',
    title: 'Tarjetas de crédito',
    description:
      'Configura día de corte y de pago por tarjeta. Controla tu deuda, detecta cuándo vence un pago y lleva tus compras a meses sin intereses.',
  },
  {
    icon: 'calendar_month',
    title: 'Pagos recurrentes',
    description:
      'Renta, servicios y suscripciones con frecuencia mensual, quincenal o semanal, que se replican solos y se marcan como pagados en un toque.',
  },
  {
    icon: 'pie_chart',
    title: 'Presupuestos',
    description:
      'Define presupuestos por categoría o bolsillo cada mes y sigue tu avance con barras de progreso que se replican mes a mes.',
  },
  {
    icon: 'savings',
    title: 'Ahorros',
    description:
      'Cuentas de ahorro separadas de tu balance con depósitos, retiros y rendimientos, más ahorro programado para que ahorres sin pensarlo.',
  },
  {
    icon: 'swap_horiz',
    title: 'Transferencias y reembolsos',
    description:
      'Mueve dinero entre tus cuentas y registra reembolsos que restan de tus cargos y de tu deuda facturable.',
  },
  {
    icon: 'history',
    title: 'Historial y respaldo',
    description:
      'Consulta el historial de todos tus movimientos y respalda o restaura tu información en segundos con un archivo JSON.',
  },
];

const STEPS: readonly WelcomeItem[] = [
  {
    icon: 'person',
    title: 'Cuéntanos tu nombre',
    description: 'Configura tu perfil y lista tus métodos de pago: efectivo, débito o crédito.',
  },
  {
    icon: 'trending_up',
    title: 'Registra tus ingresos',
    description: 'Agrega tus fuentes de ingreso, ya sean mensuales, quincenales o únicas.',
  },
  {
    icon: 'wallet',
    title: 'Reparte tus bolsillos',
    description: 'Distribuye tu ingreso en porcentajes y empieza a controlar tus gastos.',
  },
];

@Component({
  selector: 'app-welcome',
  imports: [ButtonDirective, RouterLink],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
  protected readonly benefits = BENEFITS;
  protected readonly features = FEATURES;
  protected readonly steps = STEPS;

  protected scrollToFeatures(section: HTMLElement): void {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}