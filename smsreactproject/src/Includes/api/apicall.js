/* eslint-disable no-undef */
// import axios from 'axios';
import ErrorHandler from 'Components/ErrorHandler';
import axiosAPI, { axiosPublicAPI } from './api';
import axiosNotificationApi from './notificationApi';
import Swal from 'sweetalert2';
import ReactGA from 'react-ga';
import GATrackingIds from "Constants/GoogleAnalyticsMapping";
import { viewTime } from 'Includes/viewFunctions';
import { GET_URL, POST_URL, PUT_URL, PATCH_URL, DEL_URL } from 'Includes/urls'

function getRequest(url, params, props) {
  const selectedBranch = localStorage.getItem('branch');
  const selectedBoard = localStorage.getItem('board');

  const hideBranch = localStorage.getItem('hideBranch') === "false" ? 0 : 1;
  const hideBoard = localStorage.getItem('hideBoard') === "false" ? 0 : 1;
  let data = {};
  let extra_params = {};
  if (selectedBranch !== 'all' && selectedBranch && !hideBranch && !props?.dontSendBranch) {
    extra_params['branch'] = selectedBranch
  }
  if (selectedBoard !== 'all' && selectedBoard && !hideBoard && !props?.dontSendBranch) {
    extra_params['board'] = selectedBoard
  }
  if (params) {
    data = { ...params, ...extra_params };
  }
  const label = url + 'data:' + JSON.stringify(data);
  
  // Update Authorization header dynamically to handle application_form_token
  // This is needed because the axios instance is created at module load time
  let token = localStorage.getItem('token');
  if (!token) {
    token = localStorage.getItem('application_form_token');
  }
  if (token) {
    axiosAPI.defaults.headers.common['Authorization'] = 'Token ' + token;
  }
  
  axiosAPI.defaults['responseType'] = XMLHttpRequest.responseType
  if (props && props.responseType) {
    axiosAPI.defaults['responseType'] = props.responseType;
  }
  return axiosAPI.get(url, { params: { ...data } }).then((response) => {
    if (response.status === 200) {
      setGAAPIEvent(props, 'GET', 'Success', label);
      return response;
    }
  }).catch(function (error) {
    setGAAPIEvent(props, 'GET', 'Failure', label);
    if (props && props.return_error) {
      return error.response;
    }
    else {
      return ErrorHandler(error, props);
    }
  });
}

function postRequest(url, data, props, extra_params = {}) {
  let params = {};
  if (data) {
    params = data;
  }
  const label = url + 'data:' + JSON.stringify(params);
  
  // Use public API (no Authorization header) for public endpoints
  const isPublicEndpoint = props && props.usePublicAPI;
  const apiInstance = isPublicEndpoint ? axiosPublicAPI : axiosAPI;
  
  // Update Authorization header dynamically for non-public endpoints
  // This is needed because the axios instance is created at module load time
  if (!isPublicEndpoint) {
    let token = localStorage.getItem('token');
    if (!token) {
      token = localStorage.getItem('application_form_token');
    }
    if (token) {
      axiosAPI.defaults.headers.common['Authorization'] = 'Token ' + token;
    }
  }
  
  if (props && props.contentType) {
    apiInstance.defaults.headers['Content-Type'] = props.contentType;
  }
  if (props && props.responseType) {
    apiInstance.defaults['responseType'] = props.responseType;
  }
  else{
    apiInstance.defaults['responseType'] =undefined;
  }
  return apiInstance.post(url, params, { withCredentials: false, params: extra_params }).then((response) => {
    if (response.status === 200) {
      setGAAPIEvent(props, 'POST', 'Success', label);
      return response;
    }
  }).catch(function (error) {
    setGAAPIEvent(props, 'POST', 'Failure', label);
    if (props && props.return_error) {
      return error.response;
    }
    else {
      return ErrorHandler(error, props);
    }
  });
}

function putRequest(url, data, props) {
  let params = {};
  if (data) {
    params = data;
  }
  const label = url + 'data:' + JSON.stringify(params);
  if (props && props.contentType) {
    axiosAPI.defaults.headers['Content-Type'] = props.contentType;
  }
  if (props && props.token) {
    axiosAPI.defaults.headers['Authorization'] = props.token;
  }
  return axiosAPI.put(url, params, { withCredentials: false }).then((response) => {
    if (response.status === 200) {
      setGAAPIEvent(props, 'PUT', 'Success', label);
      return response;
    }
  }).catch(function (error) {
    setGAAPIEvent(props, 'PUT', 'Failure', label);
    if (props && props.return_error) {
      return error.response;
    }
    else {
      return ErrorHandler(error, props);
    }
  });
}

