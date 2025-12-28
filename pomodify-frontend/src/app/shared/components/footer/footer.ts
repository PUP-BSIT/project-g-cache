import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss'],
})
export class Footer {
  modalOpen = false;
  modalTitle = '';
  modalContent = '';

  public get year(): number {
    return new Date().getFullYear();
  }

  openModal(type: 'privacy' | 'terms' | 'cookies' | 'overview' | 'docs' | 'support' | 'release-notes' | 'about' | 'careers', e?: Event): void {
    if (e) e.preventDefault();
    this.modalOpen = true;
    this.modalTitle = this.titleFor(type);
    fetch(`assets/content/${type}.html`)
      .then((r) => (r.ok ? r.text() : Promise.reject('not found')))
      .then((t) => (this.modalContent = t))
      .catch(() => (this.modalContent = '<p>Content not available.</p>'));
    // prevent background scroll while modal is open
    document.body.classList.add('modal-open');
  }

  closeModal(): void {
    this.modalOpen = false;
    this.modalContent = '';
    document.body.classList.remove('modal-open');
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.modalOpen) {
      this.closeModal();
    }
  }

  private titleFor(type: string): string {
    switch (type) {
      case 'privacy':
        return 'Privacy Policy';
      case 'overview':
        return 'Overview';
      case 'docs':
        return 'Documentation';
      case 'support':
        return 'Support';
      case 'release-notes':
        return 'Release notes';
      case 'about':
        return 'About Pomodify';
      case 'careers':
        return 'Careers';
      case 'terms':
        return 'Terms of Service';
      case 'cookies':
        return 'Cookies';
      default:
        return '';
    }
  }
}