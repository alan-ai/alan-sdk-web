import React, { useEffect, useRef } from 'react';
import './App.css';
import alanBtn from "@alan-ai/alan-sdk-web";

function App() {
  const alanBtnContainer = useRef();
  const logoEl = useRef();

  useEffect(() => {
    alanBtn({
      key: '4d292cf043b0a2ea4d0bf347580da6fd2e956eca572e1d8b807a3e2338fdd0dc/prod',
      rootEl: alanBtnContainer.current,
      onCommand: (commandData) => {
        console.log(commandData);
        if (commandData.command === 'command-example') {
          if (logoEl.current) {
              logoEl.current.style.transform = 'rotate(180deg)';
          }
        }
      }
    });
  }, []);

  return <div className="App">
    <header className="App-header">
      <img src="https://alan.app/previews/preview.png"
        ref={logoEl}
        className="Alan-logo" alt="logo" />
      <ul>
        <li>Say: "Hi!"</li>
        <li>Say: "Execute command"</li>
      </ul>
    </header>
    <div ref={alanBtnContainer}></div>
  </div>;
}

export default App;