function patchRequest(url, data, props) {
  let params = {};
  if (data) {
    params = data;
  }
  const label = url + 'data:' + JSON.stringify(params);
  if (props && props.contentType) {
    axiosAPI.defaults.headers['Content-Type'] = props.contentType;
  }
  // axiosAPI.defaults.headers.post['Content-Type'] = props.contentType;
  return axiosAPI.patch(url, params, { withCredentials: false }).then((response) => {
    if (response.status === 200) {
      setGAAPIEvent(props, 'Patch', 'Success', label);
      return response;
    }
  }).catch(function (error) {
    setGAAPIEvent(props, 'Patch', 'Failure', label);
    ErrorHandler(error);
  });
}

function deleteRequest(url, data, props, isConfirmed) {
  if (isConfirmed) {
    let params = {};
    if (data) {
      params = data;
    }
    const label = url + 'data:' + JSON.stringify(params);
    return axiosAPI.delete(url, params, { withCredentials: false }).then((response) => {
      if (response.status === 200) {
        setGAAPIEvent(props, 'Delete', 'Success', label);
        return response;
      }
    }).catch(function (error) {
      setGAAPIEvent(props, 'Delete', 'Failure', label);
      ErrorHandler(error);
    });
  }
  else {
    return Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: props['confirmButtonText'] ? props['confirmButtonText'] : 'Yes, delete it!'
    }).then(async (result) => {
      if (result.value) {
        let params = {};
        if (data) {
          params = data;
        }
        const label = url + 'data:' + JSON.stringify(params);
        return axiosAPI.delete(url, params, { withCredentials: false }).then((response) => {
          if (response.status === 200) {
            setGAAPIEvent(props, 'Delete', 'Success', label);
            return response;
          }
        }).catch(function (error) {
          setGAAPIEvent(props, 'Delete', 'Failure', label);
          ErrorHandler(error);
        });
      }
    });
  }
}

function postRequestOnConfirm(url, data, props, type) {
  let confirmMessage
  if (type) {
    confirmMessage = type === "Approve" ? "Yes, Approve it!" : "Yes, Pay Salary!"
  }
  return Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: props['confirmButtonText'] ? props['confirmButtonText'] : `${confirmMessage}`
  }).then(async (result) => {
    if (result.value) {
      let params = {};
      if (data) {
        params = data;
      }
      if (props && props.contentType) {
        axiosAPI.defaults.headers['Content-Type'] = props.contentType;
      }
      return axiosAPI.post(url, params, { withCredentials: false }).then((response) => {
        if (response.status === 200) {
          if (response.data === "2FA required") {
            // <SecondaryPassword data={data} url={url} props={this.props} />
            viewTime()
          }
          else {
            return response;
          }
        }
      }).catch(function (error) {
        if (props && props.return_error) {
          return error.response;
        }
        else {
          return ErrorHandler(error, props);
        }
      });
    }
  });
}

function postNotificationRequest(url, data, props) {
  let params = {};
  if (data) {
    params = data;
  }
  if (props && props.contentType) {
    axiosNotificationApi.defaults.headers['Content-Type'] = props.contentType;
  }
  return axiosNotificationApi.post(url, params, { withCredentials: false }).then((response) => {
    if (response.status === 200) {
      return response;
    }
  }).catch(function (error) {
    if (props && props.return_error) {
      return error.response;
    }
    else {
      return ErrorHandler(error, props);
    }
  });
}

export const setGAAPIEvent = (props, category, status, label) => {
  const { host } = window.location;
  const mapping = getURLData(category);
  const trackingId = Object.prototype.hasOwnProperty.call(GATrackingIds, host) && GATrackingIds[host];
  const gaEventName = props && props.apiKey && mapping && mapping[props.apiKey] && mapping[props.apiKey].eventName;
  if (trackingId && gaEventName) {
    ReactGA.event({ category: `API - ${category} - ${status}`, action: gaEventName, label });
  }
}

const getURLData = (category) => {
  switch (category) {
    case 'GET': return GET_URL;
    case 'POST': return POST_URL;
    case 'PUT': return PUT_URL;
    case 'PATCH': return PATCH_URL;
    case 'DEL': return DEL_URL;
    default: return null;
  }
}

export { getRequest, postRequest, putRequest, deleteRequest, patchRequest, postRequestOnConfirm, postNotificationRequest };