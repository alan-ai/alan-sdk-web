
# Alan Web SDK

[Alan Platform](https://alan.app/) • [Alan Studio](https://studio.alan.app/register) • [Docs](https://alan.app/docs/intro.html) • [FAQ](https://alan.app/docs/additional/faq.html) •
[Blog](https://alan.app/blog/) • [Twitter](https://twitter.com/alanvoiceai)

[![npm](https://img.shields.io/npm/v/@alan-ai/alan-sdk-web.svg)](https://www.npmjs.com/package/@alan-ai/alan-sdk-web)
[![npm](https://img.shields.io/npm/l/@alan-ai/alan-sdk-web.svg)]()

A lightweight JavaScript library for adding a voice experience to your website or web application. Check out our [demo](https://alan-ai.github.io/alan-sdk-web/).

Create a voice script for your application in [Alan Studio](https://studio.alan.app/register) and then add it to your app.

## Getting started

1.Install `@alan-ai/alan-sdk-web` using [npm](https://www.npmjs.com/package/@alan-ai/alan-sdk-web).

```js
npm install @alan-ai/alan-sdk-web --save
```

2.Import `alanBtn` function from the `@alan-ai/alan-sdk-web` package and add the Alan Button to the page:

```js
import alanBtn from "@alan-ai/alan-sdk-web";

alanBtn({
   key: "e3018cc76639126f974f1bf6b6929c1b2e956eca572e1d8b807a3e2338fdd0dc/stage"
  });
```

Or add it to the page via `script` tag:

 ```js
<script type="text/javascript" src="https://studio.alan.app/web/lib/alan_lib.min.js"></script>
 ```

It will now be available as a global variable named `alanBtn`.

```js
alanBtn({
   key: "e3018cc76639126f974f1bf6b6929c1b2e956eca572e1d8b807a3e2338fdd0dc/stage"
  });
```

## Usage

- In the Alan Studio you can specify a user's phrase and Alan's response via "reply" method:

```js
// Voice script
intent("Hi", reply("Hello"));
```

- You also can set a user's phrase and Alan's response via "p.play" method:

```js
// Voice script
intent("Hi", (p) => {
   p.play("Hello");
});
```

- If you want to set an app's reaction on some phrase, you can send the command from the voice script to the client-side:

```js
// Voice script
intent("Go back", (p) => {
   p.play("Navigating to the previous screen");
   p.play({command:"go:back"});
});

// On the client-side use `options.onCommand` method to set up an application reaction on the received command

// Client-side script
var alanBtnInstance = alanBtn({
   key: "0717498b05e694d0b083b897e50a49102e956eca572e1d8b807a3e2338fdd0dc/stage",
   onCommand: function (commandData) {
   // All commands that you send from the voice script will be passed here
      if (commandData.command === "go:back") {
         //call client code that will react on the received command
      }
   }
});
```

- You can parse a whole user's phrase with the folllowing intent:

```js
// Voice script
intent("$(I* (.*))", (p)=>{
    // with this intent a whole user's phrase will be available in the p.I.value variable
    p.play({command:'user-text-input', value: p.I.value});
});
```

- You can parse a part of the user's phrase like this:

```js
intent("The ticket name is $(I* (.*))", (p)=>{
    // in this case if a user says "The ticket name is ABC" only the ABC part will be stored  in the "p.I.value" variable
     console.log(p.I.value); // "ABC"
     p.play({command:'user-text-input', value: p.I.value});
});
```

### Alan Button Parameters

|**Name**  | **Type** | **Description** |
|--|--|--|
|`key` | string | The Alan Studio project key. |
|`rootEl`  |HTMLElement  | The element where Alan Button will be added. If no `rootEl` provided, the Alan Button is added to the `body`. |
|`onCommand`  | function | Callback for receiving commands from the Alan Studio script. In this callback you can set the reaction of your app on the commands which will be received form the Alan Studio script. [Learn more](https://alan.app/docs/integrations/web.html#example-of-using-the-oncommandcb-callback) |
|`onConnectionStatus` | function  | Callback for receiving the connection status of the Alan Button. [Learn more](https://alan.app/docs/integrations/web.html#example-of-using-the-onconnectionstatus-callback) |

### Alan Button Methods

#### setVisualState (visualStateData: object)

Method for setting the visual state

`visualStateData` - data that represents a visual state

```js
  //this is how you can set up a visual state
  alanBtnInstance.setVisualState({data:"your data"});
```

#### callProjectApi (method:string, data:object, callback:function)

Method for calling a project api that was defined in Alan Studio project’s script

`method` - method name

`data` - data that should be passed

`callback` - callback that could be called from project API method

``` js
  // Voice script
  projectAPI.setClientData = function(p, param, callback) {
    p.userData.data = param.data;
    callback();
  };

  // this is how you can call projectAPI.setClientData function
  alanBtnInstance.callProjectApi("setClientData", {data:"your data"}, function (error, result){
    //handle error and result here
  });
```

#### playText(text:string)

Method for playing voice

`text` - text that should be played

```js
  alanBtnInstance.playText("Hi! I am Alan");
```

#### playCommand(command:object)

Method for sending a command

`command` - object that represents a command

``` js
  alanBtnInstance.playCommand({command:"navigate", screen: "settings"});
```

#### activate()

Method for turning on the Alan Button programmatically

``` js
  alanBtnInstance.activate();
```

#### deactivate()

Method for turning off the Alan Button programmatically

``` js
  alanBtnInstance.deactivate();
```

## Documentation
  
The full API documentation available [here](https://alan.app/docs/integrations/web.html).

[Learn more](https://alan.app/docs/build-test/script-concepts.html) about Voice Script Concepts

## Supported Browsers

We use the WebRTC API and the Web Audio API, so the Alan Web SDK can be used on any web platform which supports these API's.

|Browser|Supported Versions|
|--|--|
|Chrome|73+|
|Safari|12+|
|Edge|18+|
|Firefox |65+|
|IE |Not supported|

## Have questions?

If you have any questions or if something is missing in the documentation, please [contact us](mailto:support@alan.app), or tweet us [@alanvoiceai](https://twitter.com/alanvoiceai). We love hearing from you!).

## License

MIT
