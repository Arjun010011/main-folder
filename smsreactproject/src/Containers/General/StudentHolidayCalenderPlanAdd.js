import React from "react";
import {
  Paper,
  Grid,
  Button,
  Box,
  TextField,
  MenuItem,
  Checkbox,
  ListItemText,
} from "@material-ui/core";
import {
  getKeyValueInArray,
  getUrlParam,
  isUserHasPermission,
} from "Includes/functions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Actions } from "Constants/permissions";
import { withRouter } from "react-router-dom";
import MenuBookOutlinedIcon from "@material-ui/icons/MenuBookOutlined";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import loadingBar from "images/loading.gif";
import Swal from "sweetalert2";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

function StudentHolidayCalenderPlanAdd(props) {
  const [plan_name, set_plan_name] = React.useState("");
  const [fieldError, set_fieldError] = React.useState({});
  const [standardList, set_standardList] = React.useState([]);
  const [yearInfo, set_yearInfo] = React.useState({});
  const [loading, set_loading] = React.useState(true);
  const [submitDisable, set_submitDisable] = React.useState(false);
  const [update_details, set_update_details] = React.useState({});

  React.useEffect(() => {
    if (
      props.location.pathname ===
      Actions.student_holiday_calender_plan.update.url
    ) {
      if (props.location?.state?.detail) {
        let id = props.location.state.detail;
        updateHolidayPlan(id);
      } else {
        handleAddPeriodButton();
      }
    } else {
      const { year, yearName } = getUrlParam();
      set_yearInfo({ year: year, yearName: yearName });
      getStandardList(year);
    }
  }, []);

  React.useEffect(() => {
    if (update_details.name) {
      const { year, yearName } = getUrlParam();
      set_yearInfo({ year: update_details.academic_year, yearName: yearName });
      getStandardList(year);
    }
  }, [update_details]);

  const updateHolidayPlan = (id) => {
    const url = GET_URL.holidayplan.api + id + "/";
    const params = { is_active: true, academic_year: yearInfo.year };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        set_plan_name(response.data.data.name);
        set_update_details(response.data.data);
      }
    });
  };

  const getStandardList = (year) => {
    const url = GET_URL.getstandard.api;
    const params = { is_active: true, academic_year: year };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        let standard_list = response.data.data;
        standard_list.unshift({
          id: "all",
          name: "Select All",
        });
        standard_list.map((data) => {
          data.checked = false;
          if (
            props.location.pathname ===
            Actions.student_holiday_calender_plan.update.url
          ) {
            if (update_details.standard.includes(data.id)) {
              data.checked = true;
            }
          }
        });
        set_standardList(standard_list);
        set_loading(false);
      }
    });
  };

  const handleAddPeriodButton = () => {
    let yearInformation = {
      year: 1,
      yearName: "",
    };
    let searchParam = "?" + new URLSearchParams(yearInformation).toString();
    props.history.push({
      pathname: Actions.student_holiday_calender_plan.view.url,
      search: searchParam,
    });
  };

  const onChange = (e) => {
    const { value } = e.target;
    let fieldErrorTemp = { ...fieldError };
    delete fieldErrorTemp["plan_name"];
    set_fieldError(fieldErrorTemp);
    set_plan_name(value);
  };

  const getSelectedStandardCount = () => {
    let tempList = [...standardList];
    tempList.splice(0, 1);
    let count = tempList.filter((x, i) => {
      return x.checked;
    }).length;
    return <Box className="add-exam-total-box">Total : {count}</Box>;
  };

  const onChangeStandard = (index) => {
    let fieldErrorTemp = { ...fieldError };
    let tempList = [...standardList];
    let is_all_checked = true;
    tempList[index]["checked"] = !tempList[index]["checked"];
    if (tempList[index]["id"] === "all") {
      tempList.map((data) => {
        data["checked"] = tempList[index]["checked"];
      });
    } else {
      tempList.map((data) => {
        if (!data["checked"] && data["id"] !== "all") {
          is_all_checked = false;
        }
      });
      tempList[0]["checked"] = is_all_checked;
    }
    delete fieldErrorTemp["error_text"];
    set_fieldError(fieldErrorTemp);
    set_standardList([...tempList]);
  };

  const handleSubmit = () => {
    let validation = validationAndGetPost();
    if (validation) {
      if (
        props.location.pathname ===
        Actions.student_holiday_calender_plan.update.url
      ) {
        set_submitDisable(true);
        let url = PUT_URL.holidayplan.api + update_details.id + "/";
        putRequest(url, validation, props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: "Your Data has been saved",
              showConfirmButton: false,
              timer: 1500,
            });
            handleAddPeriodButton();
          }
          set_submitDisable(false);
        });
      } else {
        set_submitDisable(true);
        let url = POST_URL.holidayplan.api;
        postRequest(url, validation, props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: "Your Data has been saved",
              showConfirmButton: false,
              timer: 1500,
            });
            handleAddPeriodButton();
          }
          set_submitDisable(false);
        });
      }
    }
  };

  const validationAndGetPost = () => {
    let return_value = true;
    let fieldErrorTemp = {};
    if (!plan_name) {
      fieldErrorTemp["plan_name"] = "Enter Plan Name";
      return_value = false;
    }
    const std_list = getIds();
    if (std_list.length === 0) {
      fieldErrorTemp["error_text"] = "Select Standard";
      return_value = false;
    }
    if (return_value) {
      return_value = {
        name: plan_name,
        standard: getIds(),
        academic_year: yearInfo.year,
      };
    } else {
      set_fieldError(fieldErrorTemp);
    }
    return return_value;
  };

  const getIds = () => {
    let ids = [];
    standardList.map((data) => {
      if (data.checked && data.id !== "all") {
        ids.push(data["id"]);
      }
    });
    return ids;
  };

  if (loading) {
    return (
      <Box display="flex">
        <img src={loadingBar} className="loading" alt="loading" />
      </Box>
    );
  } else {
    return (
      <Paper className={"paper-background"}>
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Box className="heading">
              Student Holiday Calender Plan - {`${yearInfo.yearName}`}
            </Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className="header-align end-flex-prop">
              {isUserHasPermission("student_holiday_calender_plan", "view") && (
                <Button
                  variant="contained"
                  onClick={handleAddPeriodButton}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                  {Actions.student_holiday_calender_plan.view.label}
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
        <Paper className="plan-paper-background mt-20 p-20">
          <div className="width-300px">
            <TextField
              variant="outlined"
              autoFocus
              margin="dense"
              id="name"
              label="Plan Name"
              type="name"
              value={plan_name}
              onChange={onChange}
              helperText={fieldError["plan_name"] && fieldError["plan_name"]}
              error={fieldError["plan_name"] && fieldError["plan_name"]}
              inputProps={{ maxLength: 200 }}
              className="width-100-perc"
              autoComplete="off"
            />
          </div>
          <div className="text-red mt-20 text-bold">
            {fieldError["error_text"]}
          </div>
          <div>
            <div className="display-flex mt-20">
              <div className="add-exam-standard-list-label">
                {`${alias_names["standard"]} List`}
                <MenuBookOutlinedIcon />
              </div>
              <div className="add-exam-total-box">
                {getSelectedStandardCount()}
              </div>
            </div>
            <div style={{ width: "50%" }}>
              {standardList.map((standard, index) => {
                return (
                  <div className="">
                    <MenuItem
                      className="padding-0"
                      key={index}
                      value={standard.name}
                      onClick={() => onChangeStandard(index)}
                    >
                      <Checkbox color="primary" checked={standard["checked"]} />
                      <div className="text-capitalize">
                        <ListItemText primary={standard.name} />
                      </div>
                    </MenuItem>
                  </div>
                );
              })}
            </div>
          </div>
          <Box className="submt-button-float-bottom" mt={3}>
            <Button
              disabled={submitDisable}
              className="submit"
              onClick={() => handleSubmit()}
            >
              Submit
            </Button>
          </Box>
        </Paper>
      </Paper>
    );
  }
}

export default withRouter(StudentHolidayCalenderPlanAdd);
