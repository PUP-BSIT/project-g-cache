import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './help.html',
  styleUrls: ['./help.scss'],
})
export class HelpPage {
  private dialog = inject(MatDialog);
  
  // mimic settings page sidebar behavior
  private _expanded = signal(true);
  sidebarExpanded = this._expanded.asReadonly();
  toggleSidebar() { this._expanded.set(!this._expanded()); }

  onToggleTheme() { toggleTheme(); }

  // form state
  form = {
    query: '',
    details: '',
  };

  attachments: File[] = [];
  submitting = false;

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.attachments.push(...Array.from(input.files));
  }

  removeAttachment(index: number) {
    this.attachments.splice(index, 1);
  }

  async takeScreenshot() {
    try {
      // Use MediaDevices.getDisplayMedia for quick POC screenshot (frame grab)
      // This requires user gesture and secure context (https)
      // We'll grab one frame from the stream as an image file
      // Fallback: alert when not supported
      // @ts-ignore
      const stream = await (navigator.mediaDevices as any)?.getDisplayMedia?.({ video: true });
      if (!stream) return alert('Screen capture not supported in this context.');

      const track = stream.getVideoTracks()[0];
      const ImageCaptureCtor = (window as any).ImageCapture;
      let imageCapture: any;
      if (ImageCaptureCtor) {
        imageCapture = new ImageCaptureCtor(track);
      }

      if (imageCapture && imageCapture.grabFrame) {
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve as any, 'image/png'));
          if (blob) {
            const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
            this.attachments.push(file);
          }
        }
      } else {
        alert('Screenshot API not available; please use your OS screenshot tool and attach the file.');
      }

      track.stop();
    } catch (e) {
      console.error(e);
      alert('Unable to take a screenshot in this environment.');
    }
  }

  async recordScreen() {
    try {
      // Basic screen recording using MediaRecorder
      // Note: This needs https and user permission
      // @ts-ignore
      const stream: MediaStream = await (navigator.mediaDevices as any)?.getDisplayMedia?.({ video: true, audio: true });
      if (!stream) return alert('Screen capture not supported in this context.');

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      recorder.ondataavailable = (e) => e.data && chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' });
        this.attachments.push(file);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      const durationMs = 5000; // simple 5s capture for POC
      setTimeout(() => recorder.stop(), durationMs);
      alert('Recording started for 5 seconds; it will auto-attach.');
    } catch (e) {
      console.error(e);
      alert('Unable to record screen in this environment.');
    }
  }

  async submit() {
    if (!this.form.query || !this.form.details) {
      alert('Please fill in both the search query and full details.');
      return;
    }

    this.submitting = true;

    try {
      // TODO connect to backend endpoint if available
      // For now we log payload; replace with actual HTTP call
      const payload = {
        ...this.form,
        attachments: this.attachments.map(a => ({ name: a.name, size: a.size, type: a.type })),
        createdAt: new Date().toISOString(),
      };
      console.log('Submitting support request', payload);
      alert('Your report has been queued. Thank you!');
      this.form.query = '';
      this.form.details = '';
      this.attachments = [];
    } catch (e) {
      console.error(e);
      alert('Failed to send report. Please try again later.');
    } finally {
      this.submitting = false;
    }
  }

  // Profile Modal
  openProfileModal(): void {
    this.dialog.open(Profile, {
      width: '550px',
      maxWidth: '90vw',
      panelClass: 'profile-dialog'
    }).afterClosed().subscribe((result: ProfileData) => {
      if (result) {
        console.log('Profile updated:', result);
        // TODO: persist profile changes to backend
      }
    });
  }
}
