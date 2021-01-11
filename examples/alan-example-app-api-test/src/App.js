import React, { useCallback, useEffect } from 'react';
import './App.css';
import alanBtn from '@alan-ai/alan-sdk-web';
import { Card, ListGroup, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

let alanBtnInstance;

function App() {

  useEffect(() => {
    alanBtnInstance = alanBtn({
      key: "203870619348b47e4d0bf347580da6fd2e956eca572e1d8b807a3e2338fdd0dc/stage"
    });
  }, []);

  const activateCb = useCallback(() => {
    alanBtnInstance.activate();
  }, []);

  const deactivateCb = useCallback(() => {
    alanBtnInstance.deactivate();
  }, []);

  const activateAndPlayTextCb = useCallback(async () => {
    await alanBtnInstance.activate();
    alanBtnInstance.playText("Nice to meet you");
  }, []);

  const callProjectApiCb = useCallback(async () => {
    alanBtnInstance.callProjectApi("sendAnswer", { answer: 'correct' }, (err, data) => {
      console.log(err, data);
    });
  }, []);

  return (
    <div className="App">
      <h1>Alan SDK Web Api Test</h1>
      <Card>
        <ListGroup variant="flush">
          <ListGroup.Item>
            <Button onClick={activateCb}>activate();</Button>
            <br />
            <br />
            <div><b>Result:</b> Alan Button will be activated.</div>
          </ListGroup.Item>
          <ListGroup.Item>
            <Button onClick={deactivateCb}>deactivate();</Button>
            <br />
            <br />
            <div><b>Result:</b> Alan Button will be deactivated.</div>
          </ListGroup.Item>
          <ListGroup.Item>
            <Button onClick={activateAndPlayTextCb}>activate(); and playText('Nice to meet you');</Button>
            <br />
            <br />
            <div><b>Result:</b> Alan Button will be activated and text will be played.</div>
          </ListGroup.Item>
          <ListGroup.Item>
            <Button onClick={callProjectApiCb}>callProjectApi();</Button>
            <br />
            <br />
            <div><b>Result:</b> Alan Button calls "callProjectApi('"sendAnswer"');" method and send there answer "correct". Activate Alan Button and ask "Am I right?". The response will be "You are right"</div>
            Alan Voice Script:
            <pre><code>{
              `
projectAPI.sendAnswer = function(p, param, callback) {
    p.userData.answer = param.answer;
    callback(null,'answer was saved');
};
 
intent("Am I right?", p => {
    let answer = p.userData.answer;
    switch (answer) {
        case "correct":
            p.play("You are right");
            break;
        case "incorrect":
            p.play("You are wrong");
            break;
        default:
            p.play("(Sorry,|) I have no data");
    }
});
              `
            }</code></pre>

          </ListGroup.Item>
        </ListGroup>
      </Card>
    </div >
  );
}

export default App;
