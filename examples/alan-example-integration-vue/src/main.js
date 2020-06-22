import Vue from 'vue'
import App from './App.vue'
import alanBtn from "@alan-ai/alan-sdk-web";

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')

alanBtn({ 
  key: '314203787ccd9370974f1bf6b6929c1b2e956eca572e1d8b807a3e2338fdd0dc/prod'
});
