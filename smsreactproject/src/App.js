import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
// import ThemeToggle from 'Components/ThemeToggle'
import "react-phone-input-2/lib/material.css";
import "font-awesome/css/font-awesome.css";
import { Button } from "@material-ui/core";
import PropTypes from "prop-types";
import moment from "moment";
import ReactGA from "react-ga";

import { POST_URL, NOTIFICATION_POST_URL } from "Includes/urls";
import { postNotificationRequest } from "Includes/api/apicall";
import CreateUrlJson from "Components/CreateUrlJson";
import Dashboard from "./Components/Dashboard";
import Loginpage from "Components/Loginpage/LoginPageNew";
import LoginApplicationForm from "Containers/StudentForms/Components/LoginApplicationForm";
import PublicApplicationFormLogin from "Containers/StudentForms/Components/PublicApplicationFormLogin";
import PublicApplicationDashboard from "Containers/StudentForms/Components/PublicApplicationDashboard";
import PrivateRoute from "./PrivateRoute";
import GATrackingIds from "Constants/GoogleAnalyticsMapping";
import PublicEnquiryForm from "Containers/StudentForms/Components/PublicEnquiryForm";
import DummyPayment from "DummyPayment";
import "./AppResponsive.scss";
import "./App.scss";
import {
  TOKEN_EXPIRY_BUFFER_TIME,
  REFRESH_TOKEN_TIME,
  DEFAULT_THEME,
} from "Constants";
import ThanksforFillingEnquiry from 'Containers/StudentForms/Components/ThanksforFillingEnquiry';
import PublicJobApplicationForm from 'Containers/Interview/Components/PublicJobApplicationForm';

// import CommonComponent from './../src/Components/CommonComponent';
const localTheme = localStorage.getItem("theme")
  ? localStorage.getItem("theme")
  : DEFAULT_THEME;
const errorReceivers = [
  "nmd9194@gmail.com",
  "yashgouda99@gmail.com",
  "nagendra1811@gmail.com",
  "nithin24695@gmail.com",
];
function App(props) {
  let lastActivityTime = new Date().getTime();
  const [theme, setThemeState] = React.useState(localTheme);

  let lastLogin = null;
  let refreshTime = null;
  let callingRefresTokenApi = false;
  let refreshTimeInUnix = 60000 * REFRESH_TOKEN_TIME;
  let bufferTimeInUnix = 60000 * TOKEN_EXPIRY_BUFFER_TIME;

  React.useEffect(() => {
    //Material ui components like modals are getting appended directly into the body tag
    // To apply theme components should be within theme-${theme} class
    const body = document.getElementsByTagName("body");
    if (body) {
      body[0].classList.add(`theme-${theme}`);
    }
    // ReactGA.pageview(window.location.pathname + window.location.search);
    // if (localStorage.getItem('token')) {
    //   lastLogin = new Date(JSON.parse(localStorage.getItem('user')).last_login).getTime();
    //   refreshTime = lastLogin + refreshTimeInUnix;
    // let intervalBuffer = setInterval(() => {
    //   setInterValForExpiry();
    // }, bufferTimeInUnix);
    // }

    const { host } = window.location;
    const trackingId =
      GATrackingIds.hasOwnProperty(host) && GATrackingIds[host];
    if (trackingId) {
      ReactGA.initialize(trackingId);
      ReactGA.set({ page: window.location.pathname });
      ReactGA.pageview(window.location.pathname + window.location.search);
    }
  }, [props.location]);

  const checkTokenExpiry = () => {
    lastActivityTime = new Date().getTime();

    if (lastLogin && refreshTime < lastActivityTime && !callingRefresTokenApi) {
      const url = POST_URL.refresh_token.api;
      callingRefresTokenApi = true;
      // postRequest(url, {}, props).then((response) => {
      //     if (response && response.status === 200) {
      //       let key = response.data;
      //       localStorage.setItem("token", key.data.token);
      //       localStorage.setItem("user", JSON.stringify(key.data.user));
      //       callingRefresTokenApi = false;
      //       lastLogin = new Date(key.data.user.last_login).getTime();
      //       refreshTime = lastLogin + refreshTimeInUnix;
      //     }
      // });
    }
  };

  // const setInterValForExpiry = () => {
  //   let currentTime = new Date().getTime()
  //   let timeOutBuffer = bufferTimeInUnix - (currentTime - lastActivityTime);
  //   if(localStorage.getItem('token')){
  //     setTimeout(()=>{
  //       if(currentTime - lastActivityTime >= bufferTimeInUnix){
  //         logout()
  //       }
  //     }, timeOutBuffer)
  //   }
  // }
  // const setTheme = (themeprop) => {
  //   if(themeprop && localStorage.getItem('theme') !== themeprop){
  //     localStorage.setItem('theme', themeprop);
  //     setThemeState(themeprop);
  //   }
  // }

  const errorHandler = (error, stackTrace) => {
    let locationHref = window.location.href;
    const user = localStorage.getItem("user");
    let user_id = null;
    let username = "";
    if (user) {
      user_id = JSON.parse(user).id;
      username = JSON.parse(user).username;
    }
    const payload = [
      {
        notification_entity: {
          user_id: user_id,
          company_id: null,
          channel: "email",
          vendor: "ses",
          client: "ses",
          priority: "high",
          channel_data: {
            messageType: "",
            subject: `Web Error - screen ${locationHref}  - at (${moment().format(
              "DD MMM YYYY HH:MM"
            )}) by user - ${username}`,
            to: errorReceivers,
            cc: [],
            body: `error - ${error} \n stack trace - ${JSON.stringify(
              stackTrace
            )}`,
            attachmentLinks: [],
          },
        },
      },
    ];
    if (window.location.protocol === "https:") {
      const url = NOTIFICATION_POST_URL.sendformdata.api;
      postNotificationRequest(url, payload, { return_error: true });
    }
  };

  useEffect(() => {
    async function loadTheme() {
      const setting_config = JSON.parse(
        localStorage.getItem("setting_configuration")
      )
        ? JSON.parse(localStorage.getItem("setting_configuration"))
        : {};

      if (setting_config["theme_name"] === "pink") {
        await import("./styles/pinkVariables.scss");
      } else {
        await import("./styles/variables.scss");
      }
    }
    loadTheme();
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        errorHandler(error, info);
      }}
    >
      <div className={`App`} onMouseMove={() => checkTokenExpiry()}>
        <Router>
          <div>
            {/* <ThemeToggle setTheme={setTheme}/> */}
            <Switch>
              <Route path="/public-enquiry" component={PublicEnquiryForm} />
              <Route path="/public-job-application" component={PublicJobApplicationForm} />
              <Route path="/create-url-json" component={CreateUrlJson} />
              <Route
                exact
                path="/"
                render={({ location }) => {
                const token = localStorage.getItem("token");
                const currentPath = location.pathname + location.search;

                if (token) {
                  return <Redirect to="/dashboard" />;
                }

                // 👇 If URL or query includes "public-enquiry"
                if (currentPath.includes("public-enquiry")) {
                  return <Redirect to="/public-enquiry" />;
                }

                if (currentPath.includes("public-enquiry")) {
                  return <Redirect to="/public-enquiry" />;
                }

                // 👇 Default fallback
                return <Redirect to="/login" />;
                }}
              />
              <Route path="/login" component={Loginpage} />
                <Route path="/enquiry-thank-you" component={ThanksforFillingEnquiry} />
              <Route
                path="/apply/login"
                component={PublicApplicationFormLogin}
              />
              <Route
                path="/apply/dashboard"
                component={PublicApplicationDashboard}
              />
              <Route
                path="/apply/application"
                component={LoginApplicationForm}
              />
              <Route path="/payment" component={DummyPayment} />
              <PrivateRoute path="/" component={Dashboard} />
              <Route render={() => <h3>Not Found</h3>} />
            </Switch>
          </div>
        </Router>
      </div>
    </ErrorBoundary>
  );
}

const ErrorFallback = () => {
  return (
    <div role="alert">
      <img
        src="https://thefactfactor.com/wp-content/uploads/2020/03/Errors-01.png"
        style={{ margin: "auto", display: "block" }}
      />
      <Button
        variant="contained"
        color="primary"
        style={{ margin: "auto", display: "block" }}
        onClick={() => window.location.reload()}
      >
        Try again
      </Button>
    </div>
  );
};

ErrorFallback.propTypes = {
  error: PropTypes.object,
  resetErrorBoundary: PropTypes.func,
  location: PropTypes.object.isRequired,
};

export default App;
