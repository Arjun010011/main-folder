import React, { Component, Fragment } from "react";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { DateRange } from "Components/DateRange";
import { Dropdown } from "Components/DropDown";
import StudentListActions from "Includes/StudentListActions";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import {
  SetAcademicYear,
  isUserHasPermission,
  updatePermissions,
  getPaginationProps,
  dateFormat,
  getFormatMessage,
  getFullName,
  getUrlParam,
} from "Includes/functions";
import { options, DEFAULT_PAGINATION_PROPS_ID_LIST, STUDENT_TYPE } from "Constants";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

class ViewMiscellaneousCollection extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("miscellaneous_individual", ["view"]);
    this.state = {
      loading: true,
      yearList: [],
      year: "",
      isTypeEnable: false,
      error: {},
      tableData: [],
      selectedMiscTypes: null,
      dateRangeValue: {},
      minDate: "",
      maxDate: "",
      enableDateRange: false,
      collectingBy: [
        { id: "all", name: "All" },
        { id: 1, name: "Student" },
        { id: 2, name: "Guest" },
      ],
      user: "all",
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      tableLoading: false,
      miscellaneousCollectionPermission: isUserHasPermission(
        "miscellaneous_collection",
        "create"
      ),
      // Filter states
      standardList: [],
      sectionList: [],
      feeStandard: [],
      feeSection: [],
      mode_of_payment: [],
      student_type: "",
      mode_of_payment_list: [],
      initialFilterOpen: true,
      downloadLoading: false,
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "date",
          label: <FormattedMessage {...commonMessages.date} />,
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) => {
              return <Box>{dateFormat(value, "DD-MM-YYYY")}</Box>;
            },
          },
        },
        {
          name: "misc_type",
          label: <FormattedMessage {...messages.miscellaneousType} />,
          options: {
            filter: false,
            sort: false,
          },
        },
        {
          name: "total_amount",
          label: <FormattedMessage {...commonMessages.amount} />,
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "mode_of_payment",
          label: "Mode Of Payment",
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "receipt_num",
          label: <FormattedMessage {...commonMessages.receiptNumber} />,
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.name} />,
          options: {
            filter: false,
            sort: true,
            display: true,
            viewColumns: true,
          },
        },
        {
          name: "admission_num",
          label: "Admission No.",
          options: {
            filter: false,
            sort: true,
            display: true,
            viewColumns: true,
          },
        },
        {
          name: "standard_name",
          label: <FormattedMessage {...commonMessages.standard} />,
          options: {
            filter: false,
            sort: true,
            display: true,
            viewColumns: true,
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            download: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    viewURL={Actions.miscellaneous_individual.view.url}
                    enabledActions={this.permission}
                    printId={
                      tableMeta.rowData[0] ? tableMeta.rowData[0] + "/" : null
                    }
                    print_label="Print"
                    params={{ print_receipt: 1 }}
                    url={GET_URL.miscfeereciept.api}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

  componentDidMount = () => {
    if (updatePermissions("miscellaneous_individual", ["view"])) {
      let permission_temp = [...this.permission];
      permission_temp.push("print");
      this.permission = [...permission_temp];
    }
    let { year } = getUrlParam();
    this.setState(
      {
        year: year,
      },
      () => {
        this.getAcademicYearsList();
        this.getStandardList();
        this.getSectionList();
        this.getModeOfPaymentList();
      }
    );
  };

  getAcademicYearsList = () => {
    getRequest(GET_URL.getacademicyear.api, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        const yearList = response.data.data;
        const year = user.other_details.academic_year.id;
        this.setState(
          { yearList, year: year ? year : "", loading: false },
          () => {
            if (year) {
              this.getMiscellaneousPlanTypes(year);
              this.getMiscellaneousCollectionReport();
              this.updateDateRange(year);
            }
          }
        );
      }
    });
  };

  getStandardList = () => {
    const url = GET_URL.standard.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempList = response.data.data;
        tempList.unshift({ name: "Select All", id: "all" });
        this.setState({ standardList: tempList, feeStandard: [] });
      }
    });
  };

  getSectionList = () => {
    const url = GET_URL.section.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempList = response.data.data;
        tempList.unshift({ name: "Select All", id: "all" });
        this.setState({ sectionList: tempList, feeSection: [] });
      }
    });
  };

  getModeOfPaymentList = () => {
    const params = { allowed_app_types: "staff_web" };
    getRequest(GET_URL.modeofpayment.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          this.setState({ mode_of_payment_list: response.data.data });
        }
      }
    );
  };

  getMiscellaneousPlanTypes = (year) => {
    let url = GET_URL.miscplan.api;
    let params = { is_active: true, academic_year: year };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        let miscellaneousPlanTypes = response.data.data;
        let data = { id: 0, misc_type_name: "All" };
        miscellaneousPlanTypes.unshift(data);
        this.setState({
          selectedMiscTypes: data,
          miscellaneousPlanTypes: miscellaneousPlanTypes,
          isTypeEnable: true,
        });
      }
    });
  };

  updateDateRange = (year) => {
    let { yearList, minDate, maxDate } = this.state;
    let index = yearList.find((data) => data.id === year);
    minDate = index.start_date;
    maxDate = index.end_date;
    this.setState({ minDate, maxDate, enableDateRange: true });
  };

  onChange = async (e) => {
    let { error } = this.state;
    let y = e.target.value;
    if (y) {
      error.year = "";
      SetAcademicYear(y);
      this.setState({ year: y, isTypeEnable: false, error }, () => {
        this.getMiscellaneousCollectionReport();
      });
      this.getMiscellaneousPlanTypes(y);
      this.updateDateRange(y);
    }
  };

  handleAddMiscButton = () => {
    let { year, error, yearList } = this.state;
    if (year) {
      let index = yearList.find((data) => data.id === year);
      let yearInformation = {
        year: year,
        yearName: index.name,
        fromDate: index.start_date,
        toDate: index.end_date,
      };
      let searchParam = "?" + new URLSearchParams(yearInformation).toString();
      this.props.history.push({
        pathname: Actions.miscellaneous_collection.create.url,
        search: searchParam,
      });
    } else {
      error.year = <FormattedMessage {...commonMessages.selectAcademicYear} />;
      this.setState({ error });
    }
  };

  handleChangeDateRange = (value) => {
    this.setState({ dateRangeValue: value }, () => {
      this.getMiscellaneousCollectionReport();
    });
  };

  onChangeCollectBy = (e) => {
    let { user, columns } = this.state;
    user = e.target.value;
    if (user !== "all") {
      const col = ["admission_num", "standard_name", "student_name"];
      for (let obj of columns) {
        if (col.includes(obj.name)) {
          obj.options.viewColumns = user === 1;
          obj.options.display = user === 1;
        } else if (obj.name === "guest_name") {
          obj.options.viewColumns = user === 2;
          obj.options.display = user === 2;
        }
      }
    } else {
      const col = [
        "admission_num",
        "standard_name",
        "student_name,",
        "guest_name",
      ];
      for (let obj of columns) {
        if (col.includes(obj.name)) {
          obj.options.viewColumns = true;
          obj.options.display = true;
        }
      }
    }
    this.setState({ user, columns }, () => {
      this.getMiscellaneousCollectionReport();
    });
  };

  handleDropDownSearchChange = (e, newValue) => {
    let { selectedMiscTypes } = this.state;
    selectedMiscTypes = {
      id: newValue.id,
      misc_type_name: newValue.misc_type_name,
    };
    this.setState({ selectedMiscTypes }, () => {
      this.getMiscellaneousCollectionReport();
    });
  };

  getCommaSeparated = (options, key = "id") => {
    let returnValue = [];
    for (let data of options) {
      returnValue.push(data[key]);
    }
    return returnValue.join(",");
  };

  getFilterParams = () => {
    let {
      user,
      selectedMiscTypes,
      year,
      dateRangeValue,
      mode_of_payment,
      feeStandard,
      feeSection,
      student_type,
    } = this.state;

    let params = {
      is_active: true,
      miscellaneous__misc__academic_year: year,
    };
    let misc = selectedMiscTypes ? selectedMiscTypes.id : 0;
    if (user !== "all") {
      params["user"] = user;
    }
    if (misc) {
      params["miscellaneous__misc"] = misc;
    }
    if (dateRangeValue && dateRangeValue.start && dateRangeValue.end) {
      params["from_date"] = dateRangeValue.start;
      params["to_date"] = dateRangeValue.end;
    }
    if (mode_of_payment && mode_of_payment.length > 0) {
      params["mode_of_payment"] = this.getCommaSeparated(mode_of_payment, "name");
    }
    if (feeStandard.length > 0) {
      params["standard"] = this.getCommaSeparated(feeStandard);
    }
    if (feeSection.length > 0) {
      params["section"] = this.getCommaSeparated(feeSection);
    }
    if (student_type) {
      params["student_type"] = student_type;
    }
    return params;
  };

  getMiscellaneousCollectionReport = (paginationProps) => {
    let { pagination } = this.state;
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      ...this.getFilterParams(),
    };

    let url = GET_URL.misc.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let tableData = response.data.data;
        tableData.data_list.map((data) => {
          let misc_type = "";
          data.payment_details.map((payments) => {
            misc_type += payments.misc_type_name + ", ";
          });
          data.misc_type = misc_type.slice(0, -2);
          data.student_name = getFullName(
            data.student_first_name,
            data.student_middle_name,
            data.student_last_name
          );
        });
        this.setState({
          tableData,
          loading: false,
          tableLoading: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      } else {
        this.setState({ tableLoading: false });
      }
    });
  };

  changePage = (tableState) => {
    this.getMiscellaneousCollectionReport(tableState);
  };

  // Filter handler functions
  handleStandardChange = (e) => {
    let { name, value } = e.target;
    this.setState({ [name]: value });
  };

  onChangeStandard = (newValue) => {
    let { standardList } = this.state;
    let is_all = newValue.some((d) => d.id === "all");
    if (is_all) {
      let temp = [...standardList];
      temp.splice(0, 1);
      this.setState({ feeStandard: [...temp] });
    } else {
      this.setState({ feeStandard: newValue });
    }
  };

  onChangeSection = (newValue) => {
    let { sectionList } = this.state;
    let is_all = newValue.some((d) => d.id === "all");
    if (is_all) {
      let temp = [...sectionList];
      temp.splice(0, 1);
      this.setState({ feeSection: [...temp] });
    } else {
      this.setState({ feeSection: newValue });
    }
  };

  onChangeCollectedByFilter = (e, name) => {
    this.setState({ [name]: e });
  };

  handleApplyFilter = () => {
    this.getMiscellaneousCollectionReport();
  };

  handleDownloadReport = () => {
    let params = {
      ...this.getFilterParams(),
      download_report: 1,
    };
    this.setState({ downloadLoading: true });
    let url = GET_URL.misc.api;
    let prop = { responseType: "blob" };
    getRequest(url, params, prop).then((response) => {
      this.setState({ downloadLoading: false });
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: "application/pdf" });
        let fileURL = URL.createObjectURL(Data);
        const height = (window.screen.height * 90) / 100;
        const width = (window.screen.width * 80) / 100;
        window.open(
          fileURL,
          "PRINT",
          "height=" + height + ",width=" + width + ""
        );
      }
    });
  };

  handleResetFilter = () => {
    this.setState(
      {
        mode_of_payment: [],
        feeStandard: [],
        feeSection: [],
        student_type: "",
      },
      () => {
        this.getMiscellaneousCollectionReport();
      }
    );
  };

  onFilterChangeHandler = (type, filterList) => {
    if (type === "reset") {
      this.handleResetFilter();
    }
  };

  geFilterOptions = () => {
    let {
      mode_of_payment,
      feeStandard,
      feeSection,
      mode_of_payment_list,
      student_type,
      initialFilterOpen,
    } = this.state;

    if (initialFilterOpen) {
      this.setState({ initialFilterOpen: false });
    }

    return (
      <Fragment>
        <Box className="margin-top-20">
          <Dropdown
            data={STUDENT_TYPE}
            name={"student_type"}
            value={student_type}
            onChange={(e) => this.handleStandardChange(e)}
            label={"Student Type"}
            hideSelect={true}
            size="small"
          />
        </Box>
        <Box className="margin-top-20">
          <MultipleSelectDropdown
            data_list={mode_of_payment_list}
            selected_list={mode_of_payment}
            label={"Mode Of Payments"}
            onChange={(e) =>
              this.onChangeCollectedByFilter(e, "mode_of_payment")
            }
            optionValue="label"
            size="small"
            className="width-350px bg-white"
          />
        </Box>
        <Box className="margin-top-20">
          <MultipleSelectDropdown
            data_list={this.state.standardList}
            selected_list={feeStandard}
            className="width-350px bg-white"
            label={"Select Standard"}
            onChange={(newValue) => this.onChangeStandard(newValue)}
            size={"small"}
          />
        </Box>
        <Box className="margin-top-20">
          <MultipleSelectDropdown
            data_list={this.state.sectionList}
            selected_list={feeSection}
            className="width-350px bg-white"
            label={"Select Section"}
            onChange={(newValue) => this.onChangeSection(newValue)}
            size={"small"}
          />
        </Box>
        <div>
          <Button className="custom-button" onClick={this.handleApplyFilter}>
            Apply Filter
          </Button>
        </div>
      </Fragment>
    );
  };

  render() {
    let {
      loading,
      columns,
      yearList,
      year,
      isTypeEnable,
      error,
      pagination,
      tableData,
      selectedMiscTypes,
      minDate,
      maxDate,
      user,
      enableDateRange,
      miscellaneousPlanTypes,
      collectingBy,
      miscellaneousCollectionPermission,
      downloadLoading,
    } = this.state;

    const option = {
      ...options,
      download: true,
      onDownload: (buildHead, buildBody, columns, data) => {
        columns.forEach((column_name) => {
          column_name.label = getFormatMessage(column_name.label);
        });
        return "\uFEFF" + buildHead(columns) + buildBody(data);
      },
      downloadOptions: {
        filename: "Miscellaneous.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
      filter: true,
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
      onFilterChange: (column, filterList, type) => {
        this.onFilterChangeHandler(type, filterList);
      },
      viewColumns: false,
    };

    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper
            className={"paper-background"}
            style={{ background: "transparent", boxShadow: "none" }}
          >
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">
                  <FormattedMessage {...messages.miscellaneousCollection} />
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {!!year && miscellaneousCollectionPermission && (
                    <Button
                      variant="contained"
                      onClick={this.handleAddMiscButton}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                      {Actions.miscellaneous_collection.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <div className="d-flex flex-wrap align-items-center flex-justify-space-between">
              <Box display="flex" className="flex-wrap">
                <Grid container spacing={2}>
                  <Grid item lg={3} md={4} xs={6}>
                    <Dropdown
                      data={yearList}
                      name="year"
                      value={year}
                      onChange={this.onChange}
                      required={true}
                      hideSelect={true}
                      label={
                        <FormattedMessage {...commonMessages.academicYear} />
                      }
                      className="width-100"
                      error={error.year}
                    />
                  </Grid>
                  {!!year && (
                    <Grid item lg={3} md={4} xs={6}>
                      <DropDownWithSearch
                        id="combo-box-demo"
                        options={miscellaneousPlanTypes}
                        value={selectedMiscTypes}
                        onChange={(e, newValue) =>
                          this.handleDropDownSearchChange(e, newValue)
                        }
                        name="selectedMiscTypes"
                        optionValue="misc_type_name"
                        label={
                          <FormattedMessage {...messages.miscellaneousType} />
                        }
                        className="width-100"
                        error={error["selectedMiscTypes"]}
                        disabled={isTypeEnable ? false : true}
                        hideClearIcon={true}
                      />
                    </Grid>
                  )}
                  {!!year && (
                    <Grid item lg={3} md={4} xs={6}>
                      <Dropdown
                        data={collectingBy}
                        name="user"
                        value={user}
                        hideSelect={true}
                        className="width-100"
                        onChange={(e) => this.onChangeCollectBy(e)}
                        label={
                          <FormattedMessage
                            {...messages.miscellaneousCollectingFrom}
                          />
                        }
                      />
                    </Grid>
                  )}
                  <Grid item lg={4} md={12} xs={12}>
                    {!!year && enableDateRange && (
                      <DateRange
                        handleChange={this.handleChangeDateRange}
                        minDate={minDate}
                        maxDate={maxDate}
                      />
                    )}
                  </Grid>
                </Grid>
              </Box>
              <Grid item md={2} xs={8} className="header-align">
                <Box className="mt-10 mb-20 text-align-end">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={this.handleDownloadReport}
                    disabled={downloadLoading}
                  >
                    {downloadLoading ? "Loading..." : "Download Report"}
                  </Button>
                </Box>
              </Grid>
            </div>
            <Grid container className="Table-loader">
              <Grid item md={12}>
                <Paper>
                  <AllMUIDataTable
                    key={tableData.data_list}
                    data={tableData.data_list}
                    count={tableData.count}
                    columns={columns}
                    options={option}
                    onTableChange={this.changePage}
                    serverSide={true}
                    pagination={pagination}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}

export default withRouter(ViewMiscellaneousCollection);
