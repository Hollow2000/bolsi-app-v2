import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-speed-dial-fab',
  templateUrl: './speed-dial-fab.component.html',
  styleUrl: './speed-dial-fab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeedDialFabComponent {
  readonly templatePress = output<void>();
  readonly expensePress = output<void>();
  readonly incomePress = output<void>();
  readonly transferPress = output<void>();

  protected readonly isOpen = signal(false);

  protected toggle(): void {
    this.isOpen.update((v) => !v);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected onAction(handler: () => void): void {
    this.close();
    handler();
  }
}
