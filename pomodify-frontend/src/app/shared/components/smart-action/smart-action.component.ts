import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
// ...existing code...

export type SmartActionMode = 'wizard' | 'quick' | 'custom' | null;

@Component({
  selector: 'app-smart-action',
  templateUrl: './smart-action.component.html',
  styleUrls: ['./smart-action.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class SmartActionComponent {
  @Output() actionSelected = new EventEmitter<SmartActionMode>();
  open = false;

  openMenu() {
    this.open = true;
  }
  closeMenu() {
    this.open = false;
  }
  select(mode: SmartActionMode) {
    this.actionSelected.emit(mode);
    this.closeMenu();
  }
}
