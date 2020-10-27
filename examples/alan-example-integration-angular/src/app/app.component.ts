import { Component } from '@angular/core';
import alanBtn from "@alan-ai/alan-sdk-web";
import { AlanButton } from '@alan-ai/alan-sdk-web/dist/AlanButton';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  alanBtnInstance: AlanButton;
  constructor() {
    // Example of the adding the Alan Button to the page
    this.alanBtnInstance = alanBtn({
      key: '314203787ccd9370974f1bf6b6929c1b2e956eca572e1d8b807a3e2338fdd0dc/prod',
      onCommand: (commandData: { command: string }) => {
        console.log(commandData);
        if (commandData.command === 'command-example') {
          document.getElementById('rocket').style.transform = 'rotate(270deg)';
        }
      }
    });
  }

  public activate() {
    this.alanBtnInstance.activate();
  }

  public activateAndPlayText() {
    this.alanBtnInstance.activate().then(() => {
      this.alanBtnInstance.playText('Hi');
    });
  }

  public deactivate() {
    this.alanBtnInstance.deactivate();
  }
}
