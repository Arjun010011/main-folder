import React, { Component, Fragment } from "react";
import { withRouter } from "react-router-dom";
import {
  Grid,
  Paper,
  Box,
  CircularProgress,
  Tooltip,
  Button,
  Icon,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@material-ui/core/";
import Skeleton from "@material-ui/lab/Skeleton";
import moment from "moment";
import _ from "lodash";
import InfoIcon from "@material-ui/icons/Info";
import classNames from "classnames";
import { DropDownWithSearch } from "Components/DropDownWithSearch";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

import { DateRange } from "Components/DateRange";
import { MODE_OF_PAYMENTS, STUDENT_TYPE } from "Constants";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { Dropdown } from "Components/DropDown";
import {
  getPaginationProps,
  numberWithCommas,
  dateFormat,
  getFullName,
  getUrlParam,
  getRowsPerPageOptions,
  getNameOfMultiplePayment,
  isUserHasPermission,
} from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { DEFAULT_PAGINATION_PROPS } from "Constants";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ViewExpenses from "Containers/Expenses/ViewExpenses";
import "./styles.scss";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import messages from "./messages";
import LoadingGif from "Components/LoadingGif";
import CashBookSummary from "Containers/Finance/Components/CashBookSummary";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import StudentProfileCard from "Components/StudentProfileCard";
import { setModeOfPaymentList } from "Components/CommonComponent/actions";
import { makeModeOfPaymentList } from "Components/CommonComponent/selectors";
import { format } from "date-fns";

class Cashbook extends Component {
  constructor(props) {
    super(props);
    this.state = {
      year: "",
      financial_year: "",
      isFyModalOpen: false,
      standard: 0,
      yearList: [],
      financialYearList: [],
      standardList: [],
      feeStandard: [],
      feeSection: [],
      tableData: {},
      loading: true,
      tableUpdating: false,
      daterange: {},
      datePickerOpen: false,
      minDate: "",
      maxDate: "",
      dateRangeValue: "",
      pagination: { ...DEFAULT_PAGINATION_PROPS },
      cashbookSummary: [],
      summaryTotal: 0,
      menu_type: "cashbook",
      mode_of_payment: "",
      financeTypeList: [],
      feetypeName: "",
      feetypeId: [],
      collection: 0,
      selected_tab: "group",
      student_type: "",
      expense: 0,
      tableLoading: false,
      total: 0,
      collected_by: [],
      fieldError: {},
      user_list: [],
      pageloading: true,
      fee_category_list: [],
      fee_category: "",
      startDate: "",
      mode_of_payment_list: [],
      mode_of_payment_summary: [],
      term_wise_summary: [],
      bank_wise_summary: [],
      fee_receipts_type: "success",
      printLoading: {},
      anchorEl: null,
      endDate: dateFormat(new Date(), "YYYY-MM-DD"),
      is_fee_group_enabled: isFormDefinitionEnabled(
        "fee_configurations",
        "is_fee_group_enabled",
        1
      ),
      is_pdf_download: isFormDefinitionEnabled(
        "fee_configurations",
        "cashbook_download_type",
        2
      ),
      show_bank_name_in_payment_details: isFormDefinitionEnabled(
        "fee_configurations",
        "show_bank_name_in_payment_details",
        1
      ),
      initialFilterOpen: true,
      cancelledColumns: [
        {
          name: "fee_delete_user_full_name",
          label: "Cancelled By",
          options: { filter: false, sort: false },
        },
        {
          name: "fee_delete_reason",
          label: "Reason",
          options: { filter: false, sort: false },
        },
      ],
    };
    this.columns = [
      {
        name: "id",
        label: "id",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        name: "ref_number",
        label: "Ref Num",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        name: "fee_collection",
        label: "Ref Num",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        name: "mode_of_payment",
        label: "Ref Num",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        name: "amount_paid",
        label: "Ref Num",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        name: "full_name",
        label: <FormattedMessage {...commonMessages.studentName} />,
        options: {
          filter: false,
          sort: false,
          search: false,
          display: true,
        },
      },
      {
        name: "standard_name",
        label: <FormattedMessage {...commonMessages.standard} />,
        options: {
          filter: false,
          sort: false,
          search: false,
        },
      },
      {
        name: "receipt_num",
        label: <FormattedMessage {...commonMessages.receiptNumber} />,
        options: {
          filter: false,
          sort: false,
        },
      },
      {
        name: "formatted_date",
        label: <FormattedMessage {...commonMessages.date} />,
        options: {
          filter: false,
          sort: false,
          search: false,
        },
      },
      {
        name: "fee_type_name",
        label:
          this.state.selected_tab === "group" ? (
            "Fee Group"
          ) : (
            <FormattedMessage {...messages.viewFeeTermFeeType} />
          ),
        options: {
          filter: false,
          sort: false,
        },
      },
      {
        name: "formatted_amount",
        label: <FormattedMessage {...commonMessages.amountWithoutSymb} />,
        options: {
          filter: false,
          sort: false,
          search: false,
        },
      },
      {
        name: "fee_type",
        options: {
          filter: false,
          sort: false,
          search: false,
          display: false,
        },
      },
      {
        name: "admission_num",
        label: "Admission No.",
        options: {
          filter: false,
          sort: false,
        },
      },
      {
        name: "mode_of_payment_list",
        label: "Mode Of Payment",
        options: {
          filter: false,
          sort: false,
          customBodyRender: (value, tableData) => {
            return (
              <div>
                {tableData.rowData[17] === "application_fee" ||
                  tableData.rowData[17] === "misc_collection" ? (
                  <div>
                    {getNameOfMultiplePayment([
                      {
                        amount: tableData.rowData[4],
                        mode_of_payment: tableData.rowData[3],
                        payment_ref_num: "",
                      },
                    ])}
                  </div>
                ) : (
                  getNameOfMultiplePayment(value)
                )}
              </div>
            );
          },
        },
      },
      {
        name: "bank_detail__bank_name",
        label: "Paid In Bank",
        options: {
          filter: false,
          sort: false,
          display: this.state.show_bank_name_in_payment_details || false,
          customBodyRender: (value, tableMeta) => {
            const bankNames = new Set();
            if (value && value.trim() !== "") {
              bankNames.add(value.trim());
            }
            const modeOfPaymentList = tableMeta.rowData && tableMeta.rowData[13];
            if (modeOfPaymentList && Array.isArray(modeOfPaymentList)) {
              modeOfPaymentList.forEach((mode) => {
                if (mode && mode.bank_detail__bank_name && mode.bank_detail__bank_name.trim() !== "") {
                  bankNames.add(mode.bank_detail__bank_name.trim());
                }
              });
            }
            if (bankNames.size > 0) {
              return Array.from(bankNames).join(", ");
            }
            return "----";
          },
        },
      },
      {
        name: "fee_collection__payment_note",
        label: "Ref No. ( Note )",
        options: {
          filter: false,
          sort: false,
          search: true,
          customBodyRender: (value, tableMeta, updateValue) => {
            return (
              <Box className="left-align-width-100" display="flex">
                {value ? (
                  <Tooltip
                    title={value}
                    enterDelay={500}
                    enterNextDelay={400}
                    placement="top-start"
                    classes={{ tooltip: "tooltip-show-data" }}
                  >
                    <div className="d-flex pointer w-webkit-fill-available justify-content-space-between">
                      <Box className="handle-comment-name-overflow">
                        {value
                          ? `${value} ${tableMeta.rowData?.[1]}`
                          : tableMeta.rowData?.[1]}
                      </Box>
                      <div>
                        <InfoIcon />
                      </div>
                    </div>
                  </Tooltip>
                ) : (
                  <div>----</div>
                )}
              </Box>
            );
          },
        },
      },
      {
        name: "collected_user_full_name",
        label: "Collected By",
        options: {
          filter: false,
          sort: false,
        },
      },
      {
        name: "local_module",
        label: "Print",
        options: {
          display: true,
          download: false,
          filter: false,
          customBodyRender: (value, tableMeta, updateValue) => {
            let fee_id =
              value === "application_fee" || value === "misc_collection"
                ? tableMeta.rowData[0]
                : value === "fee_collection" && tableMeta.rowData[2];
            return (
              <div>
                {this.state.printLoading[fee_id] ? (
                  <Button className="apply-leave-button height-width-25px">
                    Loading
                  </Button>
                ) : (
                  <Button
                    className="apply-leave-button height-width-25px"
                    onClick={() => this.printReciept(fee_id, value)}
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
    ];
  }

  printReciept = (id, value) => {
    let { printLoading, tableData } = this.state;
    let printTemp = { ...printLoading };
    printTemp[id] = true;
    this.setState(
      { printLoading: { ...printTemp }, tableData: _.cloneDeep(tableData) },
      () => {
        let url = GET_URL.feecollection.api + id + "/";
        if (value === "application_fee") {
          url = GET_URL.applicationFeesReceipt.api + id + "/";
        } else if (value === "misc_collection") {
          url = GET_URL.miscfeereciept.api + id + "/";
        }
        let prop = {};
        prop.responseType = "blob";
        getRequest(url, {}, prop).then((response) => {
          let printTemp = { ...printLoading };
          delete printTemp[id];
          this.setState({
            printLoading: printTemp,
            tableData: _.cloneDeep(tableData),
          });
          if (response && response.status === 200) {
            let Data = new Blob([response.data], { type: "application/pdf" });
            let fileURL = URL.createObjectURL(Data);
            const height = (window.screen.height * 90) / 100;
            const width = (window.screen.width * 80) / 100;
            const mywindow = window.open(
              fileURL,
              "PRINT",
              "height=" + height + ",width=" + width + ""
            );
            mywindow.print();
            mywindow.onafterprint = mywindow.close;
          }
        });
      }
    );
  };

  componentDidMount() {
    this.getCallCashbook();
    this.getFeeCategoryList();
    this.getModeOfPaymentList();
    this.getFinancialYearList();
  }

  getModeOfPaymentList = () => {
    let storedModeOfPaymentList = this.props.getModeOfPayments;
    if (!storedModeOfPaymentList) {
      this.setState({ loadingList: true });
      const params = { allowed_app_types: "staff_web" };
      getRequest(GET_URL.modeofpayment.api, params, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            this.props.setModeOfPaymentList(response.data.data);
            this.setState({
              mode_of_payment_list: response.data.data,
            });
          }
        }
      );
    } else {
      this.setState({
        mode_of_payment_list: storedModeOfPaymentList,
      });
    }
  };

  getFinancialYearList = () => {
    const url = GET_URL.getfinancialyear.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const financialYearList = response.data.data || [];
        let financial_year = "";
        const current = financialYearList.find((y) => y.current_year);
        if (current) {
          financial_year = current.id;
        }
        this.setState({
          financialYearList,
          financial_year,
        });
      }
    });
  };

  getFeeCategoryList = () => {
    const url = GET_URL.feecategory.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          fee_category_list: response.data.data,
        });
      }
    });
  };

  getCallCashbook = () => {
    const { is_fee_group_enabled } = this.state;
    const pagination_types = JSON.parse(
      localStorage.getItem("pagination_types")
    )
      ? JSON.parse(localStorage.getItem("pagination_types"))
      : {};
    let pagination_temp = _.cloneDeep(this.state.pagination);
    if (pagination_types["cashbook"]) {
      pagination_temp["page"] = pagination_types["cashbook"]["page"];
      pagination_temp["rowsPerPage"] =
        pagination_types["cashbook"]["rowsPerPage"];
      // pagination_temp['searchText'] = pagination_types['cashbook']?.['searchText'] ?? ''
      this.setState({
        pagination: _.cloneDeep(pagination_temp),
      });
    }
    this.setState({
      selected_tab: is_fee_group_enabled ? "group" : "feetype",
    });
    if (is_fee_group_enabled) {
      this.getGroupList();
    } else {
      this.getFeeTypes();
    }
    this.getStandardList();
    this.getSectionList();
    let { dash_date } = getUrlParam();
    if (dash_date) {
      this.setState({
        startDate: dateFormat(new Date(dash_date), "YYYY-MM-DD"),
        pageloading: false,
      });
    } else {
      this.setState({
        startDate: dateFormat(new Date(), "YYYY-MM-DD"),
        pageloading: false,
      });
    }
  };

  getStandardList = () => {
    const url = GET_URL.standard.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempList = response.data.data;
        tempList.unshift({
          optionValue: "Select All",
          name: "Select All",
          optionValue: "all",
          id: "all",
        });
        this.setState({
          standardList: tempList,
          feeStandard: [],
        });
      }
    });
  };

  getSectionList = () => {
    const url = GET_URL.section.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempList = response.data.data;
        tempList.unshift({
          optionValue: "Select All",
          name: "Select All",
          optionValue: "all",
          id: "all",
        });
        this.setState({
          sectionList: tempList,
          feeSection: [],
        });
      }
    });
  };

  getFeeTypes = () => {
    const url = GET_URL.addFeeType.api;
    const params = { is_active: true, for_cashbook: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempFeeList = response.data.data;
        tempFeeList.forEach((field) => {
          field.optionValue = `${field.id}${field.type}`;
        });
        tempFeeList.unshift({
          optionValue: "Select All",
          name: "Select All",
          optionValue: "all",
          id: "all",
        });
        this.setState({
          financeTypeList: tempFeeList,
        });
      }
    });
  };

  getGroupList = () => {
    const url = GET_URL.feegrouptypes.api;
    const params = { is_active: true, for_cashbook: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempFeeList = response.data.data;
        tempFeeList.forEach((field) => {
          field.optionValue = `${field.id}${field.type}`;
        });
        this.setState({
          financeTypeList: tempFeeList,
        });
      }
    });
  };

  onChangeFeeType = (newValue) => {
    let { financeTypeList } = this.state;
    let is_all_option_selected = false;
    let temp_list = [...financeTypeList];
    newValue.forEach((data) => {
      if (data.id === "all") {
        is_all_option_selected = true;
        return;
      }
    });
    if (is_all_option_selected) {
      temp_list.splice(0, 1);
      this.setState({
        feetypeId: [...temp_list],
      });
    } else {
      this.setState({
        feetypeName: newValue["type"],
        feetypeId: newValue,
      });
    }
  };

  onChangeStandard = (newValue) => {
    let { standardList } = this.state;
    let is_all_option_selected = false;
    let temp_list = [...standardList];
    newValue.forEach((data) => {
      if (data.id === "all") {
        is_all_option_selected = true;
        return;
      }
    });
    if (is_all_option_selected) {
      temp_list.splice(0, 1);
      this.setState({
        feeStandard: [...temp_list],
      });
    } else {
      this.setState({
        feeStandard: newValue,
      });
    }
  };

  onChangeSection = (newValue) => {
    let { sectionList } = this.state;
    let is_all_option_selected = false;
    let temp_list = [...sectionList];
    newValue.forEach((data) => {
      if (data.id === "all") {
        is_all_option_selected = true;
        return;
      }
    });
    if (is_all_option_selected) {
      temp_list.splice(0, 1);
      this.setState({
        feeSection: [...temp_list],
      });
    } else {
      this.setState({
        feeSection: newValue,
      });
    }
  };

  getCollectedBy = (options, key = "id") => {
    let returnValue = [];
    for (let data of options) {
      returnValue.push(data[key]);
    }
    return returnValue.join(",");
  };

  getFeeIdName = () => {
    let returnValue = {};
    const { feetypeId } = this.state;
    let returnObject = {};
    feetypeId.map((fee) => {
      if (!returnObject[fee["type"]]) {
        returnObject[fee["type"]] = [];
      }
      returnObject[fee["type"]].push(fee["id"]);
    });
    Object.keys(returnObject).map((data) => {
      returnObject[data] = returnObject[data].join(",");
    });
    returnValue = { ...returnObject };
    return returnValue;
  };

  handleClick = (event) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = (downloadType) => {
    if (downloadType) {
      this.setState(
        {
          is_pdf_download: downloadType === "pdf",
        },
        () => {
          this.getCashbook("download");
        }
      );
    }
    this.setState({ anchorEl: null });
  };

  handleDownloadFinancialYearWise = () => {
    const { financial_year } = this.state;
    if (!financial_year) {
      this.setState({ anchorEl: null, isFyModalOpen: false });
      return;
    }
    const url = GET_URL.cashbook.api;
    const params = {
      download_all: 1,
      financial_year,
      is_active: true,
    };
    const props = { responseType: "blob" };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: "application/pdf" });
        let fileURL = URL.createObjectURL(Data);
        const height = (window.screen.height * 75) / 100;
        const width = (window.screen.width * 75) / 100;
        window.open(
          fileURL,
          "PRINT",
          "height=" + height + ",width=" + width + ""
        );
      }
      this.setState({ anchorEl: null, isFyModalOpen: false });
    });
  };

  getCashbook = (paginationProps) => {
    let {
      dateRangeValue,
      mode_of_payment,
      pagination,
      year,
      feeStandard,
      collected_by,
      selected_tab,
      is_fee_group_enabled,
      student_type,
      is_pdf_download,
      fee_category,
      fee_receipts_type,
      feeSection,
    } = this.state;
    this.columns[4]["label"] = selected_tab === "group" ? "Group" : "Fee Type";
    // Update bank name column display based on form definition
    const bankNameColumn = this.columns.find(col => col.name === "bank_detail__bank_name");
    if (bankNameColumn) {
      bankNameColumn.options.display = this.state.show_bank_name_in_payment_details || false;
    }
    this.columns = [...this.columns];
    const pagination_types = JSON.parse(
      localStorage.getItem("pagination_types")
    )
      ? JSON.parse(localStorage.getItem("pagination_types"))
      : {};
    this.currentPagination = pagination;
    if (paginationProps === "default" || paginationProps === "download") {
      this.currentPagination = { ...DEFAULT_PAGINATION_PROPS };
      delete pagination_types.cashbook;
      let temp_new = { ...pagination_types };
      localStorage.setItem("pagination_types", JSON.stringify(temp_new));
    } else if (paginationProps) {
      this.currentPagination = { ...paginationProps };
      let temp = { cashbook: this.currentPagination };
      let temp_new = { ...pagination_types, ...temp };
      localStorage.setItem("pagination_types", JSON.stringify(temp_new));
    }

    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      is_active: fee_receipts_type === "success",
    };
    let fee_id = this.getFeeIdName();
    params = { ...params, ...fee_id };
    // if (feetypeId != '' & feetypeId['id'] != 'all') {
    //   params['type_name'] = feetypeName;
    // }
    // if (feetypeName == 'fees') {
    //   params['type_id'] = feetypeId['id'];
    // }
    if (paginationProps === "download") {
      if (is_pdf_download) {
        params["download_pdf"] = 1;
      } else {
        params["download_excel"] = 1;
      }
    }
    if (selected_tab === "group") {
      params["get_groupwise"] = true;
    }
    if (mode_of_payment && mode_of_payment.length > 0) {
      params["mode_of_payment"] = this.getCollectedBy(mode_of_payment, "name");
    }
    if (student_type) {
      params["student_type"] = student_type;
    }
    // if (year && year.length > 0) {
    if (year) {
      // params["academic_year"] = this.getCollectedBy(year);
      params["academic_year"] = year;
    }
    if (feeStandard.length > 0) {
      params["standard"] = this.getCollectedBy(feeStandard);
    }
    if (feeSection.length > 0) {
      params["section"] = this.getCollectedBy(feeSection);
    }
    if (collected_by.length > 0) {
      params["collected_by_user"] = this.getCollectedBy(collected_by);
    }
    if (fee_category) {
      params["fee_category_ids"] = fee_category;
    }
    if (dateRangeValue && dateRangeValue.start && dateRangeValue.end) {
      this.setState({ tableUpdating: true });
      params.from_date = moment(dateRangeValue.start).format("YYYY-MM-DD");
      params.to_date = moment(dateRangeValue.end).format("YYYY-MM-DD");
      this.setState({ tableUpdating: true });
      let url = GET_URL.cashbook.api;
      let prop = { ...this.props };
      if (paginationProps === "download") {
        prop.responseType = "blob";
      }
      getRequest(url, params, prop).then((response) => {
        if (response && response.status === 200) {
          if (paginationProps === "download") {
            if (is_pdf_download) {
              let Data = new Blob([response.data], { type: "application/pdf" });
              let fileURL = URL.createObjectURL(Data);
              const height = (window.screen.height * 75) / 100;
              const width = (window.screen.width * 75) / 100;
              window.open(
                fileURL,
                "PRINT",
                "height=" + height + ",width=" + width + ""
              );
            } else {
              let startLabel = dateFormat(dateRangeValue.start, "DD-MM-YYYY");
              let endLabel = dateFormat(dateRangeValue.end, "DD-MM-YYYY");
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement("a");
              link.href = url;
              link.setAttribute(
                "download",
                `CashBook - [${startLabel} - ${endLabel}].xlsx`
              );
              document.body.appendChild(link);
              link.click();
            }
            this.setState({
              tableUpdating: false,
              loading: false,
            });
            return;
          }
          this.setState({ tableLoading: true }, () => {
            const tableData = response.data;
            tableData.data.data_list.forEach((element) => {
              element.formatted_date = moment(element.date).format(
                "DD-MM-YYYY"
              );
              element.formatted_amount = numberWithCommas(
                parseFloat(element.amount_paid).toFixed(2)
              );
              element.full_name =
                element?.guest_name ??
                getFullName(
                  element.student_first_name,
                  element.student_middle_name,
                  element.student_last_name
                );
              if (element.section_name) {
                element.standard_name = `${element.standard_name} (${element.section_name})`;
              }
              if (selected_tab === "group" && is_fee_group_enabled) {
                element.fee_type_name =
                  element?.fee_group_name ?? element?.fee_type_name;
              }
              // Extract bank name from mode_of_payment_list if not already present
              if (!element.bank_detail__bank_name && element.mode_of_payment_list && Array.isArray(element.mode_of_payment_list) && element.mode_of_payment_list.length > 0) {
                // Get bank name from the first mode of payment that has a bank name
                // Try first mode of payment first (common case)
                if (element.mode_of_payment_list[0] && element.mode_of_payment_list[0].bank_detail__bank_name) {
                  element.bank_detail__bank_name = element.mode_of_payment_list[0].bank_detail__bank_name;
                } else {
                  // Fallback: find any mode of payment with bank name
                  const modeWithBank = element.mode_of_payment_list.find(
                    (mode) => mode && mode.bank_detail__bank_name
                  );
                  if (modeWithBank && modeWithBank.bank_detail__bank_name) {
                    element.bank_detail__bank_name = modeWithBank.bank_detail__bank_name;
                  }
                }
              }
            });
            this.setState({
              tableUpdating: false,
              tableLoading: false,
              tableData: _.cloneDeep(tableData.data),
              pagination: this.currentPagination,
              user_list: tableData.data.user_list,
            });
          });
        } else {
          this.setState({
            tableUpdating: false,
          });
        }
      });
    } else {
      this.setState({
        tableData: [],
      });
    }
    return false;
  };

  getCashbookSummary = (downloadPDF = false) => {
    const {
      feeStandard,
      feeSection,
      mode_of_payment,
      student_type,
      collected_by,
      dateRangeValue,
      year,
      feetypeId,
      feetypeName,
      selected_tab,
      fee_category,
      fee_receipts_type,
    } = this.state;
    let params = {
      is_active: fee_receipts_type === "success",
    };
    let fee_id = this.getFeeIdName();
    params = { ...params, ...fee_id };
    // if ((feetypeId != "") & (feetypeId["id"] != "all")) {
    //   params["type_name"] = feetypeName;
    // }
    // if (feetypeName == "fees") {
    //   params["type_id"] = feetypeId["id"];
    // }
    if (selected_tab === "group") {
      params["get_groupwise"] = true;
    }
    if (mode_of_payment && mode_of_payment.length > 0) {
      params["mode_of_payment"] = this.getCollectedBy(mode_of_payment, "name");
    }
    if (student_type) {
      params["student_type"] = student_type;
    }
    // if (year && year.length > 0) {
    if (year) {
      // params["academic_year"] = this.getCollectedBy(year);
      params["academic_year"] = year;
    }
    if (feeStandard.length > 0) {
      params["standard"] = this.getCollectedBy(feeStandard);
    }
    if (feeSection.length > 0) {
      params["section"] = this.getCollectedBy(feeSection);
    }
    if (collected_by.length > 0) {
      params["collected_by_user"] = this.getCollectedBy(collected_by);
    }
    if (fee_category) {
      params["fee_category_ids"] = fee_category;
    }
    if (downloadPDF) {
      params['download_pdf'] = true
    }
    if (dateRangeValue && dateRangeValue.start && dateRangeValue.end) {
      params.from_date = moment(dateRangeValue.start).format("YYYY-MM-DD");
      params.to_date = moment(dateRangeValue.end).format("YYYY-MM-DD");
      const url = `${GET_URL.cashbook.api}1/`;
      let props = {}
      if (downloadPDF) {
        props.responseType = "blob";
      }
      getRequest(url, params, props).then((response) => {
        if (downloadPDF) {
          let Data = new Blob([response.data], { type: "application/pdf" });
          let fileURL = URL.createObjectURL(Data);
          const height = (window.screen.height * 75) / 100;
          const width = (window.screen.width * 75) / 100;
          window.open(
            fileURL,
            "PRINT",
            "height=" + height + ",width=" + width + ""
          );
          this.setState({
            tableUpdating: false,
            loading: false,
          });
          return;
        } else {
          const cashbookSummary = response?.data?.data?.fee_type_summary ?? [];
          let summaryTotal = 0;
          if (cashbookSummary.length > 0) {
            cashbookSummary.forEach((summary) => {
              summaryTotal += summary.amount;
            });
          }
          this.setState({
            cashbookSummary,
            summaryTotal: summaryTotal,
            mode_of_payment_summary:
              response?.data?.data?.mode_of_payment_summary ?? [],
            term_wise_summary:
              response?.data?.data?.term_wise_summary ?? [],
            bank_wise_summary:
              response?.data?.data?.bank_wise_summary ?? [],
            loading: false
          });
        }
      });
    } else {
      this.setState({
        cashbookSummary: [],
        summaryTotal: 0,
        bank_wise_summary: [],
        loading: false
      });
    }
  };

  handleChangeDateRange = (dateRangeValue) => {
    this.setState({ dateRangeValue, startDate: "", endDate: "", loading: true }, () => {
      this.getCashbook();
      this.getCashbookSummary();
    });
  };

  onFilterChangeHandler = (type, filterList) => {
    const { pagination } = this.state;
    if (type === "reset") {
      let data = _.cloneDeep(pagination);
      data["custom"] = {};
      data["filter_list"] = null;
      this.setState({ mode_of_payment: "", collected_by: [], year: [] }, () => {
        this.getCashbook(data, this.columns);
        this.getCashbookSummary();
      });
    }
  };

  changePage = (tableState, action) => {
    this.setState({ tableUpdating: true }, () => {
      this.getCashbook(tableState, this.columns);
      this.getCashbookSummary();
    });
  };

  changeToggle = (e, value) => {
    if (value) {
      this.setState({
        menu_type: value,
        startDate: dateFormat(new Date(), "YYYY-MM-DD"),
        endDate: dateFormat(new Date(), "YYYY-MM-DD"),
      });
    }
  };

  changeReceiptToggle = (e, value) => {
    if (value) {
      this.setState(
        {
          fee_receipts_type: value,
          startDate: dateFormat(new Date(), "YYYY-MM-DD"),
          endDate: dateFormat(new Date(), "YYYY-MM-DD"),
          tableUpdating: true,
        },
        () => {
          this.getCashbook();
          this.getCashbookSummary();
        }
      );
    }
  };

  getProfitLoss = () => {
    const {
      dateRangeValue,
      feeStandard,
      feetypeName,
      feetypeId,
      selected_tab,
    } = this.state;
    let params = {};
    if (dateRangeValue && dateRangeValue.start && dateRangeValue.end) {
      params.from_date = moment(dateRangeValue.start).format("YYYY-MM-DD");
      params.to_date = moment(dateRangeValue.end).format("YYYY-MM-DD");
      if ((feetypeName != "") & (feetypeName != "all")) {
        params["type_name"] = feetypeName;
      }
      if (
        (feetypeId != "") &
        (feetypeId["id"] != "all") &
        (feetypeId["type"] === "fees")
      ) {
        params["type_id"] = feetypeId["id"];
      }
      if (selected_tab === "group") {
        params["get_groupwise"] = true;
      }
      if ((feeStandard != "") & (feeStandard["id"] != "all")) {
        params["standard"] = feeStandard["id"];
      }
      getRequest(GET_URL.balance.api, params, this.props).then((response) => {
        if (response && response.status === 200) {
          this.setState({
            collection: response.data.data["collection"],
            expense: response.data.data["expense"],
            total: response.data.data["total"],
          });
        }
      });
    } else {
      this.setState({
        collection: 0,
        expense: 0,
        total: 0,
      });
    }
  };

  getTitle = () => {
    const { collection, expense } = this.state;
    if (collection - expense > 0) {
      return `Profit  ${numberWithCommas(collection - expense)}`;
    } else if (collection - expense < 0) {
      return `Loss  ${numberWithCommas(expense - collection)}`;
    }
  };

  onChangeHandleView = (user) => {
    this.setState(
      {
        selected_tab: user,
        checkInOutList: [],
      },
      () => {
        if (user === "group") {
          this.getGroupList();
        } else {
          this.getFeeTypes();
        }
        this.getCashbook();
        this.getCashbookSummary();
      }
    );
  };

  handleCategoryChange = (e) => {
    let { name, value } = e.target;
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getCashbook();
        this.getCashbookSummary();
      }
    );
  };

  handleStandardChange = (e) => {
    let { name, value } = e.target;
    this.setState({
      [name]: value,
    });
  };

  handleFinancialYearChange = (e) => {
    const { value } = e.target;
    this.setState({
      financial_year: value,
    });
  };

  onChangeCollectedBy = (e, name) => {
    this.setState({
      [name]: e,
    });
  };

  handleApplyFilter = () => {
    this.getCashbook();
    this.getCashbookSummary();
  };

  getAcademicYear = () => {
    this.setState({
      loadingYear: true,
    });
    let storedYearList = this.props.getAcademicYearList;
    if (!storedYearList) {
      const params = { is_active: true };
      getRequest(GET_URL.getacademicyear.api, params, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            const yearList = response.data.data;
            this.props.setAcademicYear(yearList);
            this.setState({
              yearList,
              loadingYear: false,
              initialFilterOpen: false,
            });
          }
        }
      );
    } else {
      this.setState({
        yearList: storedYearList,
        loadingYear: false,
        initialFilterOpen: false,
      });
    }
  };

  geFilterOptions = () => {
    let {
      mode_of_payment,
      user_list,
      collected_by,
      fieldError,
      student_type,
      yearList,
      year,
      initialFilterOpen,
      financeTypeList,
      feetypeId,
      feeStandard,
      feeSection,
      selected_tab,
      mode_of_payment_list,
      fee_term_name,
    } = this.state;
    if (initialFilterOpen) {
      this.setState({ initialFilterOpen: false });
      this.getAcademicYear();
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
          {/* <MultipleSelectDropdown
            data_list={yearList}
            selected_list={year}
            label={"Year"}
            onChange={(e) => this.onChangeCollectedBy(e, "year")}
            // optionValue="n"
            size="small"
            className="width-350px bg-white"
          /> */}

          <Dropdown
            data={yearList}
            name={"year"}
            value={year}
            onChange={(e) => this.handleStandardChange(e)}
            label={"Academic Year"}
            hideSelect={true}
            size="small"
          />
        </Box>
        <Box className="margin-top-20">
          <MultipleSelectDropdown
            data_list={mode_of_payment_list}
            selected_list={mode_of_payment}
            label={"Mode Of Payments"}
            onChange={(e) => this.onChangeCollectedBy(e, "mode_of_payment")}
            optionValue="label"
            size="small"
            className="width-350px bg-white"
          />
          {/* <Dropdown
            data={mode_of_payment_list}
            name={"mode_of_payment"}
            value={mode_of_payment}
            onChange={(e) => this.handleStandardChange(e)}
            label={"Mode Of Payments"}
            hideSelect={true}
            size="small"
            customName="label"
            customId="name"
          /> */}
        </Box>
        <Box className="margin-top-20">
          <MultipleSelectDropdown
            data_list={user_list}
            selected_list={collected_by}
            error={fieldError["branch"] && fieldError["branch"]}
            label={"Collected By"}
            onChange={(e) => this.onChangeCollectedBy(e, "collected_by")}
            optionValue="collected_user_full_name"
            size="small"
            className="width-350px bg-white"
          />
        </Box>
        <Box className="margin-top-20">
          <MultipleSelectDropdown
            data_list={financeTypeList}
            selected_list={feetypeId}
            className="width-350px bg-white"
            label={selected_tab === "group" ? "Group" : "Select Fee Type"}
            onChange={(newValue) => this.onChangeFeeType(newValue)}
            customId="optionValue"
            size={"small"}
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
    const {
      tableData,
      minDate,
      maxDate,
      pagination,
      cashbookSummary,
      summaryTotal,
      menu_type,
      selected_tab,
      loading,
      tableUpdating,
      tableLoading,
      is_fee_group_enabled,
      startDate,
      pageloading,
      fee_category_list,
      fee_category,
      fee_receipts_type,
      mode_of_payment_summary,
      anchorEl,
      term_wise_summary,
      bank_wise_summary,
      financialYearList,
      financial_year,
      isFyModalOpen,
    } = this.state;
    const tableColumns =
      this.state.fee_receipts_type === "cancelled"
        ? [...this.columns, ...this.state.cancelledColumns]
        : [...this.columns];
    const options = {
      filterType: "checkbox",
      selectableRows: "none",
      responsive: "simple",
      filter: true,
      download: false,
      print: false,
      rowsPerPageOptions: getRowsPerPageOptions(tableData?.count),
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
      onFilterChange: (column, filterList, type) => {
        this.onFilterChangeHandler(type, filterList);
      },
      onDownload: () => {
        this.handleClick("download");
      },
      viewColumns: false,
    };
    if (pageloading) {
      return <LoadingGif />;
    }
    return (
      <div>
        <Paper className={"paper-background"}>
          <Grid container>
            <Grid item md={12} xs={12} sm={12}>
              <Box display="flex" justifyContent="space-between">
                <Box className="header-align">
                  <Box className="heading">Cashbook</Box>
                </Box>
                <Box className="header-align">
                  <ToggleButtonGroup
                    size="small"
                    value={menu_type}
                    exclusive
                    onChange={this.changeToggle}
                  >
                    <ToggleButton key={1} value="cashbook">
                      <FormattedMessage {...commonMessages.collection} />
                    </ToggleButton>
                    ,
                    <ToggleButton key={2} value="expense">
                      <FormattedMessage {...commonMessages.expense} />
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
            </Grid>
          </Grid>
          {menu_type === "cashbook" && (
            <>
              <div className="d-flex  flex-wrap align-items-center flex-justify-space-between">
                <Box display="flex" className="flex-wrap">
                  <Box mb={2}>
                    <DateRange
                      handleChange={this.handleChangeDateRange}
                      minDate={minDate}
                      maxDate={maxDate}
                      startDate={startDate}
                      endDate={this.state.endDate}
                      size={"small"}
                    />
                  </Box>

                  {fee_category_list.length > 0 && (
                    <Box className="pl-10 pt-15">
                      <Dropdown
                        data={fee_category_list}
                        name={"fee_category"}
                        value={fee_category}
                        onChange={(e) => this.handleCategoryChange(e)}
                        label={"Fee Category"}
                        size="small"
                        className="width-350px"
                      />
                    </Box>
                  )}
                  {is_fee_group_enabled && (
                    <div className="ml-30 mb-30">
                      <Box
                        className="list-grid-toggle-outer-div "
                        style={{ width: "230px", marginTop: "20px" }}
                      >
                        <Button
                          className={
                            selected_tab === "group"
                              ? "list-selected-toggle"
                              : "grid-selected-toggle"
                          }
                          onClick={(e) => this.onChangeHandleView("group")}
                          disabled={selected_tab === "group"}
                        >
                          <Box
                            className={
                              selected_tab === "group"
                                ? "list-selected-toggle-text"
                                : "grid-selected-toggle-text"
                            }
                          >
                            Group
                          </Box>
                          <Icon
                            className={classNames(
                              selected_tab === "group"
                                ? "list-selected-toggle-icon"
                                : "grid-selected-toggle-icon",
                              "fa fa-bars"
                            )}
                          />
                        </Button>
                        <Button
                          className={
                            selected_tab === "feetype"
                              ? "list-selected-toggle"
                              : "grid-selected-toggle"
                          }
                          onClick={(e) => this.onChangeHandleView("feetype")}
                          disabled={selected_tab === "feetype"}
                        >
                          <Box
                            className={
                              selected_tab === "feetype"
                                ? "list-selected-toggle-text"
                                : "grid-selected-toggle-text"
                            }
                          >
                            Fee Type
                          </Box>
                          <Icon
                            className={classNames(
                              selected_tab === "feetype"
                                ? "list-selected-toggle-icon"
                                : "grid-selected-toggle-icon",
                              "fa fa-th-large"
                            )}
                          />
                        </Button>
                      </Box>
                    </div>
                  )}
                </Box>
                <Grid item md={2} xs={8} className="header-align">
                  {isUserHasPermission("fee_cancelled", "view") && (
                    <Box className="mt-10 mb-20 text-align-end">
                      <ToggleButtonGroup
                        size="small"
                        value={fee_receipts_type}
                        exclusive
                        onChange={this.changeReceiptToggle}
                      >
                        <ToggleButton key={1} value="success">
                          Fee Receipts
                        </ToggleButton>
                        <ToggleButton key={2} value="cancelled">
                          Cancelled
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  )}
                  <Box className="mt-10 mb-20 text-align-end">
                    <Button
                      aria-controls="download-menu"
                      aria-haspopup="true"
                      onClick={this.handleClick}
                      variant="contained"
                      color="primary"
                    >
                      Download Report
                    </Button>
                  </Box>
                </Grid>
              </div>
              <Grid container spacing={3}>
                {!tableLoading && (
                  <Grid item md={12} xs={12}>
                    <Box>
                      {!tableLoading && (
                        <AllMUIDataTable
                          title={
                            tableUpdating ? (
                              <CircularProgress className="white-text" />
                            ) : (
                              ""
                            )
                          }
                          data={tableData?.data_list}
                          columns={tableColumns}
                          options={options}
                          onTableChange={this.getCashbook}
                          serverSide={true}
                          pagination={pagination}
                          count={tableData?.count}
                        />
                      )}
                    </Box>
                    <Menu
                      id="download-menu"
                      anchorEl={anchorEl}
                      keepMounted
                      open={Boolean(anchorEl)}
                      onClose={() => this.handleClose(null)}
                    >
                      <MenuItem onClick={() => this.handleClose("pdf")}>Download PDF</MenuItem>
                      <MenuItem onClick={() => this.handleClose("excel")}>Download Excel</MenuItem>
                      <MenuItem onClick={() => this.setState({ isFyModalOpen: true, anchorEl: null })}>
                        Download Financial Year Wise PDF
                      </MenuItem>
                    </Menu>
                  </Grid>
                )}
                {!loading && cashbookSummary.length > 0 && (
                  <Grid item xl={3} lg={3} md={3} xs={12}>
                    <Box>
                      <Paper>
                        <Box className="text-center font-weight-bold cahbook-heading">
                          {selected_tab === "group"
                            ? "Fee Group Summary"
                            : "Fee Type Summary"}
                        </Box>
                        <div>
                          <div className="cashbook-row font-weight-bold">
                            <div className="flex-justify-space-between">
                              <div>
                                {" "}
                                <FormattedMessage
                                  {...messages.viewFeeTermFeeType}
                                />{" "}
                              </div>
                              <div className="align-flex-end">
                                <FormattedMessage
                                  {...commonMessages.amountWithoutSymb}
                                />
                              </div>
                            </div>
                          </div>
                          {cashbookSummary.map((summary, index) => {
                            return (
                              <>
                                <hr style={{ marginTop: "0px" }} />
                                <div className="cashbook-row ">
                                  <div className="flex-justify-space-between">
                                    <div>{summary.fee_type_name}</div>
                                    <div className="align-flex-end">
                                      {numberWithCommas(summary.amount)}
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })}
                          <hr />
                          <div className="cashbook-row">
                            <div className="flex-justify-space-between">
                              <div className="font-weight-bold">
                                <FormattedMessage {...commonMessages.total} />
                              </div>
                              <div className="align-flex-end font-weight-bold">
                                {numberWithCommas(summaryTotal)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Paper>
                    </Box>
                  </Grid>
                )}
                {!loading && term_wise_summary.length > 0 && (
                  <Grid item xl={3} lg={3} md={3} xs={12}>
                    <Box>
                      <Paper>
                        <Box className="text-center font-weight-bold cahbook-heading">
                          {selected_tab === "group"
                            ? "Fee Group Summary"
                            : "Term Wise Summary"}
                        </Box>
                        <div>
                          <div className="cashbook-row font-weight-bold">
                            <div className="flex-justify-space-between">
                              <div>
                                Fee term Name
                              </div>
                              <div className="align-flex-end">
                                <FormattedMessage
                                  {...commonMessages.amountWithoutSymb}
                                />
                              </div>
                            </div>
                          </div>
                          {term_wise_summary.map((summary, index) => {
                            return (

                              <>
                                <hr style={{ marginTop: "0px" }} />
                                <div className="cashbook-row ">
                                  <div className="flex-justify-space-between">
                                    <div>{summary.fee_term_name}</div>
                                    <div className="align-flex-end">
                                      {numberWithCommas(summary.amount)}
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })}
                          <hr />
                          <div className="cashbook-row">
                            <div className="flex-justify-space-between">
                              <div className="font-weight-bold">
                                <FormattedMessage {...commonMessages.total} />
                              </div>
                              <div className="align-flex-end font-weight-bold">
                                {numberWithCommas(summaryTotal)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Paper>
                    </Box>
                  </Grid>
                )}
                {!loading && mode_of_payment_summary.length > 0 && (
                  <Grid item xl={3} lg={3} md={3} xs={12}>
                    <Box>
                      <Paper>
                        <Box className="text-center font-weight-bold cahbook-heading">
                          {"Mode Of Payment Summary"}
                        </Box>
                        <div>
                          <div className="cashbook-row font-weight-bold">
                            <div className="flex-justify-space-between">
                              <div>Mode Of Pay</div>
                              <div className="align-flex-end">
                                <FormattedMessage
                                  {...commonMessages.amountWithoutSymb}
                                />
                              </div>
                            </div>
                          </div>
                          {mode_of_payment_summary.map((summary, index) => {
                            return (
                              <>
                                <hr style={{ marginTop: "0px" }} />
                                <div className="cashbook-row ">
                                  <div className="flex-justify-space-between">
                                    <div>{summary.label}</div>
                                    <div className="align-flex-end">
                                      {numberWithCommas(summary.amount)}
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })}
                          <hr />
                          <div className="cashbook-row">
                            <div className="flex-justify-space-between">
                              <div className="font-weight-bold">
                                <FormattedMessage {...commonMessages.total} />
                              </div>
                              <div className="align-flex-end font-weight-bold">
                                {numberWithCommas(summaryTotal)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Paper>
                    </Box>
                  </Grid>
                )}
                {!loading && bank_wise_summary.length > 0 && this.state.show_bank_name_in_payment_details && (
                  <Grid item xl={3} lg={3} md={3} xs={12}>
                    <Box>
                      <Paper>
                        <Box className="text-center font-weight-bold cahbook-heading">
                          {"Bank Wise Summary"}
                        </Box>
                        <div>
                          <div className="cashbook-row font-weight-bold">
                            <div className="flex-justify-space-between">
                              <div>Bank Name</div>
                              <div className="align-flex-end">
                                <FormattedMessage
                                  {...commonMessages.amountWithoutSymb}
                                />
                              </div>
                            </div>
                          </div>
                          {bank_wise_summary.map((summary, index) => {
                            return (
                              <>
                                <hr style={{ marginTop: "0px" }} />
                                <div className="cashbook-row ">
                                  <div className="flex-justify-space-between">
                                    <div>{summary.bank_name || "Not Specified"}</div>
                                    <div className="align-flex-end">
                                      {numberWithCommas(summary.amount)}
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })}
                          <hr />
                          <div className="cashbook-row">
                            <div className="flex-justify-space-between">
                              <div className="font-weight-bold">
                                <FormattedMessage {...commonMessages.total} />
                              </div>
                              <div className="align-flex-end font-weight-bold">
                                {numberWithCommas(
                                  bank_wise_summary.reduce(
                                    (sum, item) => sum + (item.amount || 0),
                                    0
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Paper>
                    </Box>
                  </Grid>
                )}
              </Grid>
              <Box className="mt-10 mb-20 text-align-end">
                <Button
                  aria-controls="download-menu"
                  aria-haspopup="true"
                  onClick={() => this.getCashbookSummary(true)}
                  variant="contained"
                  color="primary"
                >
                  Download Cashbook Summary
                </Button>
              </Box>
            </>
          )}
          {loading && <LoadingGif />}
          {menu_type === "expense" && <ViewExpenses isComponent={true} />}
        </Paper>
        <Dialog
          open={isFyModalOpen}
          onClose={() => this.setState({ isFyModalOpen: false })}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Select Financial Year</DialogTitle>
          <DialogContent>
            {financialYearList.length > 0 && (
              <Box className="pt-15 pb-15">
                <Dropdown
                  data={financialYearList}
                  name={"financial_year"}
                  value={financial_year}
                  onChange={this.handleFinancialYearChange}
                  label={"Financial Year"}
                  size="small"
                  className="width-100"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => this.setState({ isFyModalOpen: false })}
              color="primary"
            >
              Cancel
            </Button>
            <Button
              onClick={this.handleDownloadFinancialYearWise}
              color="primary"
              variant="contained"
            >
              Download
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  getAcademicYearList: makeSelectAcademicYear(),
  getModeOfPayments: makeModeOfPaymentList(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    { setAcademicYear, setModeOfPaymentList },
    dispatch
  );
}

export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(Cashbook)
);
