import React, { Component, Fragment } from "react";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import Swal from "sweetalert2";
import _ from "lodash";

import { DateRange } from "Components/DateRange";
import { Dropdown } from "Components/DropDown";
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
  getPaginationProps,
  getKeyValueMap,
  getFullName,
  getFormatMessage,
  updatePermissions,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

class FailedBiometricList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("enquiry_student", ["view"]);
    this.state = {
      studentList: [],
      AllStudentList: [],
      dataReady: false,
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      tableUpdating: false,
      showProgress: false,
      enabledActions: [],
      filterList: [],
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      searchStudent: "",
      dateRangeValue: {},
      dateRangeValueDefault: {},
      current_standard: null,
      loadingText: "loading..............................................",
      error: {},
      year: "",
      columns: [
        {
          name: "id",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: false,
            search: false,
            display: false,
            download: false,
          },
        },
        {
          name: "created",
          label: "Created Date",
          options: {
            filter: false,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <div>{dateFormat(value, "DD-MM-YYYY")}</div>;
            },
          },
        },
        {
          name: "failed_data",
          label: "Failed Data",
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "is_data_processed",
          label: "Is Data Processed",
          options: {
            filter: false,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <div>{value ? "Yes" : "No"}</div>;
            },
          },
        },
      ],
    };
    this.dateRange = React.createRef();
    this.setTime = null;
  }

  geFilterOptions = () => {
    let {
      current_standard,
      dateRangeValueDefault,
      academicYearFromDate,
      academicYearToDate,
      standardList,
    } = this.state;
    return (
      <Fragment>
        <DateRange
          handleChange={this.handleChangeDateRange}
          minDate={academicYearFromDate}
          maxDate={academicYearToDate}
          startDate={dateRangeValueDefault.start}
          endDate={dateRangeValueDefault.end}
          ref={this.dateRange}
          label={<FormattedMessage {...commonMessages.dateRange} />}
          hideClearIcon={true}
        />
      </Fragment>
    );
  };

  handleStandardChange = (e) => {
    let { value } = e.target;
    const { pagination } = this.state;
    this.setState(
      {
        current_standard: value,
      },
      () => {
        this.getStudentList(pagination);
      }
    );
  };

  componentDidMount() {
    this.getStudentList();
  }

  handleChangeDateRange = (value) => {
    let { pagination } = this.state;
    this.setState(
      {
        dateRangeValue: value,
        dateRangeValueDefault: value,
      },
      () => {
        this.getStudentList(pagination);
      }
    );
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          tableUpdating: true,
          current_standard: null,
          dateRangeValue: {},
          dateRangeValueDefault: {},
        },
        () => {
          this.getStudentList();
          this.dateRange.current.handleClear();
        }
      );
    }
  };

  getStudentList = (paginationProps) => {
    let { pagination, year, current_standard, dateRangeValue } = this.state;
    this.setState({ dateRangeValue: dateRangeValue });
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
    };
    if (!_.isEmpty(dateRangeValue)) {
      params = {
        ...pagination_params,
        entry_academic_year: year,
        is_active: true,
        current_standard: current_standard,
        from_date: dateRangeValue.start,
        to_date: dateRangeValue.end,
      };
    }
    const url = GET_URL.faileddatatosave.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const studentList = response.data;
        studentList.data.data_list.map((data) => {
          data["full_name"] = getFullName(
            data["first_name"],
            data["middle_name"],
            data["last_name"]
          );
          data["id"] = data["id"];
        });
        this.setState({
          studentList: studentList.data,
          AllStudentList: studentList.data,
          dataReady: true,
          loading: false,
          tableUpdating: false,
          pagination: this.currentPagination,
          dateRangeValue: dateRangeValue,
          showProgress: false,
        });
      }
    });
  };

  handleFilterClose = () => {
    // this.setState({
    // dateRangeValueDefault: {}
    // })
  };

  handleAddEnquiryButton = () => {
    let { year, error, alertData, yearList } = this.state;
    if (year !== "") {
      let start_date, end_date, year_name;
      yearList.map((data) => {
        if (data.id == year) {
          start_date = data.start_date;
          end_date = data.end_date;
          year_name = data.name;
        }
      });
      let yearInformation = {
        year,
        year_name,
        start_date,
        end_date,
      };
      let searchParam = "?" + new URLSearchParams(yearInformation).toString();
      this.props.history.push({
        pathname: Actions.enquiry_student_list.create.url,
        search: searchParam,
      });
    } else {
      alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />;
      error.year = alertData;
      this.setState({
        open: true,
        alertData,
        error,
      });
    }
  };

  handleSyncAll=()=>{
    this.setState({ submitDisable: true });
    let url = POST_URL.faileddatatosave.api;
    let post_data={
      process_all_data:true
    }
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.handleViewButton();
      }
      this.setState({ submitDisable: false });
    });
  }

  render() {
    let { studentList, tableUpdating, loading, submitDisable, pagination } = this.state;
    const options = {
      selectableRows: isUserHasPermission("enquiry_student_list", "delete")
        ? "multiple"
        : "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: true,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      // customSearchRender: debounceSearchRender(200),
      textLabels: {
        body: {
          noMatch: tableUpdating
            ? this.state.loadingText
            : "Sorry, there is no matching data to display",
        },
      },
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
      onFilterChange: (onFilterChange, filterList, type) => {
        this.onFilterChangeHandler(type, onFilterChange);
      },
      onRowsDelete: (rowsDeleted) => {
        this.multiDelete(rowsDeleted.data);
        return false;
      },
      onDownload: (buildHead, buildBody, columns, data) => {
        let temp = { enquiry_num: [] };
        const bodyData = data.map((data_value, i) => {
          temp["enquiry_num"] = data_value.data[4].split("###");
          data_value.data[4] = temp["enquiry_num"][1];
          data_value.data[2] = data_value.data[2] + "";
          return data_value;
        });
        columns.forEach((column_name) => {
          column_name.label = getFormatMessage(column_name.label);
        });
        return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
      },
      downloadOptions: {
        filename: "Enquiry_Students.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
    };

    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">Failed Biometric List</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                  <Button
                    variant="contained"
                    className="submit"
                    onClick={this.handleSyncAll}
                    disabled={submitDisable}
                  >
                    Sync All
                  </Button>
              </Box>
            </Grid>
          </Grid>
          <Paper className="mt-30">
            <AllMUIDataTable
              data={studentList.data_list}
              key={studentList.data_list}
              title={""}
              columns={this.state.columns}
              options={options}
              onTableChange={this.getStudentList}
              serverSide={true}
              pagination={pagination}
              count={studentList.count}
            />
          </Paper>
        </Paper>
      );
    }
  }
}
export default withRouter(FailedBiometricList);
