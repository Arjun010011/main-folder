import React, { useRef, useEffect } from "react";
import { withRouter } from "react-router-dom";

import Box from "@material-ui/core/Box";
import edubricz_logo from "images/edu_logo1.png";
import brainova_logo from "images/brainova_logo.png";
import TextField from "@material-ui/core/TextField";
import { makeStyles } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import Button from "@material-ui/core/Button";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";
import LinearProgress from "@material-ui/core/LinearProgress";
import { checkAuthentication, getTransparentColor } from "Includes/functions";
import { getFormDefiniationNames } from "Containers/Admin/FormDefinition/functions";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { DEFAULT_THEME, AWS_BUCKET_URL } from "Constants";
import Wave from "images/Teaching-amico.svg";
import ForgotPassword from "Components/Loginpage/Components/ForgotPassword";
import LoginWithOtp from "Components/Loginpage/Components/LoginWithOtp";
import "./styles.scss";
import LoadingGif from "Components/LoadingGif";
import { InfoTabs } from "Containers/PrivacyPolicy";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import CloseIcon from "@material-ui/icons/Close";

const { host } = window.location;

const school_logo = `${AWS_BUCKET_URL}companies-images/logos/${host}.png`;
const logo_default =
  process.env.REACT_APP_ENV === "edubricz" ? edubricz_logo : brainova_logo;

const useStyles = makeStyles((theme) => ({
  main: (props) => ({
    width: "100%",
    height: "100vh",
    display: "flex",
    background: props.isDark ? "#0f172a" : "#f8fafc",
    overflow: "hidden",
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      height: "auto",
    },
  }),
  iconAdornment: {
    width: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  passwordIconButton: {
    padding: 0,
  },
  left: {
    flex: "0 0 60%",      // ⬅️ take 60% of total width
    height: "100vh",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    [theme.breakpoints.down("sm")]: { display: "none" },
  },
  
  video: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "100%",
    height: "100%",
    transform: "translate(-50%, -50%)", // 👈 centers the video perfectly
    objectFit: "cover",                 // 👈 maintains proper aspect ratio
    zIndex: 0,
    opacity: 1,
    pointerEvents: "none",
  },
  overlay: (props) => ({
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    background: props.isDark
      ? "linear-gradient(135deg, rgba(15,23,42,0.6), rgba(30,41,59,0.9))"
      : "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))",
  }),
  right: (props) => ({
    flex: "0 0 40%",   // ⬅️ only 40% width now
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    background: props.isDark
      ? "linear-gradient(135deg, #1e293b, #0f172a)"
      : "linear-gradient(135deg, #ffffff, #f9fafb)",
    padding: "20px",  // ⬅️ reduce padding to avoid empty space
  }),
  card: (props) => ({
    width: "100%",
    maxWidth: "350px",
    padding: "30px 24px",
    borderRadius: "18px",
    background: props.isDark
      ? "rgba(15,23,42,0.95)"
      : "rgba(255,255,255,0.95)",
    boxShadow: props.isDark
      ? "0 20px 60px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)"
      : "0 20px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
    backdropFilter: "blur(20px)",
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    "&::before": {
      content: '""',
      position: "absolute",
      top: "-80px",
      right: "-80px",
      width: "300px",
      height: "300px",
      background: `radial-gradient(circle, 
        rgba(70, 128, 255, 0.18) 0%,
        rgba(70, 128, 255, 0.08) 40%,
        transparent 70%)`,
      borderRadius: "50%",
      filter: "blur(50px)",
      opacity: 0.7,
      zIndex: 0,
      pointerEvents: "none",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      bottom: "-100px",
      left: "-100px",
      width: "350px",
      height: "350px",
      background: `radial-gradient(circle, 
        rgba(70, 128, 255, 0.15) 0%,
        rgba(70, 128, 255, 0.06) 45%,
        transparent 75%)`,
      borderRadius: "50%",
      filter: "blur(60px)",
      opacity: 0.6,
      zIndex: 0,
      pointerEvents: "none",
    },
    "& > *": {
      position: "relative",
      zIndex: 1,
    },
  }),
  logo: {
    width: "140px",
    margin: "0 auto 20px",
    display: "block",
    transition: "all 0.3s ease",
    filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))",
    "&:hover": { 
      transform: "scale(1.05)",
      filter: "drop-shadow(0 8px 20px rgba(0, 0, 0, 0.15))",
    },
  },
  input: {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      background: "rgba(255, 255, 255, 0.95)",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      "& fieldset": { 
        borderColor: "#e5e7eb",
        borderWidth: "1.5px",
      },
      "&:hover": {
        boxShadow: "0 4px 16px rgba(70, 128, 255, 0.15)",
        transform: "translateY(-2px)",
        "& fieldset": { 
          borderColor: "rgba(70, 128, 255, 0.5)",
        },
      },
      "&.Mui-focused": {
        boxShadow: "0 0 0 4px rgba(70, 128, 255, 0.15), 0 8px 24px rgba(70, 128, 255, 0.2)",
        transform: "translateY(-2px)",
        "& fieldset": { 
          borderColor: "var(--headingColor)",
          borderWidth: 2,
        },
      },
    },
    "& .MuiInputLabel-outlined": {
      fontWeight: 500,
      fontSize: "14px",
      "&.Mui-focused": {
        color: "var(--headingColor)",
        fontWeight: 600,
      },
    },
  },
  btn: {
    marginTop: "20px",
    background: "linear-gradient(135deg, var(--headingColor) 0%, rgba(70, 128, 255, 0.85) 100%)",
    color: "#fff",
    fontWeight: "700",
    fontSize: "15px",
    letterSpacing: "0.5px",
    borderRadius: "12px",
    padding: "14px 0",
    boxShadow: "0 4px 20px rgba(70, 128, 255, 0.4)",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      background: "linear-gradient(135deg, rgba(70, 128, 255, 0.9) 0%, rgba(59, 130, 246, 0.8) 100%)",
      transform: "translateY(-3px)",
      boxShadow: "0 8px 30px rgba(70, 128, 255, 0.5)",
    },
    "&:active": {
      transform: "translateY(-1px)",
    },
  },
  title: (props) => ({
    fontWeight: "700",
    fontSize: "22px",
    textAlign: "center",
    background: "linear-gradient(45deg, #6366f1, #3b82f6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "6px",
    color: props.isDark ? "#fff" : "#000",
  }),
  subtitle: (props) => ({
    textAlign: "center",
    fontSize: "13px",
    color: props.isDark ? "#cbd5e1" : "#64748b",
    marginBottom: "25px",
  }),
}));

