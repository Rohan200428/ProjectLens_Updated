import { RevealDirective } from "../reveal.directive";
import { SkeletonComponent } from "../skeleton.component";
import { Component, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ApiService, AuthService, errorMessage } from "../core";
import { Notification } from "../models";
import { IconComponent } from "../icon.component";
@Component({
  selector: "pl-notifications",
  standalone: true,
  imports: [RevealDirective, CommonModule, RouterLink, IconComponent, SkeletonComponent],
  template: `
    <div class="page-heading">
      <div>
        <div class="eyebrow">WORKSPACE / INBOX</div>
        <h1>Notifications</h1>
        <p>Evaluation updates, trainer feedback, and your next steps.</p>
      </div>
      <span class="count-pill">{{ unread() }} unread</span>
    </div>
<div class="inbox-layout"><aside class="inbox-context" plReveal><div class="eyebrow">YOUR INBOX</div><span class="inbox-number">{{ unread() }}</span><h2>Updates<br />to act on.</h2><p>Evaluation evidence, trainer perspectives, and the next step for your idea.</p></aside><div class="inbox-main">
    <div class="notification-tabs">
      <button [class.active]="!unreadOnly()" [attr.aria-pressed]="!unreadOnly()" (click)="unreadOnly.set(false)">
        All updates <span>{{ items().length }}</span></button
      ><button [class.active]="unreadOnly()" [attr.aria-pressed]="unreadOnly()" (click)="unreadOnly.set(true)">
        Unread <span>{{ unread() }}</span></button
      ><button
        class="text-button ml-auto"
        (click)="load()"
        aria-label="Refresh notifications"
      >
        <pl-icon name="refresh" [size]="16" />Refresh
      </button>
    </div>
    @if (loading()) {
      <pl-skeleton />
    } @else if (error()) {
      <div class="error-banner mb-4" role="alert">
        {{ error()
        }}<button class="text-button ml-4" (click)="load()">Try again</button>
      </div>
    }
    @if (!loading() && !error()) {
      <section class="panel notification-list">
        @if (!visible().length) {
          <div class="empty-state">
            <span class="empty-icon"><pl-icon name="bell" [size]="28" /></span>
            <h3>You’re all caught up.</h3>
            <p>
              {{
                unreadOnly()
                  ? "There are no unread updates."
                  : "Updates will appear here as your pod’s idea moves forward."
              }}
            </p>
          </div>
        }
        @for (n of visible(); track n.id) {
          <article
            class="notification-item" plReveal
            [class.unread]="!n.read"
            animate.enter="panel-enter"
            animate.leave="toast-leave"
          >
            <span class="notification-item-icon"
              ><pl-icon
                [name]="n.title.includes('Trainer') ? 'reviews' : 'submissions'"
                [size]="20"
            /></span>
            <div>
              <div class="notification-title">
                <h3>{{ n.title }}</h3>
                @if (!n.read) {
                  <span class="unread-dot" aria-label="Unread"></span>
                }
              </div>
              <p>{{ n.message }}</p>
              <div class="notification-item-footer">
                <small>{{ n.createdAt | date: "d MMM yyyy, h:mm a" }}</small>
                @if (n.submissionId) {
                  <a
                    [routerLink]="[
                      auth.user?.role === 'TRAINER'
                        ? '/reviews'
                        : '/submissions',
                      n.submissionId,
                    ]"
                    (click)="markRead(n)"
                    >View evaluation<pl-icon name="arrow" [size]="14"
                  /></a>
                }
              </div>
            </div>
            @if (!n.read) {
              <button
                class="icon-button"
                (click)="markRead(n)"
                [disabled]="reading().has(n.id)"
                [attr.aria-label]="'Mark ' + n.title + ' as read'"
                title="Mark as read"
              >
                <pl-icon name="check" [size]="18" />
              </button>
            }
          </article>
        }
      </section>
    }
    </div></div>
  `,
})
export class NotificationsComponent {
  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  readonly items = signal<Notification[]>([]);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly unreadOnly = signal(false);
  readonly reading = signal(new Set<number>());
  readonly unread = computed(() => this.items().filter((n) => !n.read).length);
  readonly visible = computed(() =>
    this.items().filter((n) => !this.unreadOnly() || !n.read),
  );
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set("");
    this.api.notifications().subscribe({
      next: (n) => {
        this.items.set(n);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
  markRead(n: Notification) {
    if (n.read || this.reading().has(n.id)) return;
    this.reading.update((x) => new Set([...x, n.id]));
    this.api.readNotification(n.id).subscribe({
      next: (updated) => {
        this.items.update((list) =>
          list.map((x) => (x.id === updated.id ? updated : x)),
        );
        this.reading.update((x) => {
          const s = new Set(x);
          s.delete(n.id);
          return s;
        });
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.reading.update((x) => {
          const s = new Set(x);
          s.delete(n.id);
          return s;
        });
      },
    });
  }
}
