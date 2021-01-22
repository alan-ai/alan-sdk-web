import { Injectable } from '@angular/core';
import alanBtn from '@alan-ai/alan-sdk-web';
import { AlanButton } from '@alan-ai/alan-sdk-web/dist/AlanButton';
import { Subject } from 'rxjs';


export interface AlanCommand {
  command: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AlanService {

  public onCommand: Subject<AlanCommand> = new Subject();

  private alanBtnInstance: AlanButton = alanBtn({
    key: '07a1032a89d2ecea4d0bf347580da6fd2e956eca572e1d8b807a3e2338fdd0dc/prod',
    onCommand: (commandData: AlanCommand) => {
      console.log(commandData);
      this.onCommand.next(commandData);
    }
  });
}
