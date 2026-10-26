import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserKey = 'chess_current_user';
  private usersDatabaseKey = 'chess_users_db';

  constructor(private router: Router) {}

  public get isLoggedIn(): boolean {
    return !!sessionStorage.getItem(this.currentUserKey);
  }

  public get getCurrentUser(): { username: string } | null {
    const data = sessionStorage.getItem(this.currentUserKey);
    return data ? JSON.parse(data) : null;
  }

  private async hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public async signup(username: string, age: string, password: string): Promise<boolean> {
    if (!username || !password) {
      alert('Please enter a nickname and password!');
      return false;
    }
    const users = JSON.parse(localStorage.getItem(this.usersDatabaseKey) || '[]');
    
    if (users.some((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
      alert('Username already exists!');
      return false;
    }

    const hashedPassword = await this.hashPassword(password);
    users.push({ username, age, password: hashedPassword });
    
    localStorage.setItem(this.usersDatabaseKey, JSON.stringify(users));
    return true;
  }

  public async login(username: string, password: string): Promise<boolean> {
    if (!username || !password) {
      alert('Please fill in all fields!');
      return false;
    }

    const users = JSON.parse(localStorage.getItem(this.usersDatabaseKey) || '[]');
    const hashedPassword = await this.hashPassword(password);
    
    const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase() && u.password === hashedPassword);

    if (user) {
      sessionStorage.setItem(this.currentUserKey, JSON.stringify({ 
        username: user.username, 
        passwordHash: hashedPassword 
      }));
      this.router.navigateByUrl('/select-mode');
      return true;
    } else {
      alert('Invalid username or password!');
      return false;
    }
  }

  public loginAsGuest(): void {
    sessionStorage.setItem(this.currentUserKey, JSON.stringify({ username: 'Guest Player' }));
    this.router.navigateByUrl('/select-mode');
  }

  public logout(): void {
    sessionStorage.removeItem(this.currentUserKey);
    this.router.navigateByUrl('/login');
  }
}