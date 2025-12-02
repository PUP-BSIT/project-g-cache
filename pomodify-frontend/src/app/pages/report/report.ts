import { CommonModule } from '@angular/common';
import { Component, signal, HostListener, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { Auth } from '../../core/services/auth';

type HelpReportFormValue = {
  search: string;
  details: string;
};

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './report.html',
  styleUrls: ['./report.scss'],
})
export class Report implements OnInit {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private auth = inject(Auth);
  private fb = inject(FormBuilder);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Reactive help/report form
  protected helpForm!: FormGroup;

  ngOnInit(): void {
    this.helpForm = this.fb.group({
      search: [
        '',
        {
          validators: [],
        },
      ],
      details: [
        '',
        {
          validators: [],
        },
      ],
    });
  }

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded) => !expanded);
  }

  onToggleTheme(): void {
    toggleTheme();
  }

  // Handle navigation icon click - expand sidebar, no bounce
  protected onNavIconClick(event: MouseEvent, route: string): void {
    // Always expand sidebar when navigating
    if (!this.sidebarExpanded()) {
      this.sidebarExpanded.set(true);
    }
    // If already on the same route, prevent navigation but keep sidebar expanded
    if (this.router.url === route) {
      event.preventDefault();
    }
  }

  // Collapse sidebar when clicking main content
  onMainContentClick(): void {
    if (this.sidebarExpanded()) {
      this.sidebarExpanded.set(false);
    }
  }

  protected onLogout(): void {
    this.auth.logout();
  }

  protected onSubmitReport(): void {
    if (this.helpForm.invalid) {
      this.helpForm.markAllAsTouched();
      return;
    }

    const { search, details } = this.helpForm.getRawValue() as HelpReportFormValue;
    console.log('Help report submitted:', { search, details });
  }

  // Profile Modal
  protected openProfileModal(): void {
    this.dialog
      .open(Profile, {
        width: '550px',
        maxWidth: '90vw',
        panelClass: 'profile-dialog',
      })
      .afterClosed()
      .subscribe((result: ProfileData) => {
        if (result) {
          console.log('Profile updated:', result);
          // TODO(Delumen, Ivan): persist profile changes to backend
        }
      });
  }
}
