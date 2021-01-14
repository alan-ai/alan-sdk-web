import Vue from 'vue'
import App from './App.vue'
import alanBtn from "@alan-ai/alan-sdk-web";

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')

alanBtn({
  key: '4d292cf043b0a2ea4d0bf347580da6fd2e956eca572e1d8b807a3e2338fdd0dc/prod',
  onCommand: (commandData) => {
    console.log(commandData);
    if (commandData.command === 'command-example') {
      document.getElementById('rocket').style.transform = 'rotate(180deg)';
    }
  }
});
