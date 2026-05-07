import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { createBrowserHistory } from 'history';
import dotenv from 'dotenv';
import { ConnectedRouter } from 'react-router-redux';
import configureStore from './configureStore';
import { Provider } from 'react-redux'
import LanguageProvider from 'Components/LanguageProvider';

// Import i18n messages
import { translationMessages } from './i18n';
import { addLocaleData }  from 'react-intl';
import en from "react-intl/locale-data/en";
import ka from 'react-intl/locale-data/ka';
import { createStore } from 'redux'
// Create redux store with history
const initialState = {};
const history = createBrowserHistory();
const store = configureStore(initialState, history);
const MOUNT_NODE = document.getElementById('root');

// import store from './redux/store'
// import 'typeface-roboto'
dotenv.config()
// locale
addLocaleData(en);
addLocaleData(ka);
const render = (messages) => {

ReactDOM.render(
    <Provider store={store}>
    <LanguageProvider messages={messages}>
      <ConnectedRouter history={history}>
      <App />
      
      </ConnectedRouter>
      </LanguageProvider>
    </Provider>, 
      MOUNT_NODE);
}

// ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));

if (module.hot) {
    module.hot.accept(['./i18n', './App.js'], () => {
      ReactDOM.unmountComponentAtNode(MOUNT_NODE);
      render(translationMessages);
    });
  }
  
  if (!window.Intl) {
    (new Promise((resolve) => {
      resolve(import('intl'));
    }))
      .then(() => Promise.all([
        import('intl/locale-data/jsonp/en.js'),
        import('intl/locale-data/jsonp/ka.js'),
      ]))
      .then(() => render(translationMessages))
      .catch((err) => {
        throw err;
      });
  } else {
    render(translationMessages);
  }
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
