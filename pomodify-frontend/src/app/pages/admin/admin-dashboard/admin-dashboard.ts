import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DeleteUserModal, DeleteUserData } from '../../../shared/components/delete-user-modal/delete-user-modal';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'],
})
export class AdminDashboard implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly adminService = inject(AdminService);

  searchQuery = '';
  isLoading = false;
  filteredUsers: AdminUser[] = [];
  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    if (!this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin']);
      return;
    }

    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  onSearch(): void {
    this.searchSubject.next(this.searchQuery);
  }

  private performSearch(query: string): void {
    if (!query.trim()) {
      this.filteredUsers = [];
      return;
    }

    this.isLoading = true;
    this.adminService.searchUsers(query).subscribe({
      next: (users) => {
        this.filteredUsers = users;
        this.isLoading = false;
      },
      error: (_err) => {
        this.filteredUsers = [];
        this.isLoading = false;
      }
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredUsers = [];
  }

  onDeleteUser(user: AdminUser): void {
    const dialogRef = this.dialog.open(DeleteUserModal, {
      width: '480px',
      data: { user } as DeleteUserData,
      panelClass: 'delete-user-dialog'
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.adminService.deleteUser(user.id).subscribe({
          next: () => {
            this.filteredUsers = this.filteredUsers.filter(u => u.id !== user.id);
          },
          error: (err) => {
            alert('Failed to delete user: ' + (err.error?.message || 'Unknown error'));
          }
        });
      }
    });
  }

  onOpenMails(): void {
    window.open('https://mail.hostinger.com/v2/auth/login', '_blank');
  }

  onLogout(): void {
    this.adminService.setLoggedIn(false);
    this.router.navigate(['/admin']);
  }
}
