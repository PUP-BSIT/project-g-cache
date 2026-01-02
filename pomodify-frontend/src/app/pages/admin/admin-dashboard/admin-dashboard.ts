import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DeleteUserModal, DeleteUserData } from '../../../shared/components/delete-user-modal/delete-user-modal';

export interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: Date;
}

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

  searchQuery = '';
  isLoading = false;
  filteredUsers: AdminUser[] = [];

  // Mock users for frontend demo (replace with API call later)
  private mockUsers: AdminUser[] = [
    { id: 1, firstName: 'John', lastName: 'Doe', email: 'johndoe@gmail.com', isEmailVerified: true, createdAt: new Date('2024-01-15') },
    { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'janesmith@gmail.com', isEmailVerified: true, createdAt: new Date('2024-02-20') },
    { id: 3, firstName: 'Bob', lastName: 'Johnson', email: 'bob.johnson@email.com', isEmailVerified: false, createdAt: new Date('2024-03-10') },
    { id: 4, firstName: 'Alice', lastName: 'Williams', email: 'alice.w@company.com', isEmailVerified: true, createdAt: new Date('2024-04-05') },
    { id: 5, firstName: 'Charlie', lastName: 'Brown', email: 'charlie.brown@test.com', isEmailVerified: false, createdAt: new Date('2024-05-12') },
  ];

  ngOnInit(): void {
    if (sessionStorage.getItem('adminAuth') !== 'true') {
      this.router.navigate(['/admin']);
    }
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredUsers = [];
      return;
    }

    this.isLoading = true;
    
    // Simulate API delay
    setTimeout(() => {
      const query = this.searchQuery.toLowerCase();
      this.filteredUsers = this.mockUsers.filter(user =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(query)
      );
      this.isLoading = false;
    }, 300);
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
        // Remove from mock data (replace with API call later)
        this.mockUsers = this.mockUsers.filter(u => u.id !== user.id);
        this.filteredUsers = this.filteredUsers.filter(u => u.id !== user.id);
      }
    });
  }

  onOpenMails(): void {
    window.open('https://mail.hostinger.com/v2/auth/login', '_blank');
  }

  onLogout(): void {
    sessionStorage.removeItem('adminAuth');
    this.router.navigate(['/admin']);
  }
}
