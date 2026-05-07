import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
  withRouter,
} from "react-router-dom";

import Swal from "sweetalert2";
// import { checkAuthentication } from '../../includes/functions';
// import "font-awesome/css/font-awesome.css";
function ErrorHandler(error, props, return_error_message) {
  let popError = true;
  let status = "network_error";
  if (error.response && error.response.status) {
    status = error.response.status;
  }
  // let status = 200
  let errorMessage = "";

  if (status === 401) {
    errorMessage = "Session Expired";
    // Check if we're on a public route - don't redirect to login for public pages
    const currentPath = window.location.pathname;
    const isPublicRoute = currentPath.includes("/public-enquiry") || 
                         currentPath.includes("/enquiry-thank-you") ||
                         currentPath.includes("/public-job-application") ||
                         currentPath.includes("/apply/application") ||
                         currentPath.includes("/apply/login") ||
                         currentPath.includes("/apply/dashboard") ||
                         currentPath.includes("/payment");
    
    if (!isPublicRoute) {
      // Clear all authentication-related localStorage items (same as logout)
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("menu");
      localStorage.removeItem("boards");
      localStorage.removeItem("board");
      localStorage.removeItem("branch");
      localStorage.removeItem("branches");
      localStorage.removeItem("previewVideo");
      // Redirect to login with session expired parameter
      window.location = "/login?sessionExpired=true";
    } else {
      // For public routes, just show the error without redirecting
      if (props && Boolean(props["return_error_message"])) {
        return errorMessage;
      } else {
        Swal.fire({
          type: "error",
          title: "Error",
          text: errorMessage,
          ...(props?.autoHideError && { timer: props?.timing ? props?.timing : 4000 }),
        });
      }
      if (Boolean(return_error_message)) {
        return errorMessage;
      }
      return;
    }
  } else if (status === 400) {
    //institutes/academicyear/1(Getting this response when making edit to academic year)
    let errorData = null;
    let isArray = false;
    if (error.response.data && Array.isArray(error.response.data)) {
      errorData = error.response.data;
      isArray = true;
    } else if (
      error.response.data &&
      typeof error.response.data === "object" &&
      Array.isArray(error.response.data[0])
    ) {
      errorData = error.response.data[0];
      isArray = true;
    } else if (error.response.data && !Array.isArray(error.response.data)) {
      errorData = error.response.data;
    }
    if (errorData) {
      for (const index in errorData) {
        let data = errorData;
        if (isArray) {
          data = errorData[index];
          if (data && Array.isArray(data)) {
            let value_error = data[0];
            if (typeof value_error === "object") {
              let keys = Object.keys(data);
              keys.some((keyData) => {
                let value = value_error[keyData];
                errorMessage = errorMessage + keyData + ": " + value;
              });
            } else {
              errorMessage = value_error;
            }
          } else if (typeof data === "object") {
            let keys = Object.keys(data);
            keys.some((keyData) => {
              let value = "";
              if (typeof data[keyData] === "string") {
                value = data[keyData];
              } else {
                value = data[keyData][0];
              }
              errorMessage = errorMessage + keyData + ": " + value;
            });
          } else {
            const value = index === 0 ? data : " " + data;
            errorMessage = errorMessage + value;
          }
        } else {
          let keys = Object.keys(data);
          keys.some((keyData) => {
            let value = data[keyData][0];
            errorMessage = errorMessage + keyData + ": " + value;
          });
        }
      }
    }
  } else if (status === 403) {
    errorMessage = "Page not Found";
    // window.location = '/dashboard'
  } else if (status === 405) {
    //adddmission student form delete
    errorMessage = error.response.data.detail;
  } else if (status === "network_error") {
    errorMessage = "Make sure your device has an active Internet connection.";
  } else {
    errorMessage = `Invalid data, Please Contact ${process.env.REACT_APP_ENV} Team !!`;
  }
  if (props && Boolean(props["return_error_message"])) {
    return errorMessage;
  } else {
    Swal.fire({
      type: "error",
      title: "Error",
      text: errorMessage,
      ...(props?.autoHideError && { timer: props?.timing ? props?.timing : 4000 }),
    });
  }
  if (Boolean(return_error_message)) {
    return errorMessage;
  }
}

export default ErrorHandler;
