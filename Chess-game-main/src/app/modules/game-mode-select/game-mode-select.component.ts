import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-game-mode-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mode-container">
      <div class="mode-card">
        <h2>Welcome, {{ playerName }}! ♟️</h2>
        <p>Choose your game mode:</p>
        
        <div class="btn-group">
          <button class="mode-btn ai-btn" (click)="selectMode('ai')">
            🤖 Play vs Computer (AI)
          </button>
          
          <button class="mode-btn online-btn" (click)="selectMode('online')">
            👥 Play vs Opponent (Online)
          </button>
        </div>

        <button class="logout-link" (click)="authService.logout()">Log out</button>
      </div>
    </div>
  `,
  styles: [`
    .mode-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background-color: #0f172a; font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; box-sizing: border-box; }
    .mode-card { background-color: #1e293b; padding: 32px; border-radius: 12px; width: 100%; max-width: 380px; text-align: center; color: #fff; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.4); box-sizing: border-box; }
    h2 { color: #38bdf8; margin-top: 0; margin-bottom: 6px; }
    p { color: #94a3b8; margin-bottom: 24px; font-size: 0.95rem; }
    .btn-group { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .mode-btn { padding: 14px; font-size: 1rem; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; color: #fff; transition: background 0.2s; width: 100%; }
    .ai-btn { background-color: #0284c7; }
    .ai-btn:hover { background-color: #0369a1; }
    .online-btn { background-color: #334155; border: 1px solid #475569; }
    .online-btn:hover { background-color: #475569; }
    .logout-link { background: none; border: none; color: #f43f5e; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
    .logout-link:hover { text-decoration: underline; }
  `]
})
export class GameModeSelectComponent {
  constructor(public authService: AuthService, private router: Router) {}
  public get playerName(): string { return this.authService.getCurrentUser?.username || 'Player'; }
  public selectMode(mode: 'ai' | 'online'): void {
    if (mode === 'ai') {
      this.router.navigate(['/game'], { queryParams: { mode: 'ai' } });
    } else {
      this.router.navigate(['/game'], { queryParams: { mode: 'online' } });
    }
  }
}