import React, { Component, Fragment } from "react";
import { Paper, Box, Grid, Button, CircularProgress } from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { withRouter } from "react-router-dom";
import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { GET_URL, POST_URL } from "Includes/urls";
import moment from 'moment';
import {
  isUserHasPermission,
  getPaginationProps,
  dateFormat,
  validateDate,
  getUrlParam,
  numberWithCommas,
  getLibCategory,
  setLibCategory
} from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS_ID_LIST, minDate, maxDate } from "Constants";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Dropdown } from "Components/DropDown";
import Skeleton from "@material-ui/lab/Skeleton";
import { cloneDeep } from "lodash";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { printPDFService } from "Includes/functions";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import Swal from "sweetalert2";
import ErrorHandler from "Components/ErrorHandler";
import { DateRange } from "Components/DateRange";

const userTypeList = [
  {
    id: "all",
    name: "All",
  },
  {
    id: "student",
    name: "Student",
  },
  {
    id: "staff",
    name: "Staff",
  },
];

class FineCollectionList extends Component {
  constructor() {
    super();
    this.permission = ["return", "renew"];
    this.state = {
      categoryList: [],
      subCategoryList: [],
      selectedCategory: "all",
      selectedSubCategory: "all",
      selectedUser: "all",
      selectedStatus: "is_issued_only",
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      issueBookList: [],
      bookInformations: {},
      action: "",
      isSubCategory: false,
      error: "",
      fieldError: {},
      loading: true,
      closeMenu: true,
      tableUpdating: false,
      errorContent: "",
      enabledActions: [],
      loadingCategory: false,
      initialFilterOpen: true,
      loadingTable: false,
      isOpenReturnModal: false,
      selectedDate: new Date(),
      printLoading: {},
      number_of_hites: 40,
      startDate: "",
      dateRangeValue: "",
      endDate: dateFormat(new Date(), "YYYY-MM-DD"),
      columns: [
        {
          name: "id",
          label: "Book Number",
          options: {
            filter: false,
            sort: false,
            display: false,
            download: false,
          },
        },
        {
          name: "name",
          label: "User Detail",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "user_data",
          label: "User Type",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <>{value?.staff ? <Box>Staff</Box> : <Box>Student</Box>}</>
              );
            },
          },
        },
        {
          name: "receipt_num",
          label: "Receipt Num",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "current_standard_name",
          label: "Standard",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              try {
                const standardName =
                  tableMeta.tableData[tableMeta.rowIndex].fine_fine_payment_data[0].issue_return_book.issued_to_user.student.current_standard_name;
                return standardName;
              } catch {
                return "-";
              }
            },
          },
        },
        {
          name: "book_copy_number",
          label: "Book Number",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              try {
                const book_number =
                  tableMeta.tableData[tableMeta.rowIndex].fine_fine_payment_data[0].issue_return_book.book_copy_number;
                return book_number;
              } catch {
                return "-";
              }
            },
          },
        },
        {
          name: "transaction_date",
          label: "Transaction Date",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "fine_amount",
          label: "Fine Amount",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "id",
          label: "Print",
          options: {
            display: true,
            download: false,
            filter: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {this.state.printLoading[value] ? (
                    <Button className="apply-leave-button height-width-25px">
                      Loading
                    </Button>
                  ) : (
                    <Button
                      className="apply-leave-button height-width-25px"
                      onClick={() => this.printReciept(value)}
                    >
                      Print
                    </Button>
                  )}
                </div>
              );
            },
            customHeadRender: (columnMeta, updateDirection) => (
              <th className="mui-table-custom-header-center-align">
                {columnMeta.label}
              </th>
            ),
          },
        },
      ],
    };
    this.dateRange = React.createRef();
  }

  printReciept = (id) => {
    let { printLoading, issueBookList } = this.state;
    let printLoadingTemp1 = { ...printLoading };
    let props = { ...this.props };
    props.url = GET_URL.libraryfine.api + id + "/";
    printLoadingTemp1[id] = true;
    this.setState({
      printLoading: { ...printLoadingTemp1 },
      issueBookList: { ...issueBookList },
    });
    props.responseType = "blob";
    getRequest(props.url, {}, props).then((response) => {
      let printLoadingTemp2 = { ...printLoading };
      printLoadingTemp2[id] = false;
      this.setState({
        printLoading: { ...printLoadingTemp2 },
        issueBookList: { ...issueBookList },
      });
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: "application/pdf" });
        let fileURL = URL.createObjectURL(Data);
        // let win=window.open(fileURL);
        // win.print()
        const height = (window.screen.height * 75) / 100;
        const width = (window.screen.width * 75) / 100;
        const mywindow = window.open(
          fileURL,
          "PRINT",
          "height=" + height + ",width=" + width + ""
        );
        mywindow.print();
      }
    });
  };

  handleActive = (id, index, action) => {
    const { issueBookList } = this.state;
    let bookInformations = issueBookList.data[index];
    this.setState({
      bookInformations,
      action,
      isOpenReturnModal: true,
    });
  };

  handleCloseReturn = () => {
    this.setState({
      bookInformations: {},
      action: "",
      isOpenReturnModal: false,
    });
  };


  componentDidMount() {
    let { type, is_staff } = getUrlParam();
    this.setState(
      {
        selectedStatus: type ? type : "all",
      },
      () => {
        this.getCategoryList();
      }
    );
    let { dash_date } = getUrlParam();
    if (dash_date) {
      this.setState({
        startDate: dateFormat(new Date(dash_date), "YYYY-MM-DD"),
      });
    } else {
      this.setState({
        startDate: dateFormat(new Date(), "YYYY-MM-DD"),
      });
    }
  }

  getCategoryList = () => {
    let { selectedCategory } = this.state;
    const uel = GET_URL.librarycategory.api;
    const params = { is_active: 1 };
    getRequest(uel, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length === 1) {
          selectedCategory = response.data.data[0];
        } else if (getLibCategory()) {
          selectedCategory = getLibCategory();
        }
        if (selectedCategory) {
          this.getSubCategoryList(selectedCategory["id"]);
        }
        this.setState(
          {
            categoryList: response.data.data,
            loadingCategory: false,
            selectedCategory: { ...selectedCategory },
          },
          () => {
            this.getFineCollectionList();
          }
        );
      }
    });
  };

  getSubCategoryList = (id) => {
    let { selectedSubCategory } = this.state;
    const g_url = GET_URL.librarysubcategory.api;
    const params = { is_active: 1, category: id };
    getRequest(g_url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length === 1) {
          selectedSubCategory = response.data.data[0];
        } else if (response.data.data.length > 1) {
          response.data.data.unshift({ id: "all", name: "All" });
          selectedSubCategory = { id: "all", name: "All" };
        }
        this.setState({
          subCategoryList: response.data.data,
          tableUpdating: false,
          loading: false,
          selectedSubCategory: selectedSubCategory,
        });
      }
    });
  };

  handleStandardChange = async (e, isTriggerApi) => {
    let { value, name, error } = e.target;
    if (value !== 0) {
      error = {};
      this.setState(
        {
          [name]: value,
          error,
        },
        () => {
          if (name === "selectedCategory") {
            if (value !== "all") {
              this.getSubCategoryList(value);
            }
          }
          if (isTriggerApi) {
            this.getFineCollectionList();
          }
        }
      );
    }
  };
  setIntervalTime = () => {
    this.setTime = setInterval(() => {
      this.getlongprocessingapiresult();
    }, 5000);
    this.setTimeLimit += 1;
    if (this.setTimeLimit === 40) {
      this.setState({ tableUpdating: false })
      clearInterval(this.setTime);
    }
  };

  getlongprocessingapiresult = () => {
    let { number_of_hites, issueBookList, loadingTable } = this.state;
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
        tableUpdating: false,
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
                issueBookList: { ...issueBookList },
                loadingTable: false,
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
              issueBookList: { ...issueBookList },
              loadingTable: false,
              tableUpdating: false
            });
            // mywindow.print();
            clearInterval(this.setTime);
          }
        } else {
          clearInterval(this.setTime);
          this.setState({
            tableUpdating: false,
            totalFeeError: true,
            loadingIdCard: {},
          });
        }
      }
    );
  };

  getFineCollectionList = (paginationProps) => {
    let { selectedCategory, dateRangeValue, selectedSubCategory, pagination, selectedDate } = this.state;
    this.currentPagination = pagination;
    this.setState({ tableUpdating: true });
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const url = POST_URL.libraryfine.api;
    let extra_params = {};
    let params = { ...pagination_params, is_active: true };
    let filters = {
      start_date: moment(dateRangeValue.start).format("YYYY-MM-DD"),
      end_date: moment(dateRangeValue.end).format("YYYY-MM-DD")
    };
    if (selectedCategory) {
      filters["category"] = selectedCategory["id"];
    }
    if (selectedSubCategory && selectedSubCategory["id"] !== "all") {
      filters["sub_category"] = selectedSubCategory["id"];
    }
    let transaction_id = Date.now();
    if (paginationProps === "download") {
      extra_params["long_running_process"] = 1;
      extra_params['transaction_id'] = transaction_id
      params['download_data'] = true
    }
    let post_data = {
      filters: filters,
      ...params,
    };
    postRequest(url, post_data, this.props, extra_params).then((response) => {
      if (response && response.status === 200) {
        if (paginationProps === "download") {
          clearInterval(this.setTime);
          this.setState(
            {
              transaction_id: transaction_id,
              tableUpdating: true,
              count: 60,
              loading: false,
            },
            () => {
              this.setIntervalTime();
            }
          );
        } else {
          this.setState({ loadingTable: true }, () => {
            response.data.data.data.map((data) => {
              data["name"] = data["fine_fine_payment_data"]?.[0]?.[
                "issue_return_book"
              ]?.["issued_to_user"]?.["student"]?.["name"]
                ? data["fine_fine_payment_data"]?.[0]?.["issue_return_book"]?.[
                "issued_to_user"
                ]?.["student"]["name"]
                : data["fine_fine_payment_data"]?.[0]?.["issue_return_book"]?.[
                "issued_to_user"
                ]?.["staff"]["name"];
              data["transaction_date"] = dateFormat(
                data["transaction_date"],
                "DD-MM-YYYY"
              );
              data["fine_amount"] = numberWithCommas(
                data["fine_fine_payment_data"]?.[0]?.["amount"]
              );
            });
            this.setState({
              issueBookList: cloneDeep(response.data.data),
              loadingTable: false,
              tableUpdating: false,
              loading: false,
              isSubCategory: selectedCategory === "all" ? false : true,
              pagination: this.currentPagination
                ? this.currentPagination
                : this.state.pagination,
            });
          });
        }
      }
    });
    return false;
  };

  geFilterOptions = () => {
    let {
      selectedCategory,
      categoryList,
      subCategoryList,
      selectedSubCategory,
      selectedUser,
      initialFilterOpen,
      loadingCategory,
    } = this.state;
    if (initialFilterOpen) {
      this.setState(
        { initialFilterOpen: false, loadingCategory: true },
        () => { }
      );
    }
    if (loadingCategory) {
      return (
        <Fragment>
          <div className="margin-top-20">
            <Skeleton
              variant="rect"
              className="drop-down-skeleton m-t-10px"
            ></Skeleton>
          </div>
        </Fragment>
      );
    }
    return (
      <Fragment>
        <Box className="margin-top-20">
          <Dropdown
            data={userTypeList}
            name={"selectedUser"}
            value={selectedUser}
            onChange={(e) => this.handleStandardChange(e)}
            label={"User Type"}
            hideSelect={true}
            size="small"
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

  handleApplyFilter = () => {
    this.getFineCollectionList();
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          selectedUser: "all",
        },
        () => {
          this.getFineCollectionList();
        }
      );
    }
  };

  onChangeDate = (value) => {
    let { fieldError } = this.state;
    fieldError["selectedDate"] = validateDate(value, minDate, maxDate);
    if (fieldError["selectedDate"]) {
      this.setState({
        fieldError,
      });
      return;
    }
    fieldError["selectedDate"] = "";
    this.setState(
      {
        fieldError,
        selectedDate: value,
      },
      () => {
        this.getFineCollectionList();
      }
    );
  };

  handleDropDownSearch = (value, name) => {
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getFineCollectionList();
        if (name === "selectedCategory") {
          setLibCategory(value)
          this.getSubCategoryList(value["id"]);
        }
      }
    );
  };

  handleChangeDateRange = (dateRangeValue) => {
    this.setState({ dateRangeValue, startDate: "", endDate: "" }, () => {
      this.getFineCollectionList();
    });
  };

  render() {
    let {
      issueBookList,
      loading,
      tableUpdating,
      columns,
      fieldError,
      pagination,
      selectedDate,
      loadingTable,
      selectedCategory,
      categoryList,
      selectedSubCategory,
      subCategoryList,
      startDate,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
      onFilterChange: (column, filterList, type) => {
        this.onFilterChangeHandler(type, filterList);
      },
      onDownload: () => {
        return this.getFineCollectionList("download");
      },
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
          <Paper className="paper-background">
            <Grid container>
              <Grid item md={8} xs={12} className="header-align">
                <Box className="heading">
                  {Actions.library_collected_fine_list.view.label}
                </Box>
              </Grid>
            </Grid>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} md={3} className="margin-top-20">
                <DateRange
                  handleChange={this.handleChangeDateRange}
                  minDate={minDate}
                  maxDate={maxDate}
                  startDate={startDate}
                  endDate={this.state.endDate}
                  size={"small"}
                />
              </Grid>
              {/* <MuiPickersUtilsProvider utils={DateFnsUtils}>
                  <KeyboardDatePicker
                    autoOk
                    size="small"
                    variant="inline"
                    inputVariant="outlined"
                    label={<FormattedMessage {...commonMessages.date} />}
                    fullWidth
                    name="start_date"
                    minDate={minDate}
                    maxDate={maxDate}
                    format="dd-MM-yyyy"
                    value={selectedDate}
                    onChange={(e) => this.onChangeDate(e)}
                    KeyboardButtonProps={{
                      "aria-label": "change date",
                    }}
                    helperText={fieldError.selectedDate}
                    error={fieldError.selectedDate ? true : false}
                  />
                </MuiPickersUtilsProvider>  */}
              <Grid item xs={6} md={3} className="margin-top-20">
                <DropDownWithSearch
                  options={categoryList}
                  optionValue="name"
                  name={"selectedCategory"}
                  value={selectedCategory}
                  onChange={(e, newValue) =>
                    this.handleDropDownSearch(newValue, "selectedCategory")
                  }
                  label="Category"
                  hideClearIcon={true}
                  className="width-250-px"
                  size="small"
                  error={
                    fieldError[`selectedCategory`] && fieldError[`selectedCategory`]
                  }
                />
              </Grid>
              {selectedCategory && subCategoryList.length > 1 && (
                <Grid item xs={6} md={3} className="margin-top-20">
                  <DropDownWithSearch
                    options={subCategoryList}
                    optionValue="name"
                    name={"selectedSubCategory"}
                    value={selectedSubCategory}
                    onChange={(e, newValue) =>
                      this.handleDropDownSearch(newValue, "selectedSubCategory")
                    }
                    label="Sub Category"
                    hideClearIcon={true}
                    className="width-250-px"
                    size="small"
                    error={
                      fieldError[`selectedSubCategory`] &&
                      fieldError[`selectedSubCategory`]
                    }
                  />
                </Grid>
              )}
            </Grid>
            {!loadingTable && (
              <AllMUIDataTable
                title={
                  tableUpdating ? (
                    <CircularProgress className="white-text" />
                  ) : (
                    ""
                  )
                }
                key={issueBookList.data}
                data={issueBookList.data}
                columns={columns}
                options={options}
                onTableChange={this.getFineCollectionList}
                serverSide={true}
                pagination={pagination}
                count={issueBookList.count}
              />
            )}
          </Paper>
        </Box>
      );
    }
  }
}

export default withRouter(FineCollectionList);
