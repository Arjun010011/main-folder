import React, { Component } from "react";
import Chart from "react-apexcharts";
import { Paper, Typography, Button, Tooltip, Avatar } from "@material-ui/core";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import Skeleton from "@material-ui/lab/Skeleton";
import { cloneDeep } from "lodash";
import {
  dateFormat,
  getAcademicYear,
  numberWithCommas,
  numberWithCommasWithoutSymbol,
} from "Includes/functions";
import { MenuBook, Refresh, Stars } from "@material-ui/icons";
import { AWS_BUCKET_URL } from "Constants";
import { Dropdown } from "Components/DropDown";

import {
  isUserHasPermission,
  dayCheck,
  generateColorHsl,
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import { withRouter } from "react-router-dom";
import { InfoOutlined } from "@material-ui/icons/";
import WishBirthdayModal from "./Components/WishBirthdayModal";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

const group = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/group.png`;
const student_dash = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/student_d.png`;
const teacher_dash = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/teacher_d.png`;
const empty_box = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/empty-box.png`;
const cake = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/cake.gif`;
const money = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/money.gif`;
const notification = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/notification-bell.gif`;

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

const donutOptionsGlobal = {
  // labels: [],
  chart: {
    type: "donut",
  },
  legend: {
    show: false,
    position: "bottom",
  },
  fill: {
    type: "gradient",
  },
  responsive: [
    {
      breakpoint: 480,
      options: {
        chart: {
          width: 250,
        },
        legend: {
          position: "bottom",
        },
      },
    },
    {
      breakpoint: 1250,
      options: {
        chart: {
          width: 285,
        },
        legend: {
          position: "bottom",
        },
      },
    },
  ],
  noData: {
    text: "There's no data",
    align: "center",
    verticalAlign: "middle",
    offsetX: 0,
    offsetY: 0,
  },
};

// Helper function to get CSS variable value
const getCSSVariable = (variableName) => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim() || '#4680FF'; // fallback to default blue
};

// Helper function to convert hex to rgba
const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

class DashBoardNew extends Component {
  constructor(props) {
    super(props);

    this.updateCharts = this.updateCharts.bind(this);
    // Get theme colors from CSS variables
    const headingColor = getCSSVariable('--headingColor');
    const buttonBackground1 = getCSSVariable('--buttonBackground1');
    const selectedMenuItem = getCSSVariable('--selected-menu-item-background');
    
    this.themeColors = {
      headingColor,
      buttonBackground1,
      selectedMenuItem,
      // Pre-calculate rgba values for common opacities
      headingColor15: hexToRgba(headingColor, 0.15),
      headingColor25: hexToRgba(headingColor, 0.25),
      headingColor35: hexToRgba(headingColor, 0.35),
      headingColor40: hexToRgba(headingColor, 0.4),
      headingColor50: hexToRgba(headingColor, 0.5),
      headingColor05: hexToRgba(headingColor, 0.05),
      headingColor30: hexToRgba(headingColor, 0.3),
    };
    this.state = {
      loading: true,
      button_list: ["Today", "This Month", "Academic Year"],
      selected: "Today",
      statisticLoading: false,
      sendBirthdayDialog: false,
      dashBoardData: {},
      totalFeeLoading: true,
      totalAmountDetails: true,
      totalFeeError: false,
      notificationBody: [],
      totalPendingFeeShow: isFormDefinitionEnabled(
        "dashboard_configuration",
        "show_pending_amount",
        1
      ),
      dashboard_loading: {
        active_users: false,
      },
      yearList: [],
      selected_year: "",
      birthday_list: [],
      optionsMixedChart: {
        chart: {
          id: "Student_Staff_list",
          toolbar: {
            show: true,
          },
        },
        plotOptions: {
          bar: {
            columnWidth: "50%",
          },
        },
        stroke: {
          width: [4, 0, 0],
        },
        xaxis: {
          categories: [],
        },
        markers: {
          size: 6,
          strokeWidth: 3,
          fillOpacity: 0,
          strokeOpacity: 0,
          hover: {
            size: 8,
          },
        },
        yaxis: {
          tickAmount: 5,
          min: 0,
          max: 5000,
        },
      },
      seriesMixedChart: [],
      pie_series: [],
      donut_options: cloneDeep(donutOptionsGlobal),
      academic_year_students: 0,
    };
    this.setTime = null;
    this.setTimeLimit = 0;
  }

  updateCharts() {
    const max = 90;
    const min = 30;
    const newMixedSeries = [];
    this.state.seriesMixedChart.forEach((s) => {
      const data = s.data.map(() => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      });
      newMixedSeries.push({ data: data, type: s.type });
    });

    this.setState({
      seriesMixedChart: newMixedSeries,
    });
  }

  componentDidMount() {
    this.setState({
      selected_year: user?.other_details?.academic_year?.id,
    });
    this.getDashBoardData();
    this.getYearList();
    if (this.state.totalPendingFeeShow) {
      this.getTotalPendingData();
    }
  }

  getYearList = () => {
    const url = GET_URL.getacademicyear.api;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          yearList: response.data.data,
        });
      }
    });
  };

  getlongprocessingapiresult = () => {
    let params = {
      transaction_id: this.state.transaction_id,
      is_active: true,
    };
    let props = { ...this.props };
    props["return_error_message"] = true;

    if (this.state.count === 0) {
      clearInterval(this.setTime);
      this.setState({
        totalFeeLoading: false,
        totalFeeError: true,
      });
    }
    getRequest(GET_URL.longprocessingapiresult.api, params, props).then(
      (response) => {
        if (response && response.status === 200) {
          if (response?.data?.data?.is_process_running === false) {
            this.setState({
              totalFeeLoading: false,
              totalAmountDetails: response.data.data?.result_data?.fee_summary,
              totalFeeError: false,
            });
            clearInterval(this.setTime);
          }
        } else {
          clearInterval(this.setTime);
          this.setState({
            totalFeeLoading: false,
            totalFeeError: true,
          });
        }
      }
    );
  };

  getTotalPendingData = (academic_year) => {
    this.setTimeLimit = 0;
    let params = {
      long_running_process: 1,
      transaction_id: Date.now(),
      is_active: true,
      dashboard: 1,
    };
    if (academic_year) {
      params['academic_year'] = academic_year
    }
    else {
    params['academic_year']= user?.other_details?.academic_year?.id
    }
    let props = { ...this.props };
    props["return_error_message"] = true;
    getRequest(GET_URL.feecollectionreport.api, params, props).then(
      (response) => {
        clearInterval(this.setTime);
        this.setState(
          {
            transaction_id: params.transaction_id,
            totalFeeLoading: true,
            count: 60,
          },
          () => {
            this.setIntervalTime();
          }
        );
      }
    );
  };

  setIntervalTime = () => {
    this.setTime = setInterval(() => {
      this.getlongprocessingapiresult();
    }, 3000);
    this.setTimeLimit += 1;
    if (this.setTimeLimit === 40) {
      clearInterval(this.setTime);
    }
  };

  componentWillUnmount() {
    clearInterval(this.setTime);
  }

  getDateAndTime = () => {
    const { selected } = this.state;
    let new_date = new Date();
    new_date.setHours(0, 0, 0, 0);
    if (selected === "Today") {
      return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
    } else if (selected === "This Month") {
      new_date = new Date(new_date.getFullYear(), new_date.getMonth(), 1);
      return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
    } else if (selected === "Academic Year") {
      let start_year_date = user?.other_details?.academic_year?.start_date;
      return dateFormat(start_year_date, "YYYY-MM-DD HH:mm:ss");
    }
  };

  getDashBoardData = () => {
    this.setState({ statisticLoading: true });
    let {
      optionsMixedChart,
      dashBoardData,
      donut_options,
      selected_year,
      selected,
    } = this.state;
    const url = GET_URL.dashboardnew.api;
    const date_time = this.getDateAndTime();
    let param = {
      user_last_activity_from_date_time: date_time,
      notification_for_date_time: date_time,
      fee_from_date: dateFormat(date_time, "YYYY-MM-DD"),
      attendance_for_date_till: dateFormat(date_time, "YYYY-MM-DD"),
      get_user_data: 1,
      get_standard_data: 1,
      get_notification_data: 1,
      get_fee_data: 1,
      get_resource_usage: 1,
    };
    if (selected_year && selected === "Academic Year") {
      param["academic_year"] = selected_year;
    }
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        dashBoardData = { ...dashBoardData, ...response.data.data };
        if (dashBoardData?.["fee_data"]?.["collection_list"]) {
          dashBoardData["fee_data"]["collection_list"] = dashBoardData[
            "fee_data"
          ]["collection_list"].slice(0, 4);
        }
        donut_options = cloneDeep(donutOptionsGlobal);
        dashBoardData["student_active"] =
          response?.data?.data.user_data.last_activity_students_based_on_date;
        dashBoardData["staff_active"] =
          response?.data?.data.user_data.last_activity_staffs_based_on_date;
        dashBoardData["staffs"] = response?.data?.data.user_data?.total_staffs;
        dashBoardData["students"] =
          response?.data?.data.user_data?.total_students;
        dashBoardData["standards"] =
          response?.data?.data.standard_data?.number_of_standards;
        let staff_birthday = response?.data?.data?.user_data?.upcoming_staff_birthdays.map(data => ({
          ...data,
          staff_or_student: "staff"
        }));
        let student_birthday = response?.data?.data?.user_data?.upcoming_student_birthdays.map(data => ({
          ...data,
          staff_or_student: "student"
        }));
        let birthday_list_temp = [
          ...staff_birthday.slice(0, 4),
          ...student_birthday.slice(0, 4)
        ];
        if (
          typeof dashBoardData === "object" &&
          Object.keys(dashBoardData).length > 0
        ) {
          let seriesMixedChart = [];
          let staff_temp = {};
          let max_value = 0;
          if (dashBoardData?.user_data?.staff_students_data?.series) {
            dashBoardData.user_data.staff_students_data.series.map((data) => {
              staff_temp = {
                name: data.name,
                type: "column",
                data: data.data,
              };
              seriesMixedChart.push(staff_temp);
              data.data.map((stdData) => {
                if (max_value < parseInt(stdData)) {
                  max_value = parseInt(stdData);
                }
              });
            });
          }
          if (dashBoardData?.staff_attendence) {
            dashBoardData.staffs = numberWithCommasWithoutSymbol(
              dashBoardData.staff_attendence.split("/")[1]
            );
          }
          optionsMixedChart.xaxis.categories =
            dashBoardData?.user_data?.staff_students_data?.years_list ?? [];
          optionsMixedChart.yaxis.max = max_value;
          let pie_series = [444, 555];
          dashBoardData["notification_series"] =
            dashBoardData?.notification_data?.values ?? [];
          dashBoardData["notification_series"] = this.getNotificationSeries(
            dashBoardData["notification_series"]
          );
          if (
            dashBoardData["notification_series"].length !==
            dashBoardData?.notification_data?.values?.length
          ) {
            let temp_options = {};
            temp_options["colors"] = ["#ff8282"];
            temp_options["isEmpty"] = true;
            temp_options["plotOptions"] = {
              pie: {
                expandOnClick: false,
                donut: {
                  labels: {
                    show: false,
                    value: { show: false },
                    name: { show: false },
                  },
                },
              },
            };
            temp_options["dataLabels"] = {
              formatter: function (val, opt) {
                return "0%";
              },
            };
            donut_options = { ...donut_options, ...temp_options };
          } else {
            let temp_options = {};
            temp_options["plotOptions"] = {
              pie: {
                donut: {
                  labels: {
                    total: {
                      show: true,
                      label: "Total",
                      color: "#373d3f",
                      formatter: function (w) {
                        if (w && w.globals && w.globals.seriesTotals && Array.isArray(w.globals.seriesTotals)) {
                          return w.globals.seriesTotals.reduce((a, b) => {
                            return a + b;
                          }, 0);
                        }
                        return "0";
                      },
                    },
                  },
                },
              },
            };
            temp_options["labels"] =
              dashBoardData?.notification_data?.label ?? [];
            donut_options = { ...donut_options, ...temp_options };
          }
          this.setState({
            dashBoardData,
            seriesMixedChart,
            optionsMixedChart,
            loading: false,
            pie_series,
            students: max_value,
            statisticLoading: false,
            birthday_list: [...birthday_list_temp],
            notificationBody: response.data.data?.resource_usage,
            donut_options,
            academic_year_students:
              response?.data?.data?.user_data?.total_students_academic_year
                ?.students_count ?? dashBoardData["students"],
          });
        }
      }
    });
  };

  getNotificationSeries = (series) => {
    let isDataExist = false;
    series.map((data) => {
      if (parseInt(data) > 0) {
        isDataExist = true;
      }
    });
    if (!isDataExist) {
      return [1];
    }
    return series;
  };

  handleSelectedTab = (button_data) => {
    const { selected } = this.state;
    if (button_data !== selected) {
      this.setState(
        {
          selected: button_data,
          selected_year: user?.other_details?.academic_year?.id,
        },
        () => {
          this.getDashBoardData();
        }
      );
    }
  };

  handleStudentTab = () => {
    if (isUserHasPermission("general_student_list", "view")) {
      this.props.history.push(Actions.general_student_list.view.url);
    }
  };

  handleStaffTab = () => {
    if (isUserHasPermission("staff_list", "view")) {
      this.props.history.push(Actions.staff_list.view.url);
    }
  };

  handleStandardTab = () => {
    if (isUserHasPermission("standard_strength", "view")) {
      this.props.history.push(Actions.standard_strength.view.url);
    }
  };

  handleCashbookTab = () => {
    if (isUserHasPermission("cashbook", "view")) {
      let { selected } = this.state;
      if (selected !== "Today") {
        let date = {
          dash_date: dateFormat(this.getDateAndTime(), "YYYY-MM-DD"),
        };
        let searchParam = "?" + new URLSearchParams(date).toString();
        this.props.history.push({
          pathname: Actions.cashbook.view.url,
          search: searchParam,
        });
      } else {
        this.props.history.push(Actions.cashbook.view.url);
      }
    }
  };

  handleSendNotification = () => {
    if (isUserHasPermission("bulk_notification", "create")) {
      this.props.history.push(Actions.bulk_notification.create.url);
    }
  };

  handleAttendanceTab = (name) => {
    if (name === "student") {
      if (isUserHasPermission("studentattendance_report", "view")) {
        // let { selected } = this.state;
        // if (selected !== "Today") {
        //   let date = {
        //     dash_date: dateFormat(this.getDateAndTime(), "YYYY-MM-DD"),
        //   };
        //   let searchParam = "?" + new URLSearchParams(date).toString();
        //   this.props.history.push({
        //     pathname: Actions.attendance_dashboard.view.url,
        //     search: searchParam,
        //   });
        // }
        // else{
        //   this.props.history.push(Actions.attendance_dashboard.view.url);
        // }
        this.props.history.push(Actions.studentattendance_report.view.url);
      }
    } else if (name === "staff") {
      if (isUserHasPermission("staff_attendance_report", "view")) {
        this.props.history.push(Actions.staff_attendance_report.view.url);
      }
    }
  };

  handleActiveStudentsTab = () => {
    if (isUserHasPermission("user_active_list", "view")) {
      let { selected } = this.state;
      let date = {
        selected: selected,
      };
      let searchParam = "?" + new URLSearchParams(date).toString();
      this.props.history.push({
        pathname: Actions.user_active_list.view.url,
        search: searchParam,
      });
    }
  };

  handleBirthdayList = () => {
    if (isUserHasPermission("user_birthday_list", "view")) {
      this.props.history.push(Actions.user_birthday_list.view.url);
    }
  };

  handleAiLessonPlanTab = () => {
    if (isUserHasPermission("ai_lesson_plan_upload", "view")) {
      this.props.history.push(Actions.ai_lesson_plan_upload.view.url);
    }
  };

  handleLessonPlanAllocationTab = () => {
    if (isUserHasPermission("lesson_plan_allocation", "view")) {
      this.props.history.push(Actions.lesson_plan_allocation.view.url);
    }
  };

  handleSendBirthday = () => {
    this.setState({
      sendBirthdayDialog: !this.state.sendBirthdayDialog,
    });
  };

  onChange = (e) => {
    let { name, value } = e.target;
    if (this.state.totalPendingFeeShow) {
      this.getTotalPendingData(value);
    }
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getDashBoardData();
      }
    );
  };

  render() {
    const {
      loading,
      optionsMixedChart,
      seriesMixedChart,
      sendBirthdayDialog,
      dashBoardData,
      button_list,
      selected,
      statisticLoading,
      birthday_list,
      donut_options,
      totalFeeLoading,
      dashboard_loading,
      totalAmountDetails,
      totalFeeError,
      totalPendingFeeShow,
      yearList,
      selected_year,
      academic_year_students,
      notificationBody,
    } = this.state;
    if (loading) {
      return (
        <div className="mt-60">
          <div className="d-flex flex-wrap">
            <div className="dash-skeleton-card">
              <Skeleton
                animation="wave"
                variant="rect"
                className="dashboard-paper-skeleton"
              ></Skeleton>
            </div>
            <div className="dash-skeleton-card">
              <Skeleton
                animation="wave"
                variant="rect"
                className="dashboard-paper-skeleton"
              ></Skeleton>
            </div>
            <div className="dash-skeleton-card">
              <Skeleton
                animation="wave"
                variant="rect"
                className="dashboard-paper-skeleton"
              ></Skeleton>
            </div>
          </div>
          <div className="d-flex flex-wrap mt-20">
            <div className="dash-skeleton-card">
              <Skeleton
                animation="wave"
                variant="rect"
                className="dashboard-paper-skeleton"
              ></Skeleton>
            </div>
            <div className="dash-skeleton-card">
              <Skeleton
                animation="wave"
                variant="rect"
                className="dashboard-paper-skeleton"
              ></Skeleton>
            </div>
            <div className="dash-skeleton-card">
              <Skeleton
                animation="wave"
                variant="rect"
                className="dashboard-paper-skeleton"
              ></Skeleton>
            </div>
          </div>
          <div className="d-flex flex-wrap">
            <div className="dash-skeleton-card">
              <Skeleton
                animation="wave"
                variant="rect"
                className="dashboard-paper-medium-skeleton"
              ></Skeleton>
            </div>
            <div className="dash-skeleton-card">
              <Skeleton
                animation="wave"
                variant="rect"
                className="dashboard-paper-medium-skeleton"
              ></Skeleton>
            </div>
            <div className="dash-skeleton-card">
              <Skeleton
                animation="wave"
                variant="rect"
                className="dashboard-paper-medium-skeleton"
              ></Skeleton>
            </div>
          </div>
        </div>
      );
    }
    return (
      <>
        {user["is_staff"] ? (
          <div className="app">
            <div className="ml-20 pt-15">
              <Typography variant="h6" component="h6" style={{ fontWeight: 700, color: "#1e293b", fontSize: "24px" }}>
                <div className="d-flex flex-wrap">
                  <div className="d-flex align-items-center ">
                    Statistics
                    <Tooltip
                      title={"Refresh Statistics"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <div
                        className="pointer d-flex ml-20"
                        onClick={this.getDashBoardData}
                        style={{
                          color: this.themeColors.headingColor,
                          padding: "8px",
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${this.themeColors.headingColor15} 0%, ${this.themeColors.headingColor25} 100%)`,
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${this.themeColors.headingColor25} 0%, ${this.themeColors.headingColor35} 100%)`;
                          e.currentTarget.style.transform = "rotate(180deg) scale(1.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = `linear-gradient(135deg, color-mix(in srgb, ${this.themeColors.headingColor} 15%, white) 0%, color-mix(in srgb, ${this.themeColors.headingColor} 25%, white) 100%)`;
                          e.currentTarget.style.transform = "rotate(0deg) scale(1)";
                        }}
                      >
                        <Refresh className="height-width-25px" />
                      </div>
                    </Tooltip>
                  </div>
                  <div className="d-flex align-items-center flex-wrap">
                    {button_list.map((button_data) => {
                      return (
                        <Button
                          className={
                            selected === button_data
                              ? "selected-tab-dash"
                              : "not-selected-tab-dash"
                          }
                          onClick={() => this.handleSelectedTab(button_data)}
                          size="small"
                        >
                          {button_data}
                        </Button>
                      );
                    })}
                    <div className="pl-5 d-flex align-items-center">
                      <Dropdown
                        data={yearList}
                        name="selected_year"
                        disabled={selected !== "Academic Year"}
                        value={selected_year}
                        onChange={this.onChange}
                        hideSelect={true}
                        // fullWidth
                        size={"small"}
                        selectClassName={"custom-style-dropdown"}
                      />
                    </div>
                  </div>
                </div>
              </Typography>
            </div>
            {statisticLoading ? (
              <div className="d-flex flex-wrap">
                <div className="dash-skeleton-card">
                  <Skeleton
                    animation="wave"
                    variant="rect"
                    className="dashboard-paper-skeleton"
                  ></Skeleton>
                </div>
                <div className="dash-skeleton-card">
                  <Skeleton
                    animation="wave"
                    variant="rect"
                    className="dashboard-paper-skeleton"
                  ></Skeleton>
                </div>
                <div className="dash-skeleton-card">
                  <Skeleton
                    animation="wave"
                    variant="rect"
                    className="dashboard-paper-skeleton"
                  ></Skeleton>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-wrap pt-15">
                {isUserHasPermission("ai_lesson_plan_upload", "view") && (
                  <Paper
                    elevation={6}
                    className="dashboard-paper"
                    onClick={this.handleAiLessonPlanTab}
                  >
                    <div className="d-flex justify-content-space-between align-items-center">
                      <div>
                        <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>AI Lesson Plan</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "#4f46e5", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          Generate
                        </div>
                      </div>
                      <div className="d-flex align-items-center justify-content-center" style={{ background: "rgba(79, 70, 229, 0.1)", borderRadius: "12px", width: "50px", height: "50px" }}>
                        <Stars style={{ fontSize: "30px", color: "#4f46e5" }} />
                      </div>
                    </div>
                  </Paper>
                )}

                {isUserHasPermission("lesson_plan_allocation", "view") && (
                  <Paper
                    elevation={6}
                    className="dashboard-paper"
                    onClick={this.handleLessonPlanAllocationTab}
                  >
                    <div className="d-flex justify-content-space-between align-items-center">
                      <div>
                        <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>Lesson Plans</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "#059669", background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          View All
                        </div>
                      </div>
                      <div className="d-flex align-items-center justify-content-center" style={{ background: "rgba(5, 150, 105, 0.1)", borderRadius: "12px", width: "50px", height: "50px" }}>
                        <MenuBook style={{ fontSize: "30px", color: "#059669" }} />
                      </div>
                    </div>
                  </Paper>
                )}

                <Paper
                  elevation={6}
                  className="dashboard-paper"
                  onClick={this.handleStudentTab}
                >
                  <div className="d-flex justify-content-space-between">
                    <div>
                      <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>Students</div>
                      <div style={{ fontSize: "28px", fontWeight: 700, color: this.themeColors.headingColor, background: `linear-gradient(135deg, ${this.themeColors.headingColor} 0%, ${this.themeColors.buttonBackground1} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {numberWithCommasWithoutSymbol(academic_year_students)}
                      </div>
                    </div>
                    <div className="d-flex">
                      <img src={student_dash} className="width-height-75px" />
                    </div>
                  </div>
                </Paper>

                <Paper
                  elevation={6}
                  className="dashboard-paper"
                  onClick={this.handleStaffTab}
                >
                  <div className="d-flex justify-content-space-between">
                    <div>
                      <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>Staffs</div>
                      <div style={{ fontSize: "28px", fontWeight: 700, color: this.themeColors.buttonBackground1, background: `linear-gradient(135deg, ${this.themeColors.buttonBackground1} 0%, ${this.themeColors.selectedMenuItem} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {dashBoardData.staffs}
                      </div>
                    </div>
                    <div className="d-flex">
                      <img src={teacher_dash} className="width-height-75px" />
                    </div>
                  </div>
                </Paper>

                <Paper
                  elevation={6}
                  className="dashboard-paper"
                  onClick={this.handleStandardTab}
                >
                  <div className="d-flex justify-content-space-between">
                    <div>
                      <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>Standards</div>
                      <div style={{ fontSize: "28px", fontWeight: 700, color: this.themeColors.selectedMenuItem, background: `linear-gradient(135deg, ${this.themeColors.selectedMenuItem} 0%, ${this.themeColors.buttonBackground1} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {numberWithCommasWithoutSymbol(dashBoardData.standards)}
                      </div>
                    </div>
                    <div className="d-flex">
                      <img src={group} className="width-height-75px" />
                      <div className="application-student-list-admitted"></div>
                    </div>
                  </div>
                </Paper>
              </div>
            )}

            {statisticLoading ? (
              <div>
                <div className="d-flex flex-wrap">
                  <div className="dash-skeleton-card">
                    <Skeleton
                      animation="wave"
                      variant="rect"
                      className="dashboard-paper-skeleton"
                    ></Skeleton>
                  </div>
                  <div className="dash-skeleton-card">
                    <Skeleton
                      animation="wave"
                      variant="rect"
                      className="dashboard-paper-skeleton"
                    ></Skeleton>
                  </div>
                  <div className="dash-skeleton-card">
                    <Skeleton
                      animation="wave"
                      variant="rect"
                      className="dashboard-paper-skeleton"
                    ></Skeleton>
                  </div>
                </div>
                <div className="d-flex flex-wrap">
                  <div className="dash-skeleton-card">
                    <Skeleton
                      animation="wave"
                      variant="rect"
                      className="dashboard-paper-medium-skeleton"
                    ></Skeleton>
                  </div>
                  <div className="dash-skeleton-card">
                    <Skeleton
                      animation="wave"
                      variant="rect"
                      className="dashboard-paper-medium-skeleton"
                    ></Skeleton>
                  </div>
                  <div className="dash-skeleton-card">
                    <Skeleton
                      animation="wave"
                      variant="rect"
                      className="dashboard-paper-medium-skeleton"
                    ></Skeleton>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="d-flex flex-wrap">
                  <Paper elevation={6} className="dashboard-paper">
                    <div style={{ fontWeight: "600", fontSize: "16px", color: "#1e293b", marginBottom: "12px" }}>Attendance</div>
                    <div className="d-flex align-items-center justify-content-space-between">
                      <div
                        className="mt-5"
                        onClick={() => this.handleAttendanceTab("student")}
                      >
                        <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Student</div>
                        <div className="d-flex mt-5 align-items-center">
                          <div className="icon-attendance-dash">
                            <img
                              src={student_dash}
                              className="height-width-25px"
                            />
                          </div>
                          <div style={{ fontSize: "24px", fontWeight: 700, color: this.themeColors.headingColor }}>
                            {Math.round(
                              dashBoardData?.user_data?.student_attendance
                                ?.present_percentage
                            )}
                            %
                          </div>
                        </div>
                      </div>
                      <div
                        className="mt-5"
                        onClick={() => this.handleAttendanceTab("staff")}
                      >
                        <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Staffs</div>
                        <div className="d-flex mt-5 align-items-center">
                          <div className="icon-attendance-dash">
                            <img
                              src={teacher_dash}
                              className="height-width-25px"
                            />
                          </div>
                          <div style={{ fontSize: "24px", fontWeight: 700, color: this.themeColors.buttonBackground1 }}>
                            {Math.round(
                              dashBoardData?.user_data?.staff_attendance
                                ?.present_percentage
                            )}
                            %
                          </div>
                        </div>
                      </div>
                    </div>
                  </Paper>
                  {isUserHasPermission("cashbook", "view") && (
                    <Paper elevation={6} className="dashboard-paper">
                      <div style={{ fontWeight: "600", fontSize: "16px", color: "#1e293b", marginBottom: "12px" }}>Fees</div>
                      <div className="d-flex flex-wrap align-items-center justify-content-space-between">
                        <div className="mt-5">
                          <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Collection</div>
                          <div
                            onClick={this.handleCashbookTab}
                            className="d-flex mt-5 align-items-center"
                          >
                            <div className="rs-style-div">₹</div>
                            <div
                              style={{
                                fontSize: totalPendingFeeShow ? "18px" : "24px",
                                fontWeight: 700,
                                color: "#10b981",
                              }}
                            >
                              {numberWithCommas(
                                dashBoardData?.fee_data?.total_collected ?? 0
                              )}
                            </div>
                          </div>
                        </div>
                        {totalPendingFeeShow && (
                          <div className="mt-5 ">
                            <div className="d-flex align-items-center">
                              <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 500 }}>Total Pending</div>
                              <Tooltip
                                title={"Refresh Total Fee Track"}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <div
                                  className="pointer d-flex ml-20"
                                  onClick={() => this.getTotalPendingData(this.state.selected_year)}
                                  style={{
                                    color: this.themeColors.headingColor,
                                    padding: "6px",
                                    borderRadius: "50%",
                                    background: `linear-gradient(135deg, ${this.themeColors.headingColor15} 0%, ${this.themeColors.headingColor25} 100%)`,
                                    transition: "all 0.3s ease",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "28px",
                                    height: "28px",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = `linear-gradient(135deg, ${this.themeColors.headingColor25} 0%, ${this.themeColors.headingColor35} 100%)`;
                                    e.currentTarget.style.transform = "rotate(180deg) scale(1.1)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = `linear-gradient(135deg, ${this.themeColors.headingColor15} 0%, ${this.themeColors.headingColor25} 100%)`;
                                    e.currentTarget.style.transform = "rotate(0deg) scale(1)";
                                  }}
                                >
                                  <Refresh className="height-width-25px" />
                                </div>
                              </Tooltip>
                            </div>
                            {totalFeeLoading ? (
                              <div style={{ minWidth: "160px" }}>
                                <Skeleton
                                  animation="wave"
                                  variant="rect"
                                  className="dashboard-total-pending"
                                ></Skeleton>
                              </div>
                            ) : (
                              <>
                              <div
                                onClick={this.handleCashbookTab}
                                className="d-flex mt-5 align-items-center"
                              >
                                {totalFeeError ? (
                                  <Tooltip
                                    title={
                                      "Something Wrong !!!. Please refresh again"
                                    }
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <div className="rs-style-div text-red">
                                      !
                                    </div>
                                  </Tooltip>
                                ) : (
                                  <div className="rs-style-div">₹</div>
                                )}
                                <div style={{ fontSize: "16px" }}>
                                  {numberWithCommas(
                                    totalAmountDetails?.total_pending_amount ??
                                    0
                                  )}
                                </div>
                              </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </Paper>
                  )}
                  {dashboard_loading.active_users ? (
                    <div className="dash-skeleton-card">
                      <Skeleton
                        animation="wave"
                        variant="rect"
                        className="dashboard-paper-skeleton"
                      ></Skeleton>
                    </div>
                  ) : (
                    <Paper
                      elevation={6}
                      className="dashboard-paper"
                      onClick={this.handleActiveStudentsTab}
                    >
                      <div style={{ fontWeight: "600", fontSize: "16px", color: "#1e293b", marginBottom: "12px" }}>Active Users</div>
                      <div className="d-flex align-items-center justify-content-space-between">
                        <div className="mt-5">
                          <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Student</div>
                          <div className="d-flex mt-5 align-items-center">
                            <div className="icon-attendance-dash">
                              <img
                                src={student_dash}
                                className="height-width-25px"
                              />
                            </div>
                            <div style={{ fontSize: "24px", display: "flex", fontWeight: 700, color: this.themeColors.headingColor }}>
                              {parseInt(dashBoardData.student_active)}
                              <div
                                style={{
                                  fontSize: "14px",
                                  alignSelf: "center",
                                  color: "#94a3b8",
                                  marginLeft: "4px",
                                }}
                              >
                                /{dashBoardData.students}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "#64748b", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Staffs</div>
                          <div className="d-flex mt-5 align-items-center">
                            <div className="icon-attendance-dash">
                              <img
                                src={teacher_dash}
                                className="height-width-25px"
                              />
                            </div>
                            <div style={{ fontSize: "24px", display: "flex", fontWeight: 700, color: this.themeColors.buttonBackground1 }}>
                              {parseInt(dashBoardData.staff_active)}
                              <div
                                style={{
                                  fontSize: "14px",
                                  alignSelf: "center",
                                  color: "#94a3b8",
                                  marginLeft: "4px",
                                }}
                              >
                                /{dashBoardData.staffs}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Paper>
                  )}
                </div>
                <div className="d-flex flex-wrap">
                  {isUserHasPermission("dashboard_resources", "view") && (
                    <Paper
                      elevation={6}
                      style={{ height: "350px", padding: "10px" }}
                      className="dashboard-paper-medium position-relative"
                    >
                      <Typography
                        variant="subtitle1"
                        className="d-flex position-relative"
                      >
                        <div style={{ fontWeight: "600", fontSize: "16px", color: "#1e293b" }} className="ph-10">
                          Resources
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                          }}
                        >
                          <img
                            src={notification}
                            className="height-width-40px"
                          />
                        </div>
                      </Typography>
                      <div className={"text-align-web-center"}>
                        <div className="mt-20">
                          <table className="custom-resource-table">
                            <thead className="custom-resource-thead">
                              <tr className="thead-drawernew">
                                <th>Resource </th>
                                {/* <th className="text-align-right">Max</th> */}
                                <th className="text-align-right">Usage</th>
                                <th className="text-align-right">Available</th>
                              </tr>
                            </thead>
                            <tbody className="custom-resource-tbody">
                              {notificationBody.map((data) => {
                                return (
                                  <tr className="tbody-dashboard custom-resource-tr">
                                    <td className="p-5px">
                                      {data.alias_name
                                        ? data.alias_name
                                        : data.name}
                                    </td>
                                    {/* <td className="text-align-right">
                                    {data.max_limit}
                                  </td> */}
                                    <td className="p-5px text-align-right">
                                      {data.usage}
                                    </td>
                                    <td className="p-5px text-align-right">
                                      {data.available}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {isUserHasPermission("bulk_notification", "create") && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "10px",
                            width: "-webkit-fill-available",
                            textAlign: "center",
                          }}
                        >
                          <Button
                            style={{
                              color: "#ffffff",
                              fontWeight: "600",
                              background: `linear-gradient(135deg, ${this.themeColors.headingColor} 0%, ${this.themeColors.buttonBackground1} 100%)`,
                              border: "none",
                              borderRadius: "12px",
                              padding: "10px 24px",
                              boxShadow: `0px 4px 16px ${this.themeColors.headingColor40}`,
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              textTransform: "none",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `linear-gradient(135deg, ${this.themeColors.buttonBackground1} 0%, ${this.themeColors.selectedMenuItem} 100%)`;
                              e.currentTarget.style.boxShadow = `0px 6px 20px ${this.themeColors.headingColor50}`;
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = `linear-gradient(135deg, ${this.themeColors.headingColor} 0%, ${this.themeColors.buttonBackground1} 100%)`;
                              e.currentTarget.style.boxShadow = `0px 4px 16px color-mix(in srgb, ${this.themeColors.headingColor} 40%, transparent)`;
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            onClick={this.handleSendNotification}
                          >
                            Send Notification
                          </Button>
                        </div>
                      )}
                    </Paper>
                  )}
                  {isUserHasPermission("cashbook", "view") && (
                    <Paper
                      elevation={6}
                      style={{ height: "350px", padding: "10px" }}
                      className="dashboard-paper-medium position-relative"
                    >
                      <Typography
                        variant="subtitle1"
                        className="d-flex position-relative"
                      >
                        <div style={{ fontWeight: "600", fontSize: "16px", color: "#1e293b" }} className="ph-10">
                          Fees Collected
                        </div>

                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: -5,
                          }}
                        >
                          <img src={money} className="height-width-40px" />
                        </div>
                      </Typography>
                      <div className="mt-20">
                        {dashBoardData?.fee_data?.collection_list.length ===
                          0 ? (
                          <div className="text-align-center">
                            <img
                              src={empty_box}
                              className="height-width-200px"
                            />
                            <div
                              style={{
                                position: "absolute",
                                bottom: "10px",
                                width: "-webkit-fill-available",
                              }}
                            >
                              <Button
                                style={{
                                  color: this.themeColors.headingColor,
                                  fontWeight: "600",
                                  background: `linear-gradient(135deg, ${this.themeColors.headingColor05} 0%, ${this.themeColors.headingColor15} 100%)`,
                                  border: `2px solid ${this.themeColors.headingColor30}`,
                                  borderRadius: "12px",
                                  padding: "10px 24px",
                                  textTransform: "none",
                                }}
                                disabled
                              >
                                <div className="d-flex">
                                  <div className="mr-5">
                                    <InfoOutlined />
                                  </div>
                                  No Fees Collected {selected}
                                </div>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {dashBoardData?.fee_data?.collection_list.map(
                              (bdyData) => {
                                let bgColor = generateColorHsl(
                                  bdyData.fee_type_name
                                );
                                return (
                                  <div className="d-flex align-items-center ph-10 pv-5 justify-content-space-between mt-5 profile-div">
                                    <div className="d-flex align-items-center">
                                      <div>
                                        {bdyData.img ? (
                                          <img
                                            src={"aler"}
                                            alt="Profile Pic"
                                            style={{
                                              borderRadius: "50%",
                                              width: "40px",
                                            }}
                                          />
                                        ) : (
                                          <Avatar
                                            className="dashboard-avatar"
                                            style={{
                                              backgroundColor: bgColor,
                                            }}
                                          >
                                            {bdyData.fee_type_name ? bdyData.fee_type_name.charAt(0) : '?'}
                                          </Avatar>
                                        )}
                                      </div>
                                      <div className="ml-10">
                                        {bdyData.fee_type_name}
                                      </div>
                                    </div>
                                    <div>
                                      {numberWithCommas(bdyData.amount)}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                            <div
                              style={{
                                position: "absolute",
                                bottom: "10px",
                                width: "-webkit-fill-available",
                                textAlign: "center",
                              }}
                            >
                              <Button
                                style={{
                                  color: "#ffffff",
                                  fontWeight: "600",
                                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                                  border: "none",
                                  borderRadius: "12px",
                                  padding: "10px 24px",
                                  boxShadow: "0px 4px 16px rgba(99, 102, 241, 0.4)",
                                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  textTransform: "none",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)";
                                  e.currentTarget.style.boxShadow = "0px 6px 20px rgba(99, 102, 241, 0.5)";
                                  e.currentTarget.style.transform = "translateY(-2px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";
                                  e.currentTarget.style.boxShadow = "0px 4px 16px rgba(99, 102, 241, 0.4)";
                                  e.currentTarget.style.transform = "translateY(0)";
                                }}
                                onClick={this.handleCashbookTab}
                              >
                                Fee Detail Collections
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </Paper>
                  )}
                  <Paper
                    elevation={6}
                    style={{ height: "350px", padding: "10px 10px" }}
                    className="dashboard-paper-medium position-relative"
                  >
                    <Typography
                      variant="subtitle1"
                      className="d-flex align-items-center justify-content-space-between position-relative mb-10"
                    >
                      <div style={{ fontWeight: "600", fontSize: "16px", color: "#1e293b" }} className="ph-10">
                        Upcoming Birthdays
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: -10,
                        }}
                      >
                        <img src={cake} className="height-width-50px" />
                      </div>
                    </Typography>
                    <div className="mt-20">
                      {birthday_list.map((bdyData) => {
                        let bgColor = generateColorHsl(bdyData.name);
                        return (
                          <div className="d-flex align-items-center ph-10 pv-5 justify-content-space-between mt-5 profile-div">
                            <div className="d-flex align-items-center">
                              <div>
                                {bdyData.profile_pic_url ? (
                                  <img
                                    src={bdyData.profile_pic_url}
                                    alt="Profile Pic"
                                    style={{
                                      borderRadius: "50%",
                                      width: "40px",
                                      height: "40px",
                                    }}
                                  />
                                ) : (
                                  <Avatar
                                    className="dashboard-avatar"
                                    style={{
                                      backgroundColor: bgColor,
                                    }}
                                  >
                                    {bdyData.name ? bdyData.name.charAt(0) : '?'}
                                    {bdyData.name && bdyData.name.length > 1 ? bdyData.name.charAt(1) : ''}
                                  </Avatar>
                                )}
                              </div>
                              <div className="ml-10 text-capitalize">
                                {bdyData.name}
                                <span>({bdyData.staff_or_student === "staff" ? "Staff" : "Student"})</span>
                              </div>
                            </div>
                            <div>{dayCheck(bdyData.date)}</div>
                          </div>
                        );
                      })}
                      <div
                        className="see_all"
                        onClick={this.handleBirthdayList}
                      >
                        See all...
                      </div>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        width: "-webkit-fill-available",
                        textAlign: "center",
                      }}
                    >
                      <Button
                        style={{
                          color: "#ffffff",
                          fontWeight: "600",
                          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                          border: "none",
                          borderRadius: "12px",
                          padding: "10px 24px",
                          boxShadow: "0px 4px 16px rgba(99, 102, 241, 0.4)",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          textTransform: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)";
                          e.currentTarget.style.boxShadow = "0px 6px 20px rgba(99, 102, 241, 0.5)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";
                          e.currentTarget.style.boxShadow = "0px 4px 16px rgba(99, 102, 241, 0.4)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                        onClick={this.handleSendBirthday}
                      >
                        Wish Them Happy Birthday
                      </Button>
                    </div>
                  </Paper>
                </div>
                <div className="d-flex flex-wrap">
                  <Paper
                    elevation={6}
                    style={{ width: "93%", padding: "5px" }}
                    className="dashboard-paper-student-staff"
                  >
                    <Chart
                      options={optionsMixedChart}
                      series={seriesMixedChart}
                      type="line"
                      width="90%"
                    />
                  </Paper>
                </div>
              </>
            )}
            {sendBirthdayDialog && (
              <WishBirthdayModal closeInParent={this.handleSendBirthday} />
            )}
          </div>
        ):<>
          <div className="app">
            <div className="ml-20 pt-15">
            <div className="mt-20">
            <Paper
                    elevation={6}
                    style={{ height: "350px", padding: "10px 10px" }}
                    className="dashboard-paper-medium position-relative"
                  >
                    <Typography
                      variant="subtitle1"
                      className="d-flex align-items-center justify-content-space-between position-relative mb-10"
                    >
                      <div style={{ fontWeight: "600", fontSize: "16px", color: "#1e293b" }} className="ph-10">
                        Upcoming Birthdays
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: -10,
                        }}
                      >
                        <img src={cake} className="height-width-50px" />
                      </div>
                    </Typography>
                    <div className="mt-20">
                      {birthday_list.map((bdyData) => {
                        let bgColor = generateColorHsl(bdyData.name);
                        return (
                          <div className="d-flex align-items-center ph-10 pv-5 justify-content-space-between mt-5 profile-div">
                            <div className="d-flex align-items-center">
                              <div>
                                {bdyData.profile_pic_url ? (
                                  <img
                                    src={bdyData.profile_pic_url}
                                    alt="Profile Pic"
                                    style={{
                                      borderRadius: "50%",
                                      width: "40px",
                                      height: "40px",
                                    }}
                                  />
                                ) : (
                                  <Avatar
                                    className="dashboard-avatar"
                                    style={{
                                      backgroundColor: bgColor,
                                    }}
                                  >
                                    {bdyData.name ? bdyData.name.charAt(0) : '?'}
                                    {bdyData.name && bdyData.name.length > 1 ? bdyData.name.charAt(1) : ''}
                                  </Avatar>
                                )}
                              </div>
                              <div className="ml-10 text-capitalize">
                                {bdyData.name}
                                <span>({bdyData.staff_or_student === "staff" ? "Staff" : "Student"})</span>
                              </div>
                            </div>
                            <div>{dayCheck(bdyData.date)}</div>
                          </div>
                        );
                      })}
                      <div
                        className="see_all"
                        onClick={this.handleBirthdayList}
                      >
                        See all...
                      </div>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        width: "-webkit-fill-available",
                        textAlign: "center",
                      }}
                    >
                      <Button
                        style={{
                          color: "#ffffff",
                          fontWeight: "600",
                          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                          border: "none",
                          borderRadius: "12px",
                          padding: "10px 24px",
                          boxShadow: "0px 4px 16px rgba(99, 102, 241, 0.4)",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          textTransform: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)";
                          e.currentTarget.style.boxShadow = "0px 6px 20px rgba(99, 102, 241, 0.5)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";
                          e.currentTarget.style.boxShadow = "0px 4px 16px rgba(99, 102, 241, 0.4)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                        onClick={this.handleSendBirthday}
                      >
                        Wish Them Happy Birthday
                      </Button>
                    </div>
                  </Paper>
            </div>
            </div>
          </div>
        </>}
      </>
    );
  }
}

export default withRouter(DashBoardNew);
