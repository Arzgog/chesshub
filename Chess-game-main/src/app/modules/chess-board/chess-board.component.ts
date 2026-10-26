import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ChessBoard } from '../../chess-logic/chess-board';
import { CheckState, Color, Coords, FENChar, SafeSquares, pieceImagePaths } from '../../chess-logic/models';
import { computeBestAIMove } from '../../chess-logic/engine';
import { evaluateBoard } from '../../chess-logic/evaluation';
import { AuthService } from '../../services/auth.service';
import { MultiplayerService } from '../../services/multiplayer.service';

interface SelectedSquare {
  piece: FENChar | null;
  x?: number;
  y?: number;
}

interface MovePair {
  white: string;
  black?: string;
}

interface SavedGame {
  moveHistory: string[];
  date: string;
}

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chess-board.component.html',
  styleUrls: ['./chess-board.component.css']
})
export class ChessBoardComponent implements OnDestroy {
  public Color = Color;
  public pieceImagePaths: Record<string, string> = pieceImagePaths;

  protected chessBoard = new ChessBoard();
  public chessBoardView: (FENChar | null)[][] = this.chessBoard.chessBoardView;
  public get playerColor(): Color { return this.chessBoard.playerColor; }
  public get safeSquares(): SafeSquares { return this.chessBoard.safeSquares; }

  public get checkState(): CheckState { return this.chessBoard.checkState; }
  public get gameOverMessage(): string | undefined { return this.chessBoard.gameOverMessage; }

  private selectedSquare: SelectedSquare = { piece: null };
  private pieceSafeSquares: Coords[] = [];

  public isPromotionActive: boolean = false;
  private promotionCoords: Coords | null = null;
  private promotedPiece: FENChar | null = null;

  public selectedTimerMinutes: number = 10;
  public whiteTime: number = 10 * 60;
  public blackTime: number = 10 * 60;
  public timeOutWinnerMessage: string | null = null;
  private timerInterval: any = null;
  private isTimerRunning: boolean = false;

  public selectedStrength: number = 3;
  public isGameStarted: boolean = false;

  public moveHistory: string[] = [];
  public evalScore: number = 0;

  public isOnlineMode: boolean = false;
  public myPeerId: string = '';
  public remotePeerIdInput: string = '';
  public isConnected: boolean = false;
  public assignedRole: Color = Color.White;
  public waitingForOpponent: boolean = false;

