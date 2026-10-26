import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="logo-badge">♟</div>
        <h2>ChessHub</h2>

        <!-- SUCCESS NOTIFICATION BANNER -->
        <div *ngIf="signupSuccessMessage" class="success-banner">
          {{ signupSuccessMessage }}
        </div>
        
        <!-- Mode Switcher Tabs (Hidden during success redirect countdown) -->
        <div class="tab-switcher" *ngIf="!signupSuccessMessage">
          <button type="button" [class.active]="isLoginMode" (click)="isLoginMode = true">Login</button>
          <button type="button" [class.active]="!isLoginMode" (click)="isLoginMode = false">Sign Up</button>
        </div>

        <!-- LOGIN FORM -->
        <div *ngIf="isLoginMode && !signupSuccessMessage" class="input-group">
          <input type="text" [(ngModel)]="loginUsername" placeholder="Enter nickname..." />
          <input type="password" [(ngModel)]="loginPassword" placeholder="Enter password..." />
          <button type="button" class="btn primary" (click)="onLoginClick()">Login</button>
        </div>

        <!-- SIGN UP FORM -->
        <div *ngIf="!isLoginMode && !signupSuccessMessage" class="input-group">
          <input type="text" [(ngModel)]="signupUsername" placeholder="Enter nickname..." />
          <input type="number" [(ngModel)]="signupAge" placeholder="Enter age..." />
          <input type="password" [(ngModel)]="signupPassword" placeholder="Enter password..." />
          <button type="button" class="btn primary" (click)="onSignupClick()">Sign Up</button>
        </div>

        <div class="divider" *ngIf="!signupSuccessMessage">OR</div>

        <button type="button" *ngIf="!signupSuccessMessage" (click)="authService.loginAsGuest()" class="btn guest">Play as Guest</button>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex; align-items: center; justify-content: center; height: 100vh;
      background-color: #0f172a; font-family: 'Segoe UI', system-ui, sans-serif; user-select: none;
    }
    .auth-card {
      background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155;
      width: 320px; display: flex; flex-direction: column; gap: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4); color: #fff; text-align: center; box-sizing: border-box;
    }
    .logo-badge {
      font-size: 32px; margin-bottom: -4px;
      background: linear-gradient(135deg, #38bdf8, #0284c7);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .auth-card h2 { margin: 0 0 10px 0; font-size: 1.4rem; color: #f8fafc; }
    .success-banner {
      background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399;
      padding: 14px; border-radius: 6px; font-size: 0.9rem; font-weight: 500; line-height: 1.4;
    }
    .tab-switcher {
      display: flex; background: #0f172a; border-radius: 6px; padding: 3px; border: 1px solid #475569; margin-bottom: 4px;
    }
    .tab-switcher button {
      flex: 1; background: transparent; border: none; color: #94a3b8; padding: 6px;
      font-weight: 600; cursor: pointer; border-radius: 4px; font-size: 0.9rem; transition: 0.2s;
    }
    .tab-switcher button.active { background: #0284c7; color: #fff; }
    .input-group { display: flex; flex-direction: column; gap: 10px; }
    input {
      padding: 10px 14px; border-radius: 6px; border: 1px solid #475569;
      background-color: #0f172a; color: #fff; font-size: 0.95rem; outline: none; box-sizing: border-box; width: 100%;
    }
    input:focus { border-color: #38bdf8; }
    .btn {
      padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 0.95rem; transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .primary { background-color: #0284c7; color: #fff; }
    .guest { background-color: #334155; color: #f8fafc; border: 1px solid #475569; }
    .divider { color: #64748b; font-size: 0.85rem; font-weight: bold; margin: 4px 0; }
  `]
})
export class LoginComponent {
  public isLoginMode: boolean = true;
  public signupSuccessMessage: string | null = null;

  public loginUsername: string = '';
  public loginPassword: string = '';

  public signupUsername: string = '';
  public signupAge: string = '';
  public signupPassword: string = '';

  constructor(public authService: AuthService, private ngZone: NgZone) {}

  public async onSignupClick(): Promise<void> {
    const success = await this.authService.signup(this.signupUsername, this.signupAge, this.signupPassword);
    if (success) {
      this.signupSuccessMessage = '🎉 Account created successfully! Redirecting you to login...';
      
      // Clear inputs
      this.signupUsername = '';
      this.signupAge = '';
      this.signupPassword = '';

      // Wait 2 seconds, then switch to login view smoothly
      setTimeout(() => {
        this.ngZone.run(() => {
          this.signupSuccessMessage = null;
          this.isLoginMode = true;
        });
      }, 2000);
    }
  }

  public async onLoginClick(): Promise<void> {
    await this.authService.login(this.loginUsername, this.loginPassword);
  }
}