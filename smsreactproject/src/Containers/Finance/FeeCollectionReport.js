import React, { Component, Fragment } from "react";
import { withRouter } from "react-router-dom";
import { Grid, Paper, Box, CircularProgress, Button } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";
import originalMoment from "moment";
import { extendMoment } from "moment-range";
import fileDownload from "js-file-download";
import axios from "axios";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { Dropdown } from "Components/DropDown";
import {
  checkLocalAcademicYear,
  getPaginationProps,
  printPDFService,
  SetAcademicYear,
  SetStandard,
  checkLocalStandard,
  numberWithCommas,
  getFullName,
} from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { DATATABLEROWSPERPAGEOPT, DEFAULT_PAGINATION_PROPS } from "Constants";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import messages from "./messages";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import FeeCollectionReportModal from "./Components/FeeCollectionReportModal";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class FeeCollectionReport extends Component {
  constructor(props) {
    super(props);
    this.state = {
      year: "",
      standard: "",
      yearList: [],
      yearInfo:{},
      standardList: [],
      tableData: { student_list: [] },
      loading: true,
      loadingStd: false,
      tableLoading: false,
      pagination: { ...DEFAULT_PAGINATION_PROPS },
      loadingText: "loading..............................................",
      report_type: "all",
      alertData: "",
      groupList: [],
      selected_group: "",
      isOpenDialogReport: false,
      yearError: "",
      standardError: "",
    };
    this.columns = [
      {
        name: "first_name",
        label: <FormattedMessage {...commonMessages.studentName} />,
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        name: "current_reg_num",
        label: <FormattedMessage {...commonMessages.regNum} />,
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        name: "amount",
        label: <FormattedMessage {...commonMessages.totalAmount} />,
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value) => {
            return numberWithCommas(value);
          },
        },
      },
      {
        name: "paid_amount",
        label: <FormattedMessage {...commonMessages.amountPaid} />,
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value) => {
            return numberWithCommas(value);
          },
        },
      },
      {
        name: "pending_amount",
        label: <FormattedMessage {...messages.pendingAmount} />,
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value) => {
            return numberWithCommas(value);
          },
        },
      },
      {
        name: "id",
        options: {
          filter: false,
          display: false,
          download: false,
        },
      },
      {
        name: "Action",
        options: {
          filter: false,
          sort: false,
          empty: true,
          download: false,
          customBodyRender: (value, tableMeta) => {
            let student_id = tableMeta.rowData[5];
            return (
              <Button
                width="100%"
                color="primary"
                variant="contained"
                onClick={() => this.generateStudentReport(student_id)}
              >
                <FormattedMessage {...commonMessages.generateReport} />
              </Button>
            );
          },
        },
      },
      {
        name: "middle_name",
        options: {
          display: false,
          download: false,
          filter: false,
        },
      },
      {
        name: "last_name",
        options: {
          display: false,
          download: false,
          filter: false,
        },
      },
    ];
  }

  getFeeCollectionCustomFilters = () => {
    const { report_type, groupList, selected_group } = this.state;
    const collectionTypes = [
      { name: "All", id: "all" },
      { name: "Paid Amount Only", id: "paid_amount" },
      { name: "Pending Amount Only", id: "pending_amount" },
    ];
    return (
      <Fragment>
        <div className="mt-30">
          <Dropdown
            className="filter-dropdown"
            data={groupList}
            name="selected_group"
            value={selected_group}
            onChange={this.onChange}
            label="Student Group"
          />
        </div>
        {/* <div className="mt-30">
          <Dropdown
            className="filter-dropdown"
            data={collectionTypes}
            name="report_type"
            value={report_type}
            onChange={this.onChange}
            label="Collection Types"
          />
        </div> */}
      </Fragment>
    );
  };
  componentDidMount = () => {
    this.getAcademicYear();
    this.getGroupList();
    this.updateColumns();
  };
  updateColumns = () => {
    const { columns } = this;
    this.setState({ columns });
  };

  getAcademicYear = () => {
    let storedYearList = this.props.getAcademicYearList;
    if (!storedYearList) {
      const params = { is_active: true , is_finance_page: true};
      getRequest(GET_URL.getacademicyear.api, params, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            const yearList = response.data.data;
            this.setCompAcademicYear(yearList);
            this.props.setAcademicYear(yearList);
          }
        }
      );
    } else {
      this.setCompAcademicYear(storedYearList);
    }
  };

  getGroupList = () => {
    const params = { is_active: true };
    getRequest(GET_URL.getstudentgroups.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          this.setState({
            groupList: response.data.data,
          });
        }
      }
    );
  };

  setCompAcademicYear = (yearList) => {
    const year = checkLocalAcademicYear(yearList);
    let loading = year !== 0;
    this.setState({ yearList, year: year ? year : "", loading }, () => {
      if (year) {
        this.getStandardsList(year);
      }
    });
  };

  getStandardsList = (year) => {
    const params = { academic_year: year, is_active: true ,is_finance_page: true};
    this.setState({ loadingStd: true });
    getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        const standard = checkLocalStandard(standardList);
        this.setState(
          { standardList, standard: standard ? standard : "" },
          () => {
            let pagination = { ...this.state.pagination };
            pagination["custom"] = {};
            if (standard) {
              this.getReportList(pagination);
            }
          }
        );
      }
      this.setState({ loadingStd: false, loading: false });
    });
  };

  getReportList = (paginationProps) => {
    const {
      year,
      standard,
      report_type,
      pagination,
      selected_group,
      tableData,
    } = this.state;
    if (tableData?.student_list?.length === 0 && paginationProps === "download") {
      return false;
    }
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const params = {
      ...pagination_params,
      academic_year: year,
      is_active: 1,
      standard: standard,
    };
    if (standard !== 0) {
      params.standard = standard;
    }
    if (report_type !== "all") {
      params.report_type = report_type;
    }
    if (selected_group) {
      params.student_group = selected_group;
    }
    this.setState({ tableLoading: true });
    let props = { ...this.props };
    props["return_error_message"] = true;
    if (paginationProps === "download") {
      params["download_excel"] = 1;
      props.responseType = "blob";
    }
    getRequest(GET_URL.feecollectionreport.api, params, props).then(
      (response) => {
        if (response && response.status === 200) {
          if (paginationProps === "download") {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Fee_Collection_Report.xlsx`);
            document.body.appendChild(link);
            link.click();
            this.setState({
              loading: false,
              tableLoading: false,
            });
            return;
          }
          response.data.data.student_list.map((data) => {
            data["first_name"] = getFullName(
              data["first_name"],
              data["middle_name"],
              data["last_name"]
            );
          });
          const tableData = response.data.data;
          this.setState({
            loading: false,
            tableLoading: false,
            tableData,
            pagination: this.currentPagination
              ? this.currentPagination
              : this.state.pagination,
          });
        } else {
          this.setState({
            loading: false,
            tableLoading: false,
            tableData: [],
            alertData: response,
          });
        }
      }
    );
    return false;
  };

  onChange = (e) => {
    let name = e.target.name;
    let value = e.target.value;
    this.setState({
      tableLoading: true,
      yearError: "",
    });
    let {
      standardList,
      standard,
      year,
      academicYearStartDate,
      academicYearEndDate,
      dateRanges,
      selected_group,
      report_type,
      tableData,
    } = this.state;
    if (name === "year") {
      year = value;
      standardList = [];
      standard = "";
      tableData = [];
      if (value) {
        SetAcademicYear(value);
      }
    } else if (name === "standard") {
      standard = value;
      SetStandard(value);
      this.setState({
        standardError: "",
      });
    } else if (name === "report_type") {
      report_type = value;
    } else if (name === "selected_group") {
      selected_group = value;
    }
    this.setState(
      {
        year,
        standardList,
        standard,
        academicYearStartDate,
        academicYearEndDate,
        dateRanges,
        report_type,
        tableData,
        selected_group,
      },
      () => {
        if (name === "year") {
          this.getStandardsList(year);
        } else {
          this.getReportList();
        }
      }
    );
  };

  generateStudentReport = (student) => {
    let { year, standard, report_type } = this.state;
    let payload = {
      // from_date: fromdate,
      // to_date: toDate,
      academic_year: year,
      standard,
    };
    if (report_type !== "all") {
      payload.report_type = report_type;
    }
    let props = { ...this.props };
    props.url = `${GET_URL.feecollectionreport.api}${student}/?academic_year=${year}&standard=${standard}`;
    printPDFService(props);
  };

  handleDownload = (fileUrl, filename) => {
    axios
      .get(fileUrl, {
        responseType: "blob",
      })
      .then((res) => {
        fileDownload(res.data, filename);
      });
  };

  changePage = (tableState, action) => {
    this.setState({ tableLoading: true }, () => {
      this.getReportList(tableState);
    });
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          selected_group: null,
        },
        () => {
          let pagination = { ...this.state.pagination };
          pagination["custom"] = {};
          this.getReportList(pagination);
        }
      );
    }
  };

  handleClose = () => {
    this.setState({
      alertData: "",
    });
  };

  handleOpenDownloadDialog = () => {
    const { year, yearList } = this.state;
    if (!year) {
      this.setState({
        yearError: "Select Academic Year",
      });
    }
    else{
      let yearInfo={}
      yearList.forEach((field) => {
        if(field.id===year){
          yearInfo["start_date"]=field.start_date
          yearInfo["end_date"]=field.end_date
        }
      })
      this.setState({
        yearInfo:{...yearInfo},
        isOpenDialogReport: !this.state.isOpenDialogReport,
      });
    }
  };

  render() {
    const {
      year,
      yearList,
      tableData,
      standardList,
      standard,
      loading,
      loadingStd,
      pagination,
      columns,
      alertData,
      isOpenDialogReport,
      selected_group,
      yearError,
      standardError,
      yearInfo
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: true,
      download: true,
      print: false,
      rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
      customFilterDialogFooter: () => {
        return this.getFeeCollectionCustomFilters();
      },
      onFilterChange: (onFilterChange, filterList, type) => {
        this.onFilterChangeHandler(type);
      },
      textLabels: {
        body: {
          noMatch: this.state.tableLoading
            ? this.state.loadingText
            : "Sorry, there is no matching data to display",
        },
      },
      onDownload: () => {
        return this.getReportList("download");
      },
      viewColumns: false,
    };
    if (loading) return <LoadingGif />;
    return (
      <div>
        <Paper className={"paper-background"}>
          <Grid container>
            <Grid item md={6} xs={12} sm={12}>
              <Box className="header-align">
                <Box className="heading">Fee Collection Report</Box>
              </Box>
            </Grid>
          </Grid>
          <Box
            display="flex"
            className="justify-content-space-between align-items-center"
          >
            <div className="d-flex">
              <Box className="header-align">
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  onChange={this.onChange}
                  label="Academic year"
                  hideSelect={true}
                  helperText={yearError}
                  error={yearError}
                />
              </Box>
              <Box className="header-align mb-10 margin-left-10">
                {!loadingStd ? (
                  <Dropdown
                    data={standardList}
                    name="standard"
                    value={standard}
                    onChange={this.onChange}
                    label={`${alias_names["standard"]}`}
                    hideSelect={true}
                    error={standardError}
                    helperText={standardError}
                  />
                ) : (
                  <Skeleton
                    variant="rect"
                    className="drop-down-skeleton"
                  ></Skeleton>
                )}
              </Box>
            </div>
            <div>
              <Button
                className="custom-button"
                onClick={() => this.props.history.push("/finance/dashboard")}
                style={{ marginRight: "10px" }}
              >
                Finance Dashboard
              </Button>
              <Button
                className="custom-button"
                onClick={() => this.props.history.push("/finance/area-wise-pending-report")}
                style={{ marginRight: "10px" }}
              >
                Area-wise Pending Report
              </Button>
              <Button
                className="custom-button"
                onClick={this.handleOpenDownloadDialog}
              >
                Download Custom Report
              </Button>
            </div>
          </Box>
          <AllMUIDataTable
            columns={columns}
            options={options}
            data={tableData.student_list || []}
            title="Fee Collection Report"
            serverSide={true}
            pagination={pagination}
            count={tableData.count ?? 0}
            onTableChange={this.changePage}
          />
        </Paper>
        {isOpenDialogReport && (
          <FeeCollectionReportModal
            closeInParent={this.handleOpenDownloadDialog}
            standardList={standardList}
            standard={standard}
            year={year}
            selected_group={selected_group}
            yearInfo={yearInfo}
          />
        )}
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={alertData === "" ? false : true}
          autoHideDuration={5000}
          onClose={this.handleClose}
        >
          <MuiAlert onClose={this.handleClose} severity="error">
            {alertData}
          </MuiAlert>
        </Snackbar>
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  getAcademicYearList: makeSelectAcademicYear(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setAcademicYear }, dispatch);
}

export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(FeeCollectionReport)
);
