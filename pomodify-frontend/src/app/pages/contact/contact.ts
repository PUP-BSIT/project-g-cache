import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Header } from '../../shared/components/header/header';
import { Footer } from '../../shared/components/footer/footer';
import { ContactService, ContactRequest } from '../../core/services/contact.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Header, Footer],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class ContactPage {
  private contactService = inject(ContactService);

  contactData: ContactRequest = {
    name: '',
    email: '',
    reason: '',
    message: ''
  };

  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  formErrors = signal<{ [key: string]: string }>({});

  reasonOptions = [
    { value: 'support', label: 'Support' },
    { value: 'bug', label: 'Report a Bug' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'other', label: 'Other' }
  ];

  validateForm(): boolean {
    const errors: { [key: string]: string } = {};

    if (!this.contactData.name.trim()) {
      errors['name'] = 'Name is required';
    }

    if (!this.contactData.email.trim()) {
      errors['email'] = 'Email is required';
    } else if (!this.isValidEmail(this.contactData.email)) {
      errors['email'] = 'Please enter a valid email address';
    }

    if (!this.contactData.reason) {
      errors['reason'] = 'Please select a reason';
    }

    if (!this.contactData.message.trim()) {
      errors['message'] = 'Message is required';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  submitForm(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting.set(true);

    this.contactService.submitContactForm(this.contactData).subscribe({
      next: (response) => {
        this.successMessage.set(response.message);
        this.resetForm();
        this.isSubmitting.set(false);
      },
      error: (error) => {
        this.errorMessage.set(
          error.error?.message || 'Failed to send your message. Please try again or email us directly at contact@v2.pomodify.site'
        );
        this.isSubmitting.set(false);
      }
    });
  }

  private resetForm(): void {
    this.contactData = {
      name: '',
      email: '',
      reason: '',
      message: ''
    };
    this.formErrors.set({});
  }

  clearFieldError(field: string): void {
    const errors = this.formErrors();
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      this.formErrors.set(newErrors);
    }
  }
}
