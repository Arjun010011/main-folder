// import axios from 'axios';

// export default axios.create({
//   baseURL: process.env.API_URL,
//   headers: { common: { 'Access-Control-Allow-Origin': '*' }, },
// });


import axios from 'axios';
import { DEFAULT_LOCALE } from 'Constants'
// import apiURL from './../constants';
const { host } = window.location
export const endPoint = `http://127.0.0.1:8000/api`;
let token = localStorage.getItem('token');
// Check for application form token if regular token is not available
if (!token) {
    token = localStorage.getItem('application_form_token');
}
const lang = localStorage.getItem('lang') ? localStorage.getItem('lang') : DEFAULT_LOCALE;
const axiosAPI =    
token ? 
axios.create({
  baseURL: endPoint,
  headers: { common: { Authorization:  'Token '+token, }, },//lang
})
:
axios.create({
  baseURL: endPoint,
  headers: { common: {   }, },

});

// Create a separate axios instance for public endpoints (no Authorization header)
export const axiosPublicAPI = axios.create({
  baseURL: endPoint,
  headers: { common: {   }, },
});

export default axiosAPI;