function Loginpage(props) {
  const [backgroundColor, setBackgroundColor] = React.useState("blue");

  const classes = useStyles({ backgroundColor });
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [pass, setPass] = React.useState("");
  const [error, seterror] = React.useState({ name: "", pass: "" });
  const [disabled, setDisable] = React.useState(false);
  const [schoolLogoPresent, setSchoolLogoPresent] = React.useState(false);
  const [hideEdubriczLogo, setHideEdubriczLogo] = React.useState(false);
  const [signupConfig, setSignupConfig] = React.useState({})
  const [openPrivacy, setOpenPrivacy] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState("privacy");


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
            localStorage.setItem("signupconfig", JSON.stringify(signupConfig));
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
              await getFormDefiniationNames("setting_configuration", true);
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
    if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
      var request = new XMLHttpRequest();
      request.open("GET", school_logo, true);
      request.send();
      request.onload = function () {
        let status = request.status;
        if (request.status == 200) {
          //if(statusText == OK)
          setSchoolLogoPresent(() => true);
        }
      };
    }
    // if (process.env.NODE_ENV === "production") {
    fetchTheme();
    fetchSchoolConfig();
    // }
    // else{
    //   setLoading(false)
    // }
  }, []);

  const fetchTheme = () => {
    const domain=host.split('.')[0]
    fetch(`https://signup.edubricz.com/signupapi/company/companytheme/?domain_name=${domain}`)
      .then((response) => {
        if (!response.ok) { 
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.theme_name) setBackgroundColor(data.theme_name);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        console.error("Error fetching data:", error);
      });
  };

  const  fetchSchoolConfig = () => {
    try{
      const domain=host.split('.')[0]
      fetch(`https://signup.edubricz.com/signupapi/company/companyconfig/?domain_name=${domain}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if( data.data.hide_eb_logo_in_login_page){
            setHideEdubriczLogo(true)
          }
          setSignupConfig(data.data)
          setLoading(false);
        })
        .catch((error) => {
          setLoading(false);
          console.error("Error fetching data:", error);
      });
    }catch(err){
      console.log("error")
    }
  }

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

  if (loading) {
    return <LoadingGif />;
  }
  return (
    <div className={classes.main} style={{ height: "100vh", display: "flex" }}>
      {/* Left side video */}
        <div className={classes.left}>
          {signupConfig && signupConfig.institute_details ?
          <div></div> : 
            <>
            <video
              className={classes.video}
              src="https://production-edubricz.s3.amazonaws.com/18/Pink_Violet_Gradient_Modern_Business_Marketing_Plan_Animated_Presentation_2.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
            <div className={classes.overlay}></div>
            </>
          }
        </div>

      {/* Right side login card */}
      <div className={classes.right}>
        <div className={classes.card}>
          <img
            src={schoolLogoPresent ? school_logo : logo_default}
            alt="School Logo"
            className={classes.logo}
            onError={() => setSchoolLogoPresent(false)}
          />

          <div className={classes.title}>Welcome Back</div>
          <div className={classes.subtitle}>Sign in to your account</div>

          {/* 🔒 your original form logic untouched */}
          <form onSubmit={loginButton}>
            <TextField
              className={`${classes.input} username`}
              value={name}
              onChange={(e) => handleChange(e)}
              label="Username"
              type="text"
              name="name"
              autoComplete="username"
              margin="normal"
              fullWidth
              variant="outlined"
              size="small"
              helperText={error.name}
              error={!!error.name}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <AccountCircleIcon style={{ color: "rgba(0,0,0,0.54)" }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              className={`${classes.input} password`}
              value={pass}
              name="pass"
              variant="outlined"
              type={values.showPassword ? "text" : "password"}
              label="Password"
              onChange={(e) => handleChange(e)}
              helperText={error.pass}
              size="small"
              fullWidth
              error={!!error.pass}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                    >
                      {values.showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              className={classes.btn}
              fullWidth
              disabled={disabled}
            >
              LOG IN NOW
            </Button>
          </form>

          {/* OTP + Forgot Password */}
          <Box display="flex" justifyContent="space-between" mt={2}>
            <LoginWithOtp color="#3b82f6" />
            <ForgotPassword color="#3b82f6" />
          </Box>
        </div>
      {signupConfig && signupConfig.show_privacy_policy &&
        <table>  <tr>
            <td style={{ paddingTop: 10 }} colSpan={3}>
                  <span
                    onClick={() => {
                      setSelectedTab("privacy");
                      setOpenPrivacy(true);
                    }}
                    style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline", marginRight: '10px', fontSize: '10px' }}
                    >
                    Privacy Policy
                  </span>
                  <span
                    onClick={() => {
                      setSelectedTab("refund");
                      setOpenPrivacy(true);
                    }}
                    style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline", marginRight: '10px', fontSize: '10px' }}
                    >
                    Refund Policy
                  </span>
                  <span
                    onClick={() => {
                      setSelectedTab("about");
                      setOpenPrivacy(true);
                    }}
                    style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline", marginRight: '10px', fontSize: '10px' }}
                    >
                    About Us
                  </span>
                  <span
                    onClick={() => {
                      setSelectedTab("terms");
                      setOpenPrivacy(true);
                    }}
                    style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline", marginRight: '10px', fontSize: '10px' }}
                  >Terms and Conditions</span>
          </td></tr>
          </table>
        }
      </div>

      <Dialog open={openPrivacy} onClose={() => setOpenPrivacy(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Policy
          <IconButton
            aria-label="close"
            onClick={() => setOpenPrivacy(false)}
            style={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <InfoTabs activeTab={selectedTab} hideTab={true} user={{'institute_details': signupConfig.institute_details}}/>
        </DialogContent>
      </Dialog>

    </div>

  );
}
export default withRouter(Loginpage);
