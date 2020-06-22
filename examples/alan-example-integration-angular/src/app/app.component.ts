import { Component } from '@angular/core';
import alanBtn from "@alan-ai/alan-sdk-web";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  alanBtnInstance;

  constructor(){
    this.alanBtnInstance = alanBtn({ 
      key: '314203787ccd9370974f1bf6b6929c1b2e956eca572e1d8b807a3e2338fdd0dc/prod'
     });
  }
}
