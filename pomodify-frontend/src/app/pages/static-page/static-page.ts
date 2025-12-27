import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './static-page.html',
  styleUrls: ['./static-page.scss'],
})
export class StaticPage implements OnInit {
  contentHtml = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // derive slug from the current route path
    const slug = this.route.snapshot.routeConfig?.path ?? 'about';
    fetch(`assets/content/${slug}.html`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.text();
      })
      .then((t) => (this.contentHtml = t))
      .catch(() => (this.contentHtml = '<p>Content not found.</p>'));
  }
}
