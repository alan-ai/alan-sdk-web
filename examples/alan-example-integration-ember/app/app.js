import Application from '@ember/application';
import Resolver from './resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';
import alanBtn from "@alan-ai/alan-sdk-web";

const App = Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver
});

loadInitializers(App, config.modulePrefix);

alanBtn({ 
  key: '314203787ccd9370974f1bf6b6929c1b2e956eca572e1d8b807a3e2338fdd0dc/prod'
 });

export default App;
