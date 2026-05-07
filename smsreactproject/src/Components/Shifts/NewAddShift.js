import React, { Component } from "react";
import {
  Grid,
  Button,
  Typography,
  FormLabel,
  Paper,
  Box,
  withStyles,
  TextField,
} from "@material-ui/core/";
import bgImage from "./../../images/backgroundSchoolView.png";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import ControlPointOutlinedIcon from "@material-ui/icons/ControlPointOutlined";
import { Link, withRouter } from "react-router-dom";
import Swal from "sweetalert2";
import DateFnsUtils from "@date-io/date-fns";
import {
  MuiPickersUtilsProvider,
  KeyboardTimePicker,
} from "@material-ui/pickers";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";

const Styles = (theme) => ({
  heading: {
    fontWeight: "bold",
    fontSize: "35px",
    lineHeight: "40px",
    color: "#000000",
  },
  background: {
    backgroundImage: `url(${bgImage})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "106%",
    height: "fit-content",
    marginBottom: "20px",
  },
  subHeading: {
    fontFamily: "Roboto",
    fontStyle: "normal",
    fontWeight: "normal",
    fontSize: "18px",
    lineHeight: "24px",
    color: "#37474F",
  },
  addDetails: {
    marginTop: "20px",
    marginBottom: "20px",
    fontWeight: "500",
    fontSize: "16px",
    height: "47px",
    lineHeight: "14px",
    color: "#FFFFFF",
    textTransform: "none",
    borderRadius: "20px",
    backgroundColor: "#1665D8",
    "&:hover": {
      backgroundColor: "#0043a3",
    },
  },
  leaveBackGround: {
    width: "100%",
  },
  textfields: {
    backgroundColoe: "red",
  },
});

class NewAddShift extends Component {
  constructor(props) {
    super(props);

    this.state = {
      shift: [
        {
          shift_name: "",
          start_time: new Date(),
          end_time: new Date(),
        },
      ],
      errors: {},
      shiftTemp: [],
      submitDisable: false,
    };
  }

  handleChange(i, event) {
    let { shift, errors } = this.state;
    let names = event.target.name;
    shift[i][names] = event.target.value;
    errors = {};
    this.setState({
      errors,
      shift,
    });
  }

  submit = async () => {
    let { shift, errors } = this.state;
    this.validate(errors, shift);
    if (Object.keys(errors).length === 0) {
      this.setState({ submitDisable: true });
      shift.map((data) => {
        data.start_time =
          ("0" + data.start_time.getHours()).slice(-2) +
          ":" +
          ("0" + data.start_time.getMinutes()).slice(-2) +
          ":" +
          ("0" + data.start_time.getSeconds()).slice(-2);
        data.end_time =
          ("0" + data.end_time.getHours()).slice(-2) +
          ":" +
          ("0" + data.end_time.getMinutes()).slice(-2) +
          ":" +
          ("0" + data.end_time.getSeconds()).slice(-2);
      });
      const url = POST_URL.addHrShift.api;
      postRequest(url, shift, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Shift created",
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.manage_shift_types.view.url);
        }
        this.setState({ submitDisable: false });
      });
    } else {
      this.setState({
        errors,
      });
    }
  };

  validate = (errors, shift) => {
    shift.map((item, index) => {
      if (item.shift_name === "" || item.shift_name === null) {
        errors["shift_name" + index] = "Please Enter Shift Name";
      }
      if (Math.abs(item.end_time.getHours() - item.start_time.getHours()) < 4) {
        errors["start_time" + index] = "At least maintain min 4 hours";
        errors["end_time" + index] = "At least maintain min 4 hours";
      }
    });
    this.setState({ errors });
  };

  handleRemove(i) {
    let shift = this.state.shift;
    let { errors, enable } = this.state;
    errors = {};
    shift.splice(i, 1);
    this.setState({
      errors,
      shift: shift,
    });
    if (shift[i] !== undefined) {
      if (shift[i].shift_name === "") {
        shift[i].shift_name = "";
      }
    }
    this.setState({
      shift: shift,
    });
  }

  handleAdd() {
    let { shift, errors, enable } = this.state;
    this.validate(errors, shift);
    if (Object.keys(errors).length === 0) {
      shift.push({
        shift_name: "",
        start_time: new Date(),
        end_time: new Date(),
      });
      this.setState({
        shift,
      });
    }
  }

  handleDateChange = (e, name, i) => {
    let { errors } = this.state;
    let shift = this.state.shift;
    shift[i][name] = e;
    if (name === "start_time" || name === "end_time") {
      delete errors["start_time" + i];
      delete errors["end_time" + i];
    } else {
      delete errors["shift_name" + i];
    }
    this.setState({
      shift: shift,
      errors,
    });
  };

  render() {
    let { classes } = this.props;
    let { shift, errors, submitDisable } = this.state;
    return (
      <div>
        <Paper className={classes.background}>
          <Box p={3}>
            <Grid container>
              <Grid item md={4}>
                <Box borderRight={1} style={{ borderColor: "#E4E7EB" }} pb={2}>
                  <Box>
                    <Typography className={classes.heading}>
                      Create Shift
                    </Typography>
                  </Box>
                  <Box mt={2}>
                    <FormLabel className={classes.subHeading}>
                      You can create Shift for your staff
                    </FormLabel>
                  </Box>
                </Box>
              </Grid>
              <Grid item md={8}>
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    p={1}
                    component={Link}
                    to={Actions.manage_shift_types.view.url}
                    className={classes.addDetails}
                  >
                    <VisibilityOutlinedIcon
                      style={{
                        marginRight: "10px",
                        marginTop: "3px",
                        fontSize: "25px",
                      }}
                    />{" "}
                    View Shifts
                  </Button>
                </Box>
              </Grid>
            </Grid>

            <Grid container>
              <Grid item md={6} xs={12}>
                <Grid item md={12} xs={12}>
                  <Box>
                    {shift.map((field, idx) => {
                      return (
                        <div key={`${field}-${idx}`}>
                          <Paper>
                            <Box
                              style={{ position: "relative" }}
                              ml={3}
                              mr={3}
                              mt={4}
                            >
                              <Grid container spacing={3}>
                                <Grid item md={6}>
                                  <TextField
                                    id="outlined-name"
                                    label="Shift Name"
                                    name="shift_name"
                                    fullWidth
                                    value={field.shift_name}
                                    onChange={(e) => {
                                      this.handleChange(idx, e);
                                    }}
                                    margin="normal"
                                    variant="outlined"
                                    autoComplete="off"
                                    helperText={
                                      errors["shift_name" + idx] &&
                                      errors["shift_name" + idx]
                                    }
                                    error={
                                      errors["shift_name" + idx] &&
                                      (errors["shift_name" + idx]
                                        ? true
                                        : false)
                                    }
                                    inputProps={{ maxLength: 50 }}
                                  />
                                </Grid>
                                <Grid item md={6}>
                                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                    <KeyboardTimePicker
                                      fullWidth
                                      autoOk
                                      variant="inline"
                                      inputVariant="outlined"
                                      name="start_time"
                                      margin="normal"
                                      inputProps={{ readOnly: true }}
                                      id="mui-pickers-time"
                                      label="Start Time"
                                      value={field.start_time}
                                      onChange={(e) =>
                                        this.handleDateChange(
                                          e,
                                          "start_time",
                                          idx
                                        )
                                      }
                                      KeyboardButtonProps={{
                                        "aria-label": "change time",
                                      }}
                                      helperText={
                                        errors["start_time" + idx] &&
                                        errors["start_time" + idx]
                                      }
                                      error={
                                        errors["start_time" + idx] &&
                                        (errors["start_time" + idx]
                                          ? true
                                          : false)
                                      }
                                    />
                                    <KeyboardTimePicker
                                      fullWidth
                                      autoOk
                                      variant="inline"
                                      inputVariant="outlined"
                                      name="end_time"
                                      margin="normal"
                                      inputProps={{ readOnly: true }}
                                      id="time-picker"
                                      label="End Time"
                                      value={field.end_time}
                                      onChange={(e) =>
                                        this.handleDateChange(
                                          e,
                                          "end_time",
                                          idx
                                        )
                                      }
                                      KeyboardButtonProps={{
                                        "aria-label": "change time",
                                      }}
                                      helperText={
                                        errors["end_time" + idx] &&
                                        errors["end_time" + idx]
                                      }
                                      error={
                                        errors["end_time" + idx] &&
                                        (errors["end_time" + idx]
                                          ? true
                                          : false)
                                      }
                                    />
                                  </MuiPickersUtilsProvider>
                                </Grid>
                              </Grid>
                              {shift.length > 1 && (
                                <Box>
                                  <HighlightOffIcon
                                    className="cross-btn-nominee"
                                    onClick={() => this.handleRemove(idx)}
                                    style={{
                                      cursor: "pointer",
                                      position: "absolute",
                                      top: "-11px",
                                      right: "-36px",
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          </Paper>
                        </div>
                      );
                    })}
                  </Box>
                  <Grid container>
                    <Grid item md={12}>
                      <Box marginRight="20%" mt={3}>
                        <Button
                          variant="contained"
                          color="primary"
                          style={{ float: "right", textTransform: "none" }}
                          onClick={() => this.handleAdd(shift.length - 1)}
                        >
                          Add Shift &nbsp; <ControlPointOutlinedIcon />
                        </Button>
                      </Box>
                    </Grid>
                    <Grid item md={12}>
                      <Box
                        display="flex"
                        justifyContent="flex-end"
                        mt={4}
                        mb={4}
                        mr={1}
                      >
                        <Button
                          variant="contained"
                          onClick={(e) =>
                            this.setState({
                              leaveType: [{ name: "", code: "" }],
                            })
                          }
                        >
                          Clear &nbsp;{" "}
                        </Button>
                        <Box ml={2}>
                          <Button
                            className="submit"
                            variant="contained"
                            disabled={submitDisable}
                            color="primary"
                            style={{ float: "right" }}
                            onClick={(e) => this.submit()}
                          >
                            Submit &nbsp;{" "}
                          </Button>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </div>
    );
  }
}

export default withRouter(withStyles(Styles)(NewAddShift));
