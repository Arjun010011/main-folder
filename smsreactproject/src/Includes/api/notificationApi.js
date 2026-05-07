import axios from "axios";
export const endPoint = `https://notificationstaging.edubricz.shop/`;
// export const endPoint = `https://notification.edubricz.com/`;
let token = localStorage.getItem("token");

const axiosAPI = token
  ? axios.create({
      baseURL: endPoint,
      headers: { common: { Authorization: "Token " + token } }, //lang
    })
  : axios.create({
      baseURL: endPoint,
      headers: { common: {} },
    });
export default axiosAPI;
