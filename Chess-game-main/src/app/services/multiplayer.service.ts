import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

interface GameConfig {
  timerMinutes: number;
}

@Injectable({
  providedIn: 'root'
})
export class MultiplayerService {
  private startGameSubject = new Subject<GameConfig>();
  private moveSubject = new Subject<{ prevX: number; prevY: number; newX: number; newY: number; promotedPiece: any }>();
  private channelName = 'chess_multiplayer_sync';

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key === this.channelName && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.type === 'MOVE') {
            this.moveSubject.next(data.payload);
          } else if (data.type === 'START_GAME') {
            this.startGameSubject.next(data.payload || { timerMinutes: 10 });
          }
        } catch (e) {}
      }
    });
  }

  public initPeer(): Promise<string> {
    return Promise.resolve('LOCAL-ROOM-' + Math.floor(Math.random() * 1000));
  }

  public connectToPeer(remotePeerId: string, timerMinutes: number = 10): void {
    localStorage.setItem(this.channelName, JSON.stringify({
      type: 'START_GAME',
      payload: { timerMinutes },
      timestamp: Date.now()
    }));
    this.startGameSubject.next({ timerMinutes });
  }

  public forceStartGame(timerMinutes: number = 10): void {
    localStorage.setItem(this.channelName, JSON.stringify({
      type: 'START_GAME',
      payload: { timerMinutes },
      timestamp: Date.now()
    }));
    this.startGameSubject.next({ timerMinutes });
  }

  public sendMove(moveData: { prevX: number; prevY: number; newX: number; newY: number; promotedPiece: any }): void {
    localStorage.setItem(this.channelName, JSON.stringify({
      type: 'MOVE',
      payload: moveData,
      timestamp: Date.now()
    }));
  }

  public onStartGame(): Observable<GameConfig> {
    return this.startGameSubject.asObservable();
  }

  public onMove(): Observable<{ prevX: number; prevY: number; newX: number; newY: number; promotedPiece: any }> {
    return this.moveSubject.asObservable();
  }
}