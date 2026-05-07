import React, { useRef, useEffect } from "react";
import { withRouter } from "react-router-dom";

import { Grid, Card, Paper } from "@material-ui/core";
import Box from "@material-ui/core/Box";
import schoolLogoDefault1 from "images/school_logo.png";
import schoolLogoDefault2 from "images/brainova_logo.png";
import TextField from "@material-ui/core/TextField";
import { makeStyles } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import Button from "@material-ui/core/Button";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";
import LinearProgress from "@material-ui/core/LinearProgress";
import { checkAuthentication } from "Includes/functions";
import { getFormDefiniationNames } from "Containers/Admin/FormDefinition/functions";
import { getRequest, postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import { DEFAULT_THEME, AWS_BUCKET_URL } from "Constants";
import eb from "images/eb.png";
import ForgotPassword from "Components/Loginpage/Components/ForgotPassword";
import LoginWithOtp from "Components/Loginpage/Components/LoginWithOtp";
import "./styles.scss";
// import LoginApplicationForm from "Containers/StudentForms/Components/LoginApplicationForm";

const { host } = window.location;

const schoolLogo = `${AWS_BUCKET_URL}companies-images/logos/default.gif`;
const school_logo = `${AWS_BUCKET_URL}companies-images/logos/${host}.png`;
const schoolLogoDefault =
  process.env.REACT_APP_ENV === "edubricz"
    ? schoolLogoDefault1
    : schoolLogoDefault2;
const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  dense: {
    marginTop: theme.spacing(2),
  },
  // loginGeneralBg: {
  //     backgroundImage: `url(${school_logo})`,
  // },
  loginHeading: {
    fontSize: "25px",
    color: "#212529",
    lineHeight: "1.9rem",
    fontWeight: "500",
  },
  loginSubheading: {
    fontSize: "15px",
    color: "#9EA0A5",
    marginTop: "0.8rem",
  },
  loginButton: {
    background: "#1665D8",
    marginTop: "30px",
    color: "#ffffff",
  },
}));

function Loginpage(props) {
  const classes = useStyles();
  const [name, setName] = React.useState("navya");
  const [pass, setPass] = React.useState("edubricz");
  const [error, seterror] = React.useState({ name: "", pass: "" });
  const [disabled, setDisable] = React.useState(false);
  const [hostname, sethostname] = React.useState(false);
  const [usernamePassError, setusernamePassError] = React.useState("");
  const [userData, setUserData] = React.useState(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(null);
  const [schoolLogoPresent, setSchoolLogoPresent] = React.useState(false);

  checkAuthentication(props.location.state && props.location.state.redirectUrl);

  const loginButton = async (e) => {
    e.preventDefault();
    let result = validation();
    if (result) {
      setDisable(true);
      const postData = {
        username: name,
        password: pass,
      };
      const url = POST_URL.login.api;
      postRequest(url, postData, { ...props, apiKey: "login" }).then(
        async (response) => {
          if (response && response.status === 200) {
            let key = response.data;
            localStorage.setItem("token", key.data.token);
            localStorage.setItem("boards", JSON.stringify(key.data.boards));
            localStorage.setItem("branches", JSON.stringify(key.data.branches));
            localStorage.setItem("user", JSON.stringify(key.data.user));
            const staffDetails = JSON.parse(localStorage.getItem("user"));
            localStorage.setItem("menu", JSON.stringify(key.data.menu));
            localStorage.setItem("settings", JSON.stringify(key.data.settings));
            if (!Boolean(localStorage.getItem("theme"))) {
              localStorage.setItem("theme", DEFAULT_THEME);
            }
            await getFormDefiniationNames("alias_name");
            await getFormDefiniationNames("exam_configurations", true);
            await getFormDefiniationNames("dashboard_configuration", true);
            await getFormDefiniationNames("fee_configurations", true);
            await getFormDefiniationNames("student_configuration", true);
            await getFormDefiniationNames("expense_configuration", true);
            await getFormDefiniationNames("certificate_configuration", true);
            await getFormDefiniationNames("staff_configuration", true);
            await getFormDefiniationNames(
              "student_attendance_configuration",
              true
            );
            await getFormDefiniationNames("library_configuration", true);
            if (props.location.state && props.location.state.redirectUrl) {
              window.location = props.location.state.redirectUrl;
            } else {
              // await getFormDefiniationNames('exam_configurations',true)
              window.location = "/dashboard";
            }
          }
          setDisable(false);
        }
      );
    }
  };

  const [values, setValues] = React.useState({
    password: "",
    showPassword: false,
  });

  useEffect(() => {
    if (window.location.hostname.includes("gurukula")) {
      sethostname(true);
    }
  });

  useEffect(() => {
    var request = new XMLHttpRequest();
    request.open("GET", schoolLogo, true);
    request.send();
    request.onload = function () {
      let status = request.status;
      if (request.status == 200) {
        //if(statusText == OK)
        setSchoolLogoPresent(() => true);
      }
    };

    request.open("GET", school_logo, true);
    request.send();
    request.onload = function () {
      let status = request.status;
      if (request.status == 200) {
        //if(statusText == OK)
        setSchoolLogoPresent(() => true);
      }
    };
  }, []);

  const validation = () => {
    let test = true;
    let error = { name: "", pass: "" };
    if (name === "") {
      error["name"] = "Please Enter User Name";
      test = false;
    }
    if (pass === "") {
      error["pass"] = "Please Enter Password";
      test = false;
    }
    seterror(error);
    return test;
  };

  const handleChange = (e) => {
    let name = e.target.name;
    let value = e.target.value;
    if (name === "name") {
      setName(value);
    } else {
      setPass(value);
    }
    error[name] = "";
    seterror(error);
  };

  const handleClickShowPassword = () => {
    setValues({ ...values, showPassword: !values.showPassword });
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };
  const preventDefault = (event) => event.preventDefault();

  const handleOpenDialog = () => {
    window.location = "/apply/application";
  };

  return (
    <div>
      <Grid container className={!hostname ? "login-reverse-direction" : ""}>
        <Grid
          item
          md={12}
          style={{ backgroundColor: "white", height: "100vh" }}
        >
          {/* <div className={classes.loginHeading}>
                        <img src={eb} alt='logo' className="login-logo" width="50px" height="fit-content"/>
                    </div> */}
          <div style={{ display: "flex", margin: "auto", height: "100%" }}>
            <div style={{ margin: "auto" }}>
              <Box
                display="inline-flex"
                mx="auto"
                style={{
                  width: "80%",
                  backgroundColor: "white",
                  display: "flex",
                }}
              >
                <Box position="relative">
                  <Box m="auto" style={{ textAlign: "center" }}>
                    {schoolLogoPresent ? (
                      <img
                        src={school_logo}
                        style={{ width: "250px" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = schoolLogo;
                        }}
                      />
                    ) : (
                      <img
                        src={school_logo}
                        style={{ width: "250px" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = schoolLogoDefault;
                        }}
                      />
                    )}
                    <div className={classes.loginHeading}>
                      Log in to Web Application
                    </div>
                    <form onSubmit={loginButton}>
                      <TextField
                        value={name}
                        onChange={(e) => handleChange(e)}
                        fullWidth
                        label="Username"
                        type="Username"
                        name="name"
                        autoComplete="Username"
                        margin="normal"
                        autoFocus={true}
                        variant="outlined"
                        size="small"
                        style={{ marginTop: "2rem" }}
                        helperText={error.name === "" ? "" : error.name}
                        error={error.name === "" ? false : true}
                        InputProps={{
                          className: classes.textField,
                          endAdornment: (
                            <InputAdornment position="end">
                              <AccountCircleIcon
                                style={{ color: "rgba(0, 0, 0, 0.54)" }}
                              ></AccountCircleIcon>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField
                        value={pass}
                        name="pass"
                        fullWidth
                        variant="outlined"
                        type={values.showPassword ? "text" : "password"}
                        label="Password"
                        onChange={(e) => handleChange(e)}
                        size="small"
                        style={{ marginTop: "10px" }}
                        helperText={error.pass === "" ? "" : error.pass}
                        error={error.pass === "" ? false : true}
                        InputProps={{
                          className: classes.textField,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                edge="end"
                                aria-label="toggle password visibility"
                                onClick={handleClickShowPassword}
                                onMouseDown={handleMouseDownPassword}
                                style={{ padding: "2px", marginRight: "-3px" }}
                              >
                                {values.showPassword ? (
                                  <VisibilityOff />
                                ) : (
                                  <Visibility />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        color="primary"
                        className={classes.loginButton}
                        disabled={disabled}
                      >
                        LOG IN NOW
                      </Button>
                    </form>
                  </Box>
                  <Box mt={1} textAlign="center" color="red">
                    {usernamePassError}
                  </Box>
                  <Box className="flex-justify-space-between ">
                    <LoginWithOtp baseClassName="action-basic-detail-width" />
                    <ForgotPassword baseClassName="action-basic-detail-width" />
                  </Box>
                </Box>
                {disabled && <LinearProgress />}
                <Box className={"hide-on-900"}></Box>
              </Box>
            </div>
          </div>
        </Grid>
      </Grid>
      {/* <div>
                    <div onClick={handleOpenDialog} className='submit-login-application-form' >Submit Application Form</div>
                </div> */}
    </div>
  );
}
export default withRouter(Loginpage);
