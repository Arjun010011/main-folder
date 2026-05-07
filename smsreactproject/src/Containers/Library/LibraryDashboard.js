import React, { Component } from "react";
import { Paper, Typography, Button, Tooltip, Avatar } from "@material-ui/core";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import Skeleton from "@material-ui/lab/Skeleton";
import { cloneDeep } from "lodash";
import {
  dateFormat,
  getLibCategory,
  numberWithCommas,
  numberWithCommasWithoutSymbol,
  setLibCategory,
} from "Includes/functions";
import { Refresh } from "@material-ui/icons";
import { AWS_BUCKET_URL } from "Constants";

import {
  isUserHasPermission,
  dayCheck,
  generateColorHsl,
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import { withRouter } from "react-router-dom";
import { InfoOutlined } from "@material-ui/icons/";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import book_logo from "images/book.png";
import author1 from "images/hand.jpg";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import BlankPagewithIcon from "Components/BlankPageWithIcon";

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

class DashBoardNew extends Component {
  constructor(props) {
    super(props);

    this.updateCharts = this.updateCharts.bind(this);
    this.state = {
      loading: true,
      // button_list: ["Today", "This Month", "This Academic Year"],
      button_list :["Today"],
      selected: "Today",
      statisticLoading: false,
      sendBirthdayDialog: false,
      dashBoardData: {},
      totalFeeLoading: true,
      totalAmountDetails: true,
      totalFeeError: false,
      selectedCategory: null,
      categoryList: [],
      totalPendingFeeShow: isFormDefinitionEnabled(
        "dashboard_configuration",
        "show_pending_amount",
        1
      ),
      dashboard_loading: {
        active_users: false,
      },
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
    // this.getDashBoardData();
    this.getCategoryList();
  }

  getCategoryList = () => {
    let { selectedCategory } = this.state;
    const url = GET_URL.librarycategory.api;
    const params = { is_active: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length === 1) {
          selectedCategory = response.data.data[0];
        } else if (getLibCategory()) {
          selectedCategory = getLibCategory();
        }
        this.setState(
          {
            categoryList: response.data.data,
            selectedCategory: selectedCategory,
          },
          () => {
            if (selectedCategory) {
              this.getDashBoardData();
            } else {
              this.setState({
                loading: false,
              });
            }
          }
        );
      }
    });
  };

  getDateAndTime = () => {
    const { selected } = this.state;
    let new_date = new Date();
    if (selected === "Today") {
      return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
    } else if (selected === "This Month") {
      new_date = new Date(new_date.getFullYear(), new_date.getMonth(), 1);
      return dateFormat(new_date, "YYYY-MM-DD HH:mm:ss");
    } else if (selected === "This Academic Year") {
      let start_year_date = user?.other_details?.academic_year?.start_date;
      return dateFormat(start_year_date, "YYYY-MM-DD HH:mm:ss");
    }
  };

  getDashBoardData = () => {
    this.setState({ statisticLoading: true });
    const url = POST_URL.librarydashboard.api;
    const date_time = this.getDateAndTime();
    let param = {
      for_date: date_time,
    };
    if (this.state.selectedCategory && this.state.selectedCategory.id != 'all') {
      param["category"] = this.state.selectedCategory["id"];
    }
    postRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.fine_pending_list.map((data) => {
          data["name"] = data?.issued_to_user?.student?.name
            ? data?.issued_to_user?.student?.name
            : data?.issued_to_user?.staff?.name;
        });
        this.setState({
          dashBoardData: response.data.data,
          loading: false,
          statisticLoading: false,
        });
      }
      this.setState({
        loading: false,
        statisticLoading: false,
      });
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
        },
        () => {
          this.getDashBoardData();
        }
      );
    }
  };

  handleStudentTab = () => {
    if (isUserHasPermission("library_books", "view")) {
      this.props.history.push(Actions.library_books.view.url);
    }
  };

  handleAuhtorsTab = () => {
    if (isUserHasPermission("library_authors", "view")) {
      this.props.history.push(Actions.library_authors.view.url);
    }
  };

  handlePublisherTab = () => {
    if (isUserHasPermission("library_publisher", "view")) {
      this.props.history.push(Actions.library_publisher.view.url);
    }
  };

  handleFineCollectList = () => {
    if (isUserHasPermission("library_collected_fine_list", "view")) {
      let { selected } = this.state;
      if (selected !== "Today") {
        let date = {
          dash_date: dateFormat(this.getDateAndTime(), "YYYY-MM-DD"),
        };
        let searchParam = "?" + new URLSearchParams(date).toString();
        this.props.history.push({
          pathname: Actions.library_collected_fine_list.view.url,
          search: searchParam,
        });
      } else {
        this.props.history.push(Actions.library_collected_fine_list.view.url);
      }
    }
  };

  handleSendNotification = () => {
    if (isUserHasPermission("bulk_notification", "create")) {
      this.props.history.push(Actions.bulk_notification.create.url);
    }
  };

  handleBookTab = (type, is_staff) => {
    let information = {
      type: type,
      is_staff: is_staff,
    };
    let searchParam = "?" + new URLSearchParams(information).toString();
    this.props.history.push({
      pathname: Actions.library_issue_book.view.url,
      search: searchParam,
    });
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

  handleReturnBook = () => {
    if (isUserHasPermission("library_issue_book", "view")) {
      this.props.history.push(Actions.library_issue_book.create.url);
    }
  };

  handleFinepending =() =>{
    if (isUserHasPermission("library_pending_fine_list", "view")) {
    this.props.history.push(Actions.library_pending_fine_list.view.url);
    }
  }

  handleDropDownSearch = (value) => {
    setLibCategory(value);
    this.setState(
      {
        selectedCategory: value,
      },
      () => {
        this.getDashBoardData();
      }
    );
  };

  render() {
    const {
      loading,
      dashBoardData,
      button_list,
      selected,
      statisticLoading,
      selectedCategory,
      categoryList,
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
      <div className="app">
        <div className="heading">Library Dashboard</div>
        {categoryList.length > 1 && (
          <div className="mt-15 mb-15 pl-15">
            <DropDownWithSearch
              options={categoryList}
              optionValue="name"
              name={"selectedCategory"}
              value={selectedCategory}
              onChange={(e, newValue) => this.handleDropDownSearch(newValue)}
              label="Category"
              hideClearIcon={true}
              className="width-300px"
              size="small"
              // variant="standard"
              // error={error[`selectedCategory`] && error[`selectedCategory`]}
            />
          </div>
        )}
        {!selectedCategory ? (
          <BlankPagewithIcon
            data={
              categoryList.length === 0
                ? "Create library category"
                : "Select Category To Get Dashboard"
            }
          />
        ) : (
          <>
            <div className="d-flex flex-wrap">
              <Paper
                elevation={6}
                className="dashboard-paper"
                onClick={this.handleStudentTab}
              >
                <div className="d-flex justify-content-space-between">
                  <div>
                    <div>Books</div>
                    <div style={{ fontSize: "23px" }}>
                      {numberWithCommasWithoutSymbol(
                        dashBoardData?.basic_details?.books_count
                      )}
                    </div>
                  </div>
                  <div className="d-flex">
                    <img src={book_logo} className="width-height-75px" />
                  </div>
                </div>
              </Paper>

              <Paper
                elevation={6}
                className="dashboard-paper"
                onClick={this.handleAuhtorsTab}
              >
                <div className="d-flex justify-content-space-between">
                  <div>
                    <div>Authors</div>
                    <div style={{ fontSize: "23px" }}>
                      {dashBoardData?.basic_details?.author_count}
                    </div>
                  </div>
                  <div className="d-flex">
                    <img src={author1} className="width-height-75px" />
                  </div>
                </div>
              </Paper>

              <Paper
                elevation={6}
                className="dashboard-paper"
                onClick={this.handlePublisherTab}
              >
                <div className="d-flex justify-content-space-between">
                  <div>
                    <div>Publishers</div>
                    <div style={{ fontSize: "23px" }}>
                      {numberWithCommasWithoutSymbol(
                        dashBoardData?.basic_details?.publisher_count
                      )}
                    </div>
                  </div>
                  <div className="d-flex">
                    <img src={group} className="width-height-75px" />
                    <div className="application-student-list-admitted"></div>
                  </div>
                </div>
              </Paper>
            </div>
            {statisticLoading ? (
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
                <div className="ml-20">
                  <Typography variant="h6" component="h6">
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
                            className="pointer d-flex ml-20 text-blue"
                            onClick={this.getDashBoardData}
                          >
                            <Refresh className="height-width-25px" />
                          </div>
                        </Tooltip>
                      </div>
                      <div className="">
                        {button_list.map((button_data) => {
                          return (
                            <Button
                              className={
                                selected === button_data
                                  ? "selected-tab-dash"
                                  : "not-selected-tab-dash"
                              }
                              onClick={() =>
                                this.handleSelectedTab(button_data)
                              }
                              size="small"
                            >
                              {button_data}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </Typography>
                </div>
                <div className="d-flex flex-wrap">
                  <Paper elevation={6} className="dashboard-paper">
                    <div style={{ fontWeight: "500" }}>Not Returned Books</div>
                    <div className="d-flex align-items-center justify-content-space-between">
                      <div
                        className="mt-5"
                        onClick={() =>
                          this.handleBookTab("is_issued_only", false)
                        }
                      >
                        <div>Student</div>
                        <div className="d-flex mt-5 align-items-center">
                          <div className="icon-attendance-dash">
                            <img
                              src={student_dash}
                              className="height-width-25px"
                            />
                          </div>
                          <div style={{ fontSize: "23px" }}>
                            {numberWithCommasWithoutSymbol(
                              dashBoardData?.book_statastic_details
                                ?.issued_books?.students?.count
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className="mt-5"
                        onClick={() =>
                          this.handleBookTab("is_issued_only", true)
                        }
                      >
                        <div>Teacher</div>
                        <div className="d-flex mt-5 align-items-center">
                          <div className="icon-attendance-dash">
                            <img
                              src={teacher_dash}
                              className="height-width-25px"
                            />
                          </div>
                          <div style={{ fontSize: "23px" }}>
                            {numberWithCommasWithoutSymbol(
                              dashBoardData?.book_statastic_details
                                ?.issued_books?.staffs?.count
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Paper>
                  <Paper elevation={6} className="dashboard-paper">
                    <div style={{ fontWeight: "500" }}>Returned Books</div>
                    <div className="d-flex align-items-center justify-content-space-between">
                      <div
                        className="mt-5"
                        onClick={() =>
                          this.handleBookTab("is_returned_only", false)
                        }
                      >
                        <div>Student</div>
                        <div className="d-flex mt-5 align-items-center">
                          <div className="icon-attendance-dash">
                            <img
                              src={student_dash}
                              className="height-width-25px"
                            />
                          </div>
                          <div style={{ fontSize: "23px" }}>
                            {numberWithCommasWithoutSymbol(
                              dashBoardData?.book_statastic_details
                                ?.returned_books?.students?.count
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className="mt-5"
                        onClick={() =>
                          this.handleBookTab("is_returned_only", true)
                        }
                      >
                        <div>Teacher</div>
                        <div className="d-flex mt-5 align-items-center">
                          <div className="icon-attendance-dash">
                            <img
                              src={teacher_dash}
                              className="height-width-25px"
                            />
                          </div>
                          <div style={{ fontSize: "23px" }}>
                            {numberWithCommasWithoutSymbol(
                              dashBoardData?.book_statastic_details
                                ?.returned_books?.staffs?.count
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Paper>
                  <Paper elevation={6} className="dashboard-paper">
                    <div style={{ fontWeight: "500" }}>Renewed Books</div>
                    <div className="d-flex align-items-center justify-content-space-between">
                      <div
                        className="mt-5"
                        onClick={() =>
                          this.handleBookTab("is_renewed_only", false)
                        }
                      >
                        <div>Student</div>
                        <div className="d-flex mt-5 align-items-center">
                          <div className="icon-attendance-dash">
                            <img
                              src={student_dash}
                              className="height-width-25px"
                            />
                          </div>
                          <div style={{ fontSize: "23px" }}>
                            {numberWithCommasWithoutSymbol(
                              dashBoardData?.book_statastic_details
                                ?.renewed_books?.students?.count
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className="mt-5"
                        onClick={() =>
                          this.handleBookTab("is_renewed_only", true)
                        }
                      >
                        <div>Teacher</div>
                        <div className="d-flex mt-5 align-items-center">
                          <div className="icon-attendance-dash">
                            <img
                              src={teacher_dash}
                              className="height-width-25px"
                            />
                          </div>
                          <div style={{ fontSize: "23px" }}>
                            {numberWithCommasWithoutSymbol(
                              dashBoardData?.book_statastic_details
                                ?.renewed_books?.staffs?.count
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Paper>
                </div>
                <div className="d-flex flex-wrap">
                  <Paper
                    elevation={6}
                    style={{ height: "350px", padding: "10px" }}
                    className="dashboard-paper-medium position-relative"
                  >
                    <Typography
                      variant="subtitle1"
                      className="d-flex position-relative"
                    >
                      <div style={{ fontWeight: "500" }} className="ph-10">
                        Upcoming Books Return
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                        }}
                      >
                        <img src={notification} className="height-width-40px" />
                      </div>
                    </Typography>
                    <div className="mt-20 lib-list-height">
                      {dashBoardData?.book_statastic_details?.upcoming_book_return.map(
                        (bdyData) => {
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
                                      }}
                                    />
                                  ) : (
                                    <Avatar
                                      className="dashboard-avatar"
                                      style={{
                                        backgroundColor: bgColor,
                                      }}
                                    >
                                      {bdyData.name.charAt(0)}
                                      {bdyData.name.charAt(1)}
                                    </Avatar>
                                  )}
                                </div>
                                <div className="ml-10 text-capitalize">
                                  {bdyData.name}
                                </div>
                              </div>
                              <div>{dayCheck(bdyData.due_date)}</div>
                            </div>
                          );
                        }
                      )}
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
                          color: "#157cfc",
                          fontWeight: "bolder",
                          border: "2px solid #157cfc",
                          borderRadius: "23px",
                        }}
                        // disabled
                        onClick={this.handleReturnBook}
                      >
                        Collect Books
                      </Button>
                    </div>
                  </Paper>
                  {isUserHasPermission("library_collected_fine_list", "view") && (
                    <Paper
                      elevation={6}
                      style={{ height: "350px", padding: "10px" }}
                      className="dashboard-paper-medium position-relative"
                    >
                      <Typography
                        variant="subtitle1"
                        className="d-flex position-relative"
                      >
                        <div style={{ fontWeight: "500" }} className="ph-10">
                          Fine Collected
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
                      <div className="mt-20 lib-list-height">
                        {dashBoardData?.payment_data?.fine_payment_data
                          .length === 0 ? (
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
                                  color: "#157cfc",
                                  fontWeight: "bolder",
                                }}
                                disabled
                              >
                                <div className="d-flex">
                                  <div className="mr-5">
                                    <InfoOutlined />
                                  </div>
                                  No Fine Collected {selected}
                                </div>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {dashBoardData?.payment_data?.fine_payment_data.map(
                              (bdyData) => {
                                let bgColor = generateColorHsl(bdyData.name);
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
                                            {bdyData.name.charAt(0)}
                                          </Avatar>
                                        )}
                                      </div>
                                      <div className="ml-10">
                                        {bdyData.name}
                                      </div>
                                    </div>
                                    <div>
                                      {numberWithCommas(
                                        bdyData.fine_fine_payment_data__amount
                                      )}
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
                                  color: "#157cfc",
                                  fontWeight: "bolder",
                                  border: "2px solid #157cfc",
                                  borderRadius: "23px",
                                }}
                                onClick={this.handleFineCollectList}
                              >
                                Fine Collected Details
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
                      <div style={{ fontWeight: "500" }} className="ph-10">
                        Fine Pending
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                        }}
                      >
                        <img src={notification} className="height-width-40px" />
                      </div>
                    </Typography>
                    <div className="mt-20 lib-list-height">
                      {dashBoardData?.fine_pending_list &&
                        dashBoardData?.fine_pending_list.map(
                          (bdyData, index) => {
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
                                        }}
                                      />
                                    ) : (
                                      <Avatar
                                        className="dashboard-avatar"
                                        style={{
                                          backgroundColor: bgColor,
                                        }}
                                      >
                                        {bdyData.name.charAt(0)}
                                        {bdyData.name.charAt(1)}
                                      </Avatar>
                                    )}
                                  </div>
                                  <div className="ml-10 text-capitalize">
                                    {bdyData.name}
                                  </div>
                                </div>
                                <div>{index * 12}</div>
                              </div>
                            );
                          }
                        )}
                      {/* <div className="see_all" onClick={this.handleBirthdayList}>
                    See all...
                  </div> */}
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
                          color: "#157cfc",
                          fontWeight: "bolder",
                          border: "2px solid #157cfc",
                          borderRadius: "23px",
                        }}
                        // disabled
                        onClick={this.handleFinependingList}
                      >
                        Collect Fine And Books
                      </Button>
                    </div>
                  </Paper>
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  }
}

export default withRouter(DashBoardNew);