  constructor(
    public authService: AuthService,
    private multiplayerService: MultiplayerService,
    private route: ActivatedRoute
  ) {
    this.resetClocks(this.selectedTimerMinutes);

    this.route.queryParams.subscribe(params => {
      this.isOnlineMode = params['mode'] === 'online';
      if (this.isOnlineMode) {
        this.initOnlineGame();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private async initOnlineGame(): Promise<void> {
    this.myPeerId = await this.multiplayerService.initPeer();
    
    this.multiplayerService.onStartGame().subscribe((config: any) => {
      this.isConnected = true;
      this.waitingForOpponent = false;
      this.isGameStarted = true;
      
      // Forcefully apply the host's selected time control on game start
      if (config && typeof config.timerMinutes === 'number') {
        this.selectedTimerMinutes = config.timerMinutes;
        this.resetClocks(config.timerMinutes);
      }
    });

    this.multiplayerService.onMove().subscribe(move => {
      this.chessBoard.move(move.prevX, move.prevY, move.newX, move.newY, move.promotedPiece);
      this.chessBoardView = this.chessBoard.chessBoardView;
      this.recordMove(move.prevX, move.prevY, move.newX, move.newY);
      if (!this.isTimerRunning && !this.gameOverMessage && !this.timeOutWinnerMessage) {
        this.startTimer();
      }
    });
  }

  public hostMatch(): void {
    this.assignedRole = Color.White;
    this.waitingForOpponent = true;
    this.isConnected = false;
    this.resetClocks(this.selectedTimerMinutes);
  }

  public joinMatch(): void {
    if (!this.remotePeerIdInput) {
      alert('Please enter a valid room code!');
      return;
    }
    this.assignedRole = Color.Black;
    this.waitingForOpponent = false;
    this.isConnected = true;
    this.isGameStarted = true;
    
    // Transmit join request and sync timer
    this.multiplayerService.connectToPeer(this.remotePeerIdInput, this.selectedTimerMinutes);
  }

  public bypassWaitingForDemo(): void {
    this.multiplayerService.forceStartGame(this.selectedTimerMinutes);
    this.waitingForOpponent = false;
    this.isConnected = true;
    this.isGameStarted = true;
    this.resetClocks(this.selectedTimerMinutes);
  }

  public get displayedBoardView(): (FENChar | null)[][] {
    if (this.isOnlineMode && this.assignedRole === Color.Black) {
      return this.chessBoard.chessBoardView.slice().reverse().map(row => row.slice().reverse());
    }
    return this.chessBoard.chessBoardView;
  }

  public get playerName(): string {
    return this.authService.getCurrentUser?.username || 'Player';
  }

  public windowLocationReload(): void {
    window.location.reload();
  }

  @HostListener('window:keydown', ['$event'])
  public handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 's') {
      event.preventDefault();
      this.saveGameToLocalStorage();
      return;
    }
    if (key === 's') {
      this.saveGameToLocalStorage();
    } else if (key === 'd') {
      this.downloadPGNFile();
    } else if (key === 'l') {
      this.loadGameFromLocalStorage();
    }
  }

  public get evalPercentage(): number {
    const clampedScore = Math.min(Math.max(this.evalScore, -1000), 1000);
    return 50 + (clampedScore / 20);
  }

  public get formattedEvalScore(): string {
    const pawns = (this.evalScore / 100).toFixed(1);
    return this.evalScore >= 0 ? `+${pawns}` : `${pawns}`;
  }

  public get movePairs(): MovePair[] {
    const pairs: MovePair[] = [];
    for (let i = 0; i < this.moveHistory.length; i += 2) {
      pairs.push({
        white: this.moveHistory[i],
        black: this.moveHistory[i + 1]
      });
    }
    return pairs;
  }

  public get whitePlayerLabel(): string {
    const name = this.authService.getCurrentUser?.username || 'Guest';
    if (this.isOnlineMode) {
      return this.assignedRole === Color.Black ? `Opponent (White)` : `White (${name})`;
    }
    return `White (${name})`;
  }

  public get blackPlayerLabel(): string {
    const name = this.authService.getCurrentUser?.username || 'Guest';
    if (this.isOnlineMode) {
      return this.assignedRole === Color.Black ? `Black (${name})` : `Opponent (Black)`;
    }
    return `Stockfish AI (Lvl ${this.selectedStrength})`;
  }

  public getFormattedPGN(): string {
    let pgn = '';
    for (let i = 0; i < this.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = this.moveHistory[i];
      const blackMove = this.moveHistory[i + 1] || '';
      pgn += `${moveNum}. ${whiteMove} ${blackMove}  `;
    }
    return pgn.trim();
  }

  private coordsToAlgebraic(x: number, y: number): string {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const file = files[y] || 'a';
    const rank = 8 - x;
    return `${file}${rank}`;
  }

  private recordMove(fromX: number, fromY: number, toX: number, toY: number): void {
    const fromStr = this.coordsToAlgebraic(fromX, fromY);
    const toStr = this.coordsToAlgebraic(toX, toY);
    this.moveHistory.push(`${fromStr}-${toStr}`);
    this.evalScore = evaluateBoard(this.chessBoard.chessBoardView);
  }

  public saveGameToLocalStorage(): void {
    if (this.moveHistory.length === 0) {
      alert('No moves to save yet!');
      return;
    }
    const gameData: SavedGame = {
      moveHistory: this.moveHistory,
      date: new Date().toISOString()
    };
    localStorage.setItem('chess_saved_game', JSON.stringify(gameData));
    alert('Game saved successfully!');
  }

  public loadGameFromLocalStorage(): void {
    const saved = localStorage.getItem('chess_saved_game');
    if (!saved) {
      alert('No saved game found!');
      return;
    }
    const gameData: SavedGame = JSON.parse(saved);
    alert(`Loaded game with ${gameData.moveHistory.length} moves from ${new Date(gameData.date).toLocaleDateString()}`);
  }

  public downloadPGNFile(): void {
    const content = this.getFormattedPGN();
    if (!content) {
      alert('No moves played to export!');
      return;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess_game_${Date.now()}.pgn`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  public onStrengthChange(event: Event): void {
    if (this.isGameStarted) return;
    const selectElement = event.target as HTMLSelectElement;
    this.selectedStrength = Number(selectElement.value);
  }

  public setTimeControl(minutes: number): void {
    if (this.isGameStarted) return;
    this.selectedTimerMinutes = minutes;
    this.resetClocks(minutes);
  }

  private resetClocks(minutes: number): void {
    this.stopTimer();
    this.whiteTime = minutes * 60;
    this.blackTime = minutes * 60;
    this.timeOutWinnerMessage = null;
    this.isTimerRunning = false;
  }

  private startTimer(): void {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;

    this.timerInterval = setInterval(() => {
      if (this.gameOverMessage || this.timeOutWinnerMessage) {
        this.stopTimer();
        return;
      }

      if (this.chessBoard.playerColor === Color.White) {
        this.whiteTime--;
        if (this.whiteTime <= 0) {
          this.whiteTime = 0;
          this.timeOutWinnerMessage = 'Black wins on time!';
          this.stopTimer();
        }
      } else {
        this.blackTime--;
        if (this.blackTime <= 0) {
          this.blackTime = 0;
          this.timeOutWinnerMessage = 'White wins on time!';
          this.stopTimer();
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
  }

  public get whiteTimeFormatted(): string {
    return this.formatTime(this.whiteTime);
  }

  public get blackTimeFormatted(): string {
    return this.formatTime(this.blackTime);
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  public promotionPieces(): FENChar[] {
    const activeColor = this.isOnlineMode ? this.assignedRole : this.chessBoard.playerColor;
    return activeColor === Color.White ?
      [FENChar.WhiteKnight, FENChar.WhiteBishop, FENChar.WhiteRook, FENChar.WhiteQueen] :
      [FENChar.BlackKnight, FENChar.BlackBishop, FENChar.BlackRook, FENChar.BlackQueen];
  }

  public isSquareDark(x: number, y: number): boolean {
    return ChessBoard.isSquareDark(x, y);
  }

  private toActualCoords(displayedX: number, displayedY: number): Coords {
    if (this.isOnlineMode && this.assignedRole === Color.Black) {
      return { x: 7 - displayedX, y: 7 - displayedY };
    }
    return { x: displayedX, y: displayedY };
  }

  public isSquareSelected(displayedX: number, displayedY: number): boolean {
    const actual = this.toActualCoords(displayedX, displayedY);
    if (!this.selectedSquare.piece) return false;
    return this.selectedSquare.x === actual.x && this.selectedSquare.y === actual.y;
  }

  public isSquareSafeForSelectedPiece(displayedX: number, displayedY: number): boolean {
    const actual = this.toActualCoords(displayedX, displayedY);
    return this.pieceSafeSquares.some(coords => coords.x === actual.x && coords.y === actual.y);
  }

  public isSquarePromotionSquare(displayedX: number, displayedY: number): boolean {
    const actual = this.toActualCoords(displayedX, displayedY);
    if (!this.promotionCoords) return false;
    return this.promotionCoords.x === actual.x && this.promotionCoords.y === actual.y;
  }

  public isSquareChecked(x: number, y: number): boolean {
    const actual = this.toActualCoords(x, y);
    return this.checkState.isInCheck && this.checkState.x === actual.x && this.checkState.y === actual.y;
  }

  private unmarkingPreviouslySlectedAndSafeSquares(): void {
    this.selectedSquare = { piece: null };
    this.pieceSafeSquares = [];

    if (this.isPromotionActive) {
      this.isPromotionActive = false;
      this.promotedPiece = null;
      this.promotionCoords = null;
    }
  }

  private selectingPiece(x: number, y: number): void {
    if (this.gameOverMessage !== undefined || this.timeOutWinnerMessage) return;
    const piece: FENChar | null = this.chessBoardView[x][y];
    if (!piece) return;
    if (this.isWrongPieceSelected(piece)) return;

    const isSameSquareClicked = !!this.selectedSquare.piece && this.selectedSquare.x === x && this.selectedSquare.y === y;
    this.unmarkingPreviouslySlectedAndSafeSquares();
    if (isSameSquareClicked) return;

    this.selectedSquare = { piece, x, y };
    this.pieceSafeSquares = this.safeSquares.get(x + "," + y) || [];
  }

  private placingPiece(newX: number, newY: number): void {
    if (!this.selectedSquare.piece) return;
    
    if (!this.safeSquares.get(this.selectedSquare.x + "," + this.selectedSquare.y)?.some(c => c.x === newX && c.y === newY)) {
      this.selectingPiece(newX, newY);
      return;
    }

    const isPawnSelected: boolean = this.selectedSquare.piece === FENChar.WhitePawn || this.selectedSquare.piece === FENChar.BlackPawn;
    const isPawnOnlastRank: boolean = isPawnSelected && (newX === 7 || newX === 0);
    const shouldOpenPromotionDialog: boolean = !this.isPromotionActive && isPawnOnlastRank;

    if (shouldOpenPromotionDialog) {
      this.pieceSafeSquares = [];
      this.isPromotionActive = true;
      this.promotionCoords = { x: newX, y: newY };
      return;
    }

    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX!, prevY!, newX, newY, this.promotedPiece);
  }

  protected updateBoard(prevX: number, prevY: number, newX: number, newY: number, promotedPiece: FENChar | null): void {
    this.chessBoard.move(prevX, prevY, newX, newY, promotedPiece);
    this.chessBoardView = this.chessBoard.chessBoardView;

    this.recordMove(prevX, prevY, newX, newY);
    this.unmarkingPreviouslySlectedAndSafeSquares();
    this.isGameStarted = true;

    if (this.isOnlineMode && this.isConnected) {
      this.multiplayerService.sendMove({ prevX, prevY, newX, newY, promotedPiece });
    }

    if (!this.isTimerRunning && !this.gameOverMessage && !this.timeOutWinnerMessage) {
      this.startTimer();
    }

    if (!this.isOnlineMode) {
      this.triggerAIMoveIfTurn();
    }
  }

  private triggerAIMoveIfTurn(): void {
    if (this.gameOverMessage === undefined && !this.timeOutWinnerMessage && this.chessBoard.playerColor === Color.Black) {
      const searchDepth = Math.min(this.selectedStrength, 4); 
      const thinkingTimeMs = 600 + (this.selectedStrength * 300) + Math.floor(Math.random() * 500);

      setTimeout(() => {
        try {
          const aiMove = computeBestAIMove(this.chessBoard, searchDepth);
          if (aiMove) {
            this.chessBoard.move(
              aiMove.from.x, 
              aiMove.from.y, 
              aiMove.to.x, 
              aiMove.to.y, 
              aiMove.promotion || null
            );
            this.chessBoardView = this.chessBoard.chessBoardView;
            this.recordModelMove(aiMove.from.x, aiMove.from.y, aiMove.to.x, aiMove.to.y);
          }
        } catch (err) {
          console.error('Error computing AI move:', err);
        }
      }, thinkingTimeMs);
    }
  }

  private recordModelMove(fromX: number, fromY: number, toX: number, toY: number): void {
    this.recordMove(fromX, fromY, toX, toY);
  }

  public promotePiece(piece: FENChar): void {
    if (!this.promotionCoords || !this.selectedSquare.piece) return;
    this.promotedPiece = piece;
    const { x: newX, y: newY } = this.promotionCoords;
    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX!, prevY!, newX, newY, this.promotedPiece);
  }

  public closePawnPromotionDialog(): void {
    this.unmarkingPreviouslySlectedAndSafeSquares();
  }

  public move(displayedX: number, displayedY: number): void {
    const actual = this.toActualCoords(displayedX, displayedY);

    if (this.isOnlineMode) {
      if (this.assignedRole !== this.chessBoard.playerColor) return;
    } else {
      if (this.chessBoard.playerColor === Color.Black) return;
    }

    if (this.selectedSquare.piece !== null) {
      this.placingPiece(actual.x, actual.y);
    } else {
      this.selectingPiece(actual.x, actual.y);
    }
  }

  private isWrongPieceSelected(piece: FENChar): boolean {
    const isWhitePiece = piece === piece.toUpperCase();
    const activeColor = this.isOnlineMode ? this.assignedRole : this.chessBoard.playerColor;

    if (isWhitePiece && activeColor === Color.Black) return true;
    if (!isWhitePiece && activeColor === Color.White) return true;

    return false;
  }

  private readonly pieceValues: Record<string, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
  };

  public get moveList(): ([string, string?])[] {
    return this.chessBoard.moveList;
  }

  public get playerMaterialAdvantage(): string {
    const diff = this.calculateMaterialDifference();
    if (diff > 0) return `+${diff}`;
    if (diff < 0) return `${diff}`;
    return '';
  }

  public get engineMaterialAdvantage(): string {
    const diff = -this.calculateMaterialDifference();
    if (diff > 0) return `+${diff}`;
    if (diff < 0) return `${diff}`;
    return '';
  }

  private calculateMaterialDifference(): number {
    let whiteScore = 0;
    let blackScore = 0;

    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const piece = this.chessBoardView[x][y];
        if (!piece) continue;

        const val = this.pieceValues[piece.toLowerCase()] || 0;
        if (piece === piece.toUpperCase()) {
          whiteScore += val;
        } else {
          blackScore += val;
        }
      }
    }

    return whiteScore - blackScore;
  }
}