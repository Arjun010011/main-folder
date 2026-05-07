import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Icon,
  CircularProgress,
  TextField,
} from "@material-ui/core";
import { Link } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import Swal from "sweetalert2";
import { Dropdown } from "Components/DropDown";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";
import ErrorHandler from "Components/ErrorHandler";

import StudentGridCard from "Components/ProfileGridCard";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  dateFormat,
  getIsGridOrListView,
  setIsGridOrListView,
  getAcademicYear,
  SetAcademicYear,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { multiOptions } from "Constants";

class StaffIdCardGenerator extends Component {
  constructor() {
    super();
    this.state = {
      staffList: [],
      dataReady: false,
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      loadingIdCard: {},
      tableUpdating: false,
      filterList: [],
      groupTypeList: [],
      groupType: "",
      is_group_type: isFormDefinitionEnabled(
        "staff_configurations",
        "is_staff_group_type",
        1
      ),
      columns: [
        {
          name: "id",
          label: "ID",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "full_name",
          label: "Staff Name",
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div className="mui-table-custom-value-left-align">{value}</div>
              );
            },
          },
        },
        {
          name: "group_name",
          label: "groups",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <Box>{value && value[0]}</Box>;
            },
          },
        },
        {
          name: "email",
          label: "Email",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div className="mui-table-custom-value-left-align text-transform-none">
                  {value}
                </div>
              );
            },
          },
        },
        {
          name: "mobile_num",
          label: "Mobile No",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "username",
          label: "User Name",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "Actions",
          label: "Action",
          options: {
            filter: false,
            sort: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Box>
                  <Button
                    variant="contained"
                    color="secondary"
                    className="hall-ticket-print-button"
                    onClick={() =>
                      !this.state.loadingIdCard[
                        `staff_${tableMeta.rowData[0]}`
                      ] && this.handleHallTicketDownload(tableMeta.rowData[0])
                    }
                  >
                    {this.state.loadingIdCard[
                      `staff_${tableMeta.rowData[0]}`
                    ] ? (
                      <div className="display-flex">
                        <CircularProgress className="circular-hallticket mr-5" />
                        Loading
                      </div>
                    ) : (
                      <div className="display-flex">
                        <GetAppRoundedIcon className="hall-ticket-download-icon" />
                        Print
                      </div>
                    )}
                  </Button>
                </Box>
              );
            },
          },
        },
      ],
    };
  }

  handleHallTicketDownload = (id) => {
    clearInterval(this.setTime);
    let { loadingIdCard, staffList } = this.state;
    if (id) {
      loadingIdCard[`staff_${id}`] = true;
    } else {
      loadingIdCard[`all_staff`] = true;
    }
    this.setState({
      loadingIdCard: { ...loadingIdCard },
      staffList: [...staffList],
    });
    let transaction_id = Date.now();
    const url =
      POST_URL.generateidcardforstaff.api +
      `?long_running_process=1&transaction_id=${transaction_id}`;
    let param = {};
    if (id) {
      param = { staff_ids: [parseInt(id)] };
    } else {
      param = { staff_ids: [], is_all_staff: true };
    }
    let prop = { ...this.props };
    prop.responseType = "blob";
    prop.return_error_message = true;
    postRequest(url, param, prop).then((response) => {
      if (response && response.status === 200) {
        clearInterval(this.setTime);
        this.setState(
          {
            transaction_id: transaction_id,
            totalFeeLoading: true,
            count: 60,
          },
          () => {
            this.setIntervalTime();
          }
        );
      }
    });
  };

  setIntervalTime = () => {
    this.setTime = setInterval(() => {
      this.getlongprocessingapiresult();
    }, 5000);
    this.setTimeLimit += 1;
    if (this.setTimeLimit === 40) {
      clearInterval(this.setTime);
    }
  };

  getlongprocessingapiresult = () => {
    let { number_of_hites, staffList } = this.state;
    this.setState({
      number_of_hites: number_of_hites - 1,
    });
    if (number_of_hites === 0) {
      Swal.fire({
        type: "error",
        title: `The process is getting too delayed, please contact ${process.env.REACT_APP_ENV} team !!`,
        showConfirmButton: true,
      });
      clearInterval(this.setTime);
      return;
    }
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
            if (response.data.data?.result_data?.error) {
              ErrorHandler({
                response: {
                  status: 400,
                  data: response.data.data.result_data.error,
                },
              });
              this.setState({
                loadingIdCard: {},
                staffList: [...staffList],
              });
            } else {
              const height = (window.screen.height * 75) / 100;
              const width = (window.screen.width * 75) / 100;
              const mywindow = window.open(
                response.data.data?.result_data?.url,
                "_self"
                // "PRINT",
                // "height=" + height + ",width=" + width + ""
              );
            }
            this.setState({
              loading: false,
              loadingIdCard: {},
              staffList: [...staffList],
            });
            // mywindow.print();
            clearInterval(this.setTime);
          }
        } else {
          clearInterval(this.setTime);
          this.setState({
            totalFeeLoading: false,
            totalFeeError: true,
            loadingIdCard: {},
          });
        }
      }
    );
  };

  componentDidMount() {
    let { GridEnabled, ListEnabled } = this.state;
    this.getStaffList();
    this.getGroupTypeList();
    let options = { ...multiOptions };
    options["selectableRows"] = "none";
    options["filter"] = false;
    options["viewColumns"] = false;
    options["print"] = false;
    options["download"] = false;
    options["filterType"] = "dropdown";
    options["downloadOptions"]["filename"] = "Staff_List.csv";
    options["onDownload"] = (buildHead, buildBody, columns, data) => {
      data.map((columnValue, index) => {
        columnValue.data.map((objectValue, subIndex) => {
          if (subIndex == 5) {
            data[index]["data"][subIndex] = dateFormat(
              objectValue,
              "DD-MM-YYYY"
            );
          }
        });
      });
      return "\uFEFF" + buildHead(columns) + buildBody(data);
    };
    if (getIsGridOrListView()) {
      let isGridView = getIsGridOrListView() === "true";
      if (isGridView) {
        GridEnabled = true;
        ListEnabled = false;
      }
    }
    this.setState({
      options: options,
      GridEnabled,
      ListEnabled,
    });
  }

  getGroupTypeList = () => {
    const url = GET_URL.grouptypes.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let groupTypeList = response.data.data;
        let temp = { id: "all", name: "All" };
        groupTypeList.unshift(temp);
        this.setState({
          groupTypeList,
          groupType: "all",
        });
      }
    });
  };

  getStaffList = () => {
    const { groupType } = this.state;
    const url = GET_URL.staff.api;
    const params = { is_active: true };
    if (groupType !== "all") {
      params["group_type"] = groupType;
    }
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          staffList: response.data.data,
          AllStaffList: response.data.data,
          dataReady: true,
          loading: false,
        });
      }
    });
  };

  handleFilter = (e) => {
    let { name, value, filterList } = e.target;
    let { staffList, AllStaffList } = this.state;
    if (value !== "") {
      let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
      filterList = AllStaffList.filter((item) => {
        return Object.keys(item).some(
          (key) =>
            typeof item[key] === "string" &&
            item[key]
              .toLowerCase()
              .replace(/\s+/g, "")
              .includes(lowerCasedFilter)
        );
      });
      staffList = filterList;
    } else {
      staffList = [...AllStaffList];
      filterList = [];
    }
    this.setState({
      [name]: value,
      staffList,
      filterList,
    });
  };

  onChange = (e) => {
    let { name, value } = e.target;
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getStaffList();
      }
    );
  };

  render() {
    let {
      ListEnabled,
      GridEnabled,
      loading,
      staffList,
      tableUpdating,
      options,
      enabledActions,
      loadingIdCard,
      groupType,
      groupTypeList,
      is_group_type,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">Staffs ID Card Generator</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                <Button
                  variant="contained"
                  color="secondary"
                  className="hall-ticket-print-button"
                  onClick={() =>
                    !loadingIdCard[`all_staff`] &&
                    this.handleHallTicketDownload()
                  }
                >
                  <>
                    {loadingIdCard[`all_staff`] ? (
                      <div className="display-flex">
                        <CircularProgress className="circular-hallticket mr-5" />
                        Loading
                      </div>
                    ) : (
                      <div className="display-flex">
                        <GetAppRoundedIcon className="hall-ticket-download-icon" />
                        Print For All
                      </div>
                    )}
                  </>
                </Button>
              </Box>
            </Grid>
          </Grid>
          {is_group_type && (
            <div className="flex-gaping">
              <Dropdown
                data={groupTypeList}
                name="groupType"
                value={groupType}
                onChange={this.onChange}
                label={"Group Type"}
                className="width-100"
                hideSelect={true}
                size={"small"}
              />
            </div>
          )}
          <Grid
            container
            className={classNames("flex-justify-center", "header-align")}
          >
            <Grid item md={12} xs={12}>
              <Paper>
                <AllMUIDataTable
                  key={staffList}
                  title={
                    tableUpdating ? (
                      <CircularProgress className="white-text" />
                    ) : (
                      ""
                    )
                  }
                  data={staffList}
                  columns={this.state.columns}
                  options={options}
                />
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      );
    }
  }
}

export default StaffIdCardGenerator;
