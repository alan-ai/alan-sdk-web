# React App with Alan

[Alan Platform](https://alan.app/) • [Alan Studio](https://studio.alan.app/register) • [Docs](https://alan.app/docs) • [FAQ](https://alan.app/docs/usage/additional/faq) •
[Blog](https://alan.app/blog/) • [Twitter](https://twitter.com/alanvoiceai)

## Prerequisites

Install [Node.js](https://nodejs.org/) which includes [Node Package Manager](https://www.npmjs.com/get-npm)

## Running example project

This is an example of using the voice assistant SDK for Web in a React app. To use this app:

1. Clone this repository to your computer
2. Navigate to 'appointment-frontend' folder .
3. Rename the .env-example to .env file in the 'appointment-frontend' root.
4. replace the REACT_APP_ALAN_KEY value with your Alan SDK key in following format of `KEY=VALUE`. You can learn more about Alan SDK key here:(https://alan.app/docs/client-api/web/web-api/#specifying-the-alan-button-parameters)
5. Run `npm run build`.
6. Navigate to 'appointment-backend' folder.
7. Rename the .env-example to .env file in 'appointment-backend' root.
8. replace the MONGO_URL value with your Alan studio key in following format of `KEY=VALUE`.

- Steps to create MongoDB Atlas account and get a mangodb URL: (https://www.mongodb.com/docs/atlas/getting-started/)

9. Run `npm start`.

- Deployed version of this code here at this link: (https://appointment-demo.alan.app/)

## Documentation

For more details, see [Alan AI documentation](https://alan.app/docs/client-api/web/react).

## Have questions?

If you have any questions or something is missing in the documentation:

- Join [Alan AI Slack community](https://app.slack.com/client/TL55N530A) for support
- Contact us at [support@alan.app](mailto:support@alan.app)
