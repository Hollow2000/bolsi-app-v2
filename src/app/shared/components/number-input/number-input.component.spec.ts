import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { NumberInputComponent } from './number-input.component';

@Component({
  imports: [NumberInputComponent],
  template: `<app-number-input [(value)]="value" placeholder="0.00" />`,
})
class HostComponent {
  readonly value = signal<number>(0);
}

describe('NumberInputComponent', () => {
  it('shows an empty input when the value is 0', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(0);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('0.00');
  });

  it('shows the numeric value when the value is non-zero', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(1500.5);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('1500.5');
  });

  it('emits the parsed number when the user types digits', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '1234.50';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(1234.5);
  });

  it('emits 0 when the user clears the input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(500);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(0);
  });

  it('keeps the input empty after clearing because value is 0', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(500);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.value).toBe('');
  });
});
