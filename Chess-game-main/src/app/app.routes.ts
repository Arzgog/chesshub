import { Routes } from '@angular/router';
import { LoginComponent } from './modules/login/login.component';
import { GameModeSelectComponent } from './modules/game-mode-select/game-mode-select.component';
import { ChessBoardComponent } from './modules/chess-board/chess-board.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'select-mode', component: GameModeSelectComponent },
  { path: 'game', component: ChessBoardComponent },
  { path: '**', redirectTo: 'login' }
];