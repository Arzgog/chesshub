import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn:'root'
})
export class ChessBoardService {


  public chessBoardState$ =
  new BehaviorSubject<string>('');


}