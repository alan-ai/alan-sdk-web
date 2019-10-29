Alan Web SDK
======
[Alan Platform](https://alan.app/) • [Alan Studio](https://studio.alan.app/register) • [Docs](https://alan.app/docs/intro.html) • [FAQ](https://alan.app/docs/additional/faq.html) •
[Blog](https://alan.app/blog/) • [Twitter](https://twitter.com/alanvoiceai)

[![npm](https://img.shields.io/npm/v/@alan-ai/alan-sdk-web.svg)](https://www.npmjs.com/package/@alan-ai/alan-sdk-web)
[![npm](https://img.shields.io/npm/l/@alan-ai/alan-sdk-web.svg)]()

A lightweight JavaScript library for adding a voice experience to your website or web application. Check out our [demo](https://alan-ai.github.io/alan-sdk-web/).

Create a voice script for your application in [Alan Studio](https://studio.alan.app/register) and then add it to your app.

## How to use
Install `@alan-ai/alan-sdk-web` using [npm](https://www.npmjs.com/package/@alan-ai/alan-sdk-web).

```
npm install @alan-ai/alan-sdk-web --save
```


```
import alanBtn from "@alan-ai/alan-sdk-web";

alanBtn({
   key: "e3018cc76639126f974f1bf6b6929c1b2e956eca572e1d8b807a3e2338fdd0dc/stage",
   onCommand: function (commandData) {
      if (commandData.command === "some:command") {
      //call client code that will react on the received command
      }
   },
  });
```

Or add it to the page via `script` tag:

 ```
<script type="text/javascript" src="https://studio.alan.app/web/lib/alan_lib.min.js"></script>
 ```
 
It will now be available as a global variable named `alanBtn`.

```
alanBtn({
   key: "e3018cc76639126f974f1bf6b6929c1b2e956eca572e1d8b807a3e2338fdd0dc/stage",
   onCommand: function (commandData) {
      if (commandData.command === "some:command") {
      //call client code that will react on the received command
      }
   },
  });
```

## Documentation
  
API documentation available [here](https://alan.app/docs/intro.html)

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
