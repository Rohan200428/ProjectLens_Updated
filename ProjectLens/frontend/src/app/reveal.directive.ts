import { AfterViewInit, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** One-time viewport reveals, with full cleanup and no scroll-driven Angular updates. */
@Directive({ selector: '[plReveal]', standalone: true })
export class RevealDirective implements AfterViewInit {
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  ngAfterViewInit() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        this.element.classList.add('revealed');
        observer.unobserve(this.element);
      }
    }, { threshold: 0.06 });
    this.element.classList.add('reveal-ready');
    observer.observe(this.element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
