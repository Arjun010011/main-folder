import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  Button,
  TextareaAutosize,
  Switch,
  FormControlLabel,
  TextField,
  FormControl,
  FormHelperText,
  CircularProgress,
  Tooltip,
  InputAdornment,
} from "@material-ui/core";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import DeleteIcon from "@material-ui/icons/Delete";
import Snackbar from "@material-ui/core/Snackbar";
import moment from "moment";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { MODE_OF_PAYMENTS } from "Constants";

import AddTokenExpense from "Containers/Expenses/Components/AddTokenExpense";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import loadingBar from "images/loading.gif";
import { maxFileSize } from "Constants";
import {
  supported_receipts,
  image_formats,
} from "Containers/Expenses/Constants";
import { Dropdown } from "Components/DropDown";
import { Divider } from "@material-ui/core";
import {
  gstinNumberRegex,
  amountRegexWithDecimals,
} from "Constants/regularExpression";
import {
  getRequest,
  putRequest,
  postRequest,
  deleteRequest,
} from "Includes/api/apicall";
import { GET_URL, PUT_URL, POST_URL, DEL_URL } from "Includes/urls";
import {
  getUrlParam,
  getKeyValueMap,
  dateFormat,
  validateDate,
  Alert,
  isUserHasPermission,
  NumberFormatCustom,
} from "Includes/functions";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

class CreateExpenses extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
      taxInputMode: "amount",
      expenses: {
        receipt_preview: "",
        selectedExpenses: null,
        is_token: false,
        selectedDate: new Date(),
      },
      fieldErrors: {},
      expensesTypeList: [],
      helperText: {},
      imagesPreview: [],
      imageUploading: false,
      largeImagePreview: "",
      loading: true,
      maximumAmount: "",
      enableUploadIcons: true,
      isEnable: {},
      upload_name: "Upload Receipt",
      openError: false,
      alertData: "Please clear the errors",
      expenseDetails: {},
      isEdit: false,
      submitDisable: false,
      pageLoading: false,
      isBlankPage: true,
      loadingVehicles: false,
      vehicles: [],
      loadingToken: false,
      is_token_present: false,
      return_details: { details: { other_details: "" } },
      error_attachment: "",
      expense_pdf_upload: isFormDefinitionEnabled(
        "expense_configuration",
        "expense_pdf_upload",
        1
      ),
      savedBankList: [],
      show_bank_name_in_payment_details: isFormDefinitionEnabled(
        "fee_configurations",
        "show_bank_name_in_payment_details",
        1
      ),
      withdraw_from_cash_in_hand: false,
      // Unified Link to Asset integration
      linkAssetCategoryOptions: [],
      hasAssetPermission: isUserHasPermission('assets', 'add'),
      selectedLinkCategory: null,
      linkAssetOptions: [],
      selectedLinkAsset: null,
      loadingLinkAssets: false,
    };
  }

  componentDidMount = () => {
    this.getSavedBankList();
    if (this.props.location.pathname === Actions.expenses_create.update.url) {
      if (this.props.location.state && this.props.location.state.detail) {
        let id = this.props.location.state.detail;
        this.updateExpenseDetails(id);
      } else {
        this.props.history.push(Actions.expenses_create.view.url);
      }
    } else {
      let { year, yearName, fromDate, toDate } = getUrlParam();
      if (year && yearName && fromDate && toDate) {
        var SpecialTo = moment(toDate, "YYYY/MM/DD");
        if (moment() > SpecialTo) {
          toDate = new Date();
        }
        this.setState({
          year: year,
          yearName: yearName,
          fromDate: fromDate,
          toDate: toDate,
        });
        this.getFinancialYearList(year);
      } else {
        this.props.history.push(Actions.expenses_create.view.url);
      }
    }
  };

  getFinancialYearList = (year) => {
    const url = GET_URL.financialyear.api;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let fromDate, yearName, ToYear, startDate, endDate;
        response.data.data.map((data) => {
          if (data.id == year) {
            fromDate = data.start_date.split("-");
            ToYear = data.end_date.split("-");
            yearName = fromDate[0] + "-" + ToYear[0];
            startDate = data.start_date;
            endDate = data.end_date;
          }
        });
        var SpecialTo = moment(endDate, "YYYY/MM/DD");
        if (moment() > SpecialTo) {
          endDate = new Date();
        }
        this.setState(
          {
            yearList: response.data.data,
            yearName,
            fromDate: startDate,
            toDate: endDate,
            loading: false,
            year: year,
          },
          () => {
            if (year) {
              this.getExpensesTypeList(year);
              if (this.state.hasAssetPermission) {
                this.loadLinkAssetCategories();
              }
            }
          }
        );
      }
    });
  };

  updateExpenseDetails = (id) => {
    const url = GET_URL.expense.api + id + "/";
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            expenseDetails: response.data.data,
            isEdit: true,
          },
          () => {
            this.getFinancialYearList(response.data.data.financial_year);
          }
        );
      }
    });
  };

  updateAllDetails = () => {
    let {
      expenses,
      expenseDetails,
      isEnable,
      expensesTypeList,
      upload_name,
      is_token_present,
      return_details,
    } = this.state;
    expensesTypeList.map((data) => {
      if (data.id === expenseDetails.expense_plan) {
        expenses.selectedExpenses = data;
      }
    });
    if (expenseDetails.other_details) {
      this.getVehicles();
      return_details["details"]["other_details"] = expenseDetails.other_details;
    }
    if (expenseDetails.token) {
      is_token_present = true;
      return_details["details"]["id"] = expenseDetails.token;
      return_details["details"]["token_num"] =
        expenseDetails.token_details.token_num;
      return_details["details"]["staff_first_name"] =
        expenseDetails.token_details.staff_first_name;
      return_details["details"]["staff_last_name"] =
        expenseDetails.token_details.staff_last_name;
      return_details["details"]["staff_middle_name"] =
        expenseDetails.token_details.staff_middle_name;
      return_details["details"]["staff_middle_name"] =
        expenseDetails.token_details.staff_middle_name;
      return_details["details"]["liter"] = expenseDetails.token_details.liter;
    }
    isEnable["selectedExpense"] = true;
    expenses["selectedDate"] = expenseDetails.date;
    expenses["amount"] = expenseDetails.amount;
    expenses["amountTax"] = expenseDetails.tax_amount;
    expenses["refNumber"] = expenseDetails.ref_number;
    expenses["gst_number"] = expenseDetails.gst_number;
    expenses["financial_year"] = expenseDetails.financial_year;
    expenses["comment"] = expenseDetails.comment;
    expenses["payee_name"] = expenseDetails.payee_name;
    expenses["chequeClearanceDate"] = expenseDetails.cheque_clearance_date
      ? new Date(expenseDetails.cheque_clearance_date)
      : null;
    expenses["receipt"] = expenseDetails.attachment;
    expenses["receipt_preview"] = expenseDetails.attachment_details
      ? expenseDetails.attachment_details.file
      : "";
    if (expenseDetails.attachment_details) {
      let fileName = expenseDetails.attachment_details.file;
      let file_extension = `${fileName.slice(
        (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
      )}`;
      let file_name = `${fileName.slice(
        (Math.max(0, fileName.lastIndexOf("/")) || Infinity) + 1
      )}`;
      expenses["receipt_extension"] = file_extension;
      expenses["receipt_name"] = file_name;
      upload_name = "Change Receipt";
    }
    if (expenseDetails.mode_of_payment) {
      MODE_OF_PAYMENTS.map((data) => {
        if (data.id === expenseDetails.mode_of_payment) {
          expenses["mode_of_payment"] = data;
        }
      });
    }
    // Restore withdraw_from_cash_in_hand toggle if it exists in expense details
    if (expenseDetails.withdraw_from_cash_in_hand !== undefined) {
      this.setState({ withdraw_from_cash_in_hand: expenseDetails.withdraw_from_cash_in_hand || false });
    }
    if (expenseDetails.bank_detail_id) {
      expenses["bank_details"] = {
        bank_detail_id: expenseDetails.bank_detail_id,
      };
    }
    expenses["payee_name"] = expenseDetails.payee_name;
    expenses["purchased_receipt_num"] = expenseDetails.purchased_receipt_num;
    Object.keys(expenses).map((temp) => {
      isEnable[temp] = true;
    });
    this.setState({
      expenses,
      isEnable,
      upload_name,
      isBlankPage: false,
      is_token_present,
      return_details,
    });
  };

  getExpensesTypeList = (year) => {
    let { isEdit, expenseDetails } = this.state;
    const url = GET_URL.expenseplan.api;
    const params = {
      financial_year: year,
      is_active: true,
      expense_type__expense_for: 1,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          expensesTypeList: response.data.data,
          loading: false,
        });
        if (isEdit && expenseDetails.other_details) {
          this.getVehicles("isEdit");
        } else if (isEdit && !expenseDetails.other_details) {
          this.updateAllDetails();
        }
      }
    });
  };

  handleChange(event, acceptFileType) {
    let { expenses, enableUploadIcons } = this.state;
    this.setState({ enableUploadIcons: false, alertImageData: "" });
    let fileName = event.target.files[0]["name"];
    let file_extension = `${fileName.slice(
      (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
    )}`;
    let is_supported_types = true;
    is_supported_types = supported_receipts.type.includes(
      file_extension.toLowerCase()
    );
    if (event.target.files[0] && is_supported_types) {
      if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
        let post = new FormData();
        post.append("file", event.target.files[0]);

        if (expenses["receipt"]) {
          const url = PUT_URL.uploads.api + expenses["receipt"] + "/";
          putRequest(url, post, this.props).then((response) => {
            if (response && response.status === 200) {
              expenses["receipt"] = response.data.data.id;
              expenses["receipt_preview"] = response.data.data.file;
              expenses["receipt_extension"] = file_extension.toLowerCase();
              expenses["receipt_name"] = fileName;
              this.setState({
                expenses,
                upload_name: "Change Receipt",
              });
            }
          });
        } else {
          const url = POST_URL.uploads.api;
          postRequest(url, post, this.props).then((response) => {
            if (response && response.status === 200) {
              expenses["receipt"] = response.data.data.id;
              expenses["receipt_preview"] = response.data.data.file;
              expenses["receipt_extension"] = file_extension.toLowerCase();
              expenses["receipt_name"] = fileName;
              this.setState({
                expenses,
                upload_name: "Change Receipt",
              });
            }
          });
        }
      } else {
        this.setState({
          openError: true,
          alertData: "Please Upload Below 3 MB Pic",
        });
      }
    } else if (!is_supported_types) {
      this.setState({
        openError: false,
        alertData: supported_receipts.error,
        alertImageData: supported_receipts.error,
      });
    }
    enableUploadIcons = true;
    this.setState({
      enableUploadIcons,
      error_attachment: ""
    });
  }

  getAmountWithTax = () => {
    let { expenses } = this.state;
    let returnValue = expenses.amount;
    if (
      !isNaN(parseFloat(expenses.amountTax) + parseFloat(expenses.amount)) &&
      expenses.amountTax
    ) {
      returnValue =
        parseFloat(expenses.amountTax) + parseFloat(expenses.amount);
      returnValue = parseFloat(returnValue).toFixed(2);
    }
    return returnValue;
  };

  handleSearchChange = (e) => {
    let { expenses, fieldErrors, isEnable } = this.state;
    let { name, value } = e.target;
    if (name === "amount" || name === "amountTax") {
      isEnable["amountTax"] = true;
    }
    expenses[name] = value;
    delete fieldErrors[name];
    if (
      (name === "amount" || name === "amountTax") &&
      !amountRegexWithDecimals.value.test(value) &&
      value
    ) {
      fieldErrors[name] = amountRegexWithDecimals.errorText;
      this.setState({
        fieldErrors,
        expenses,
      });
      return;
    }
    // Auto-recalculate tax when amount changes in percentage mode
    if (name === "amount" && this.state.taxInputMode === "percentage" && expenses.taxPercentage) {
      expenses.amountTax = ((parseFloat(value) * parseFloat(expenses.taxPercentage)) / 100).toFixed(2);
    }
    isEnable[name] = true;
    this.validateAmount();
    this.setState({
      expenses,
      isEnable,
      fieldErrors,
    });
  };

  handleDropDownSearchChange = (e, newValue) => {
    // Clear cheque clearance date if mode of payment changes from Cheque
    if (e.target.name === "mode_of_payment" && newValue && newValue.id !== "Cheque") {
      let { expenses } = this.state;
      expenses["chequeClearanceDate"] = null;
      this.setState({ expenses });
    }
    let { expenses, fieldErrors, isEnable } = this.state;
    isEnable["selectedExpenses"] = true;
    delete fieldErrors["selectedExpenses"];
    expenses["selectedExpenses"] = newValue;
    this.validateAmount();
    if (newValue.expense_type_codename == "transport") {
      this.setState({
        loadingVehicles: true,
      });
      this.getVehicles();
    }
    this.setState({
      expenses,
      fieldErrors,
      isEnable,
      isBlankPage: false,
    });
  };

  handleDropDownChange = (e, newValue, name) => {
    let { expenses, fieldErrors } = this.state;
    delete fieldErrors[name];
    expenses[name] = newValue;
    // Clear cheque clearance date if mode of payment changes from Cheque
    if (name === "mode_of_payment" && newValue && newValue.id !== "Cheque") {
      expenses["chequeClearanceDate"] = null;
    }
    // Reset withdraw_from_cash_in_hand toggle if mode of payment is not Cash
    if (name === "mode_of_payment" && (!newValue || newValue.id !== "Cash")) {
      this.setState({ withdraw_from_cash_in_hand: false });
    }
    this.setState({
      expenses,
      fieldErrors,
    });
  };

  validateAmount = () => {
    let { fieldErrors, expenses } = this.state;
    let error = false;
    let maximumAmount = expenses.selectedExpenses
      ? expenses.selectedExpenses.max_amount
        ? expenses.selectedExpenses.max_amount
        : null
      : null;
    if (parseFloat(expenses.amountTax) > parseFloat(expenses.amount)) {
      error = true;
      fieldErrors["amountTax"] = `Please enter below amount ${expenses.amount}`;
    }
    if (maximumAmount) {
      if (parseFloat(expenses.amount) > parseFloat(maximumAmount) && !error) {
        error = true;
        fieldErrors[
          "amount"
        ] = `Maximum amount for ${expenses.selectedExpenses.expense_type_name} expense ${maximumAmount}`;
      } else if (
        parseFloat(this.getAmountWithTax()) > parseFloat(maximumAmount)
      ) {
        error = true;
        fieldErrors[
          "amountTax"
        ] = `Including Amount and Tax, Maximum amount for ${expenses.selectedExpenses.expense_type_name} expense ${maximumAmount}`;
      }
    }
    if (parseFloat(expenses.amount) === 0) {
      error = true;
      fieldErrors["amount"] = `Enter amount greater than 0`;
    }
    if (!error) {
      delete fieldErrors["amountTax"];
      delete fieldErrors["amount"];
    }
    this.setState({
      fieldErrors,
      maximumAmount,
    });
  };

  handleDateSearchChange = (e) => {
    let { expenses, fromDate, toDate, fieldErrors, helperText, isEnable } =
      this.state;
    expenses["selectedDate"] = e;
    delete fieldErrors["selectedDate"];
    helperText["selectedDate"] = "";
    isEnable["selectedDate"] = true;
    fromDate = dateFormat(fromDate, "YYYY-MM-DD");
    toDate = dateFormat(new Date(), "YYYY-MM-DD");
    let error = validateDate(e, fromDate, toDate);
    if (error === "Invalid Date") helperText["selectedDate"] = error;
    else if (error !== "") fieldErrors["selectedDate"] = error;
    this.setState({
      expenses,
      fieldErrors,
      isEnable,
    });
  };

  getDateFormat = () => {
    let { expenses } = this.state;
    let returnValue = "";
    if (dateFormat(expenses.selectedDate, "DD-MM-YYYY") !== "Invalid date")
      returnValue = dateFormat(expenses.selectedDate, "DD-MM-YYYY");
    return returnValue;
  };

  handleViewImage = () => {
    let { expenses } = this.state;
    if (image_formats.includes(expenses.receipt_extension)) {
      this.setState({
        largeImagePreview: expenses.receipt_preview,
      });
    } else {
      window.open(expenses.receipt_preview);
    }
  };

  handleDeleteImage = () => {
    let { expenses } = this.state;
    if (expenses["receipt"]) {
      const url = DEL_URL.uploads.api + expenses["receipt"] + "/";
      deleteRequest(url, {}, this.props).then((response) => {
        if (response && response.status === 200) {
          expenses["receipt"] = "";
          expenses["receipt_preview"] = "";
          expenses["receipt_name"] = "";
          expenses["receipt_extension"] = "";
          this.setState({
            expenses,
            upload_name: "Upload Receipt",
          });
        }
      });
    } else {
      expenses["receipt"] = "";
      expenses["receipt_preview"] = "";
      expenses["receipt_name"] = "";
      expenses["receipt_extension"] = "";
      this.setState({
        expenses,
        upload_name: "Upload Receipt",
      });
    }
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  validation = () => {
    let {
      openError,
      is_token_present,
      fromDate,
      expense_pdf_upload,
      error_attachment,
      alertImageData,
    } = this.state;
    let returnValue = true;
    let { expenses, fieldErrors } = this.state;
    if (!expenses.selectedDate) {
      fieldErrors["selectedDate"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    }
    if (!expenses.payee_name) {
      fieldErrors["payee_name"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    }
    if (!expenses.mode_of_payment) {
      fieldErrors["mode_of_payment"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    }
    if (!expenses.selectedExpenses) {
      fieldErrors["selectedExpenses"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    }
    if (expenses.selectedDate) {
      let error = validateDate(expenses.selectedDate, fromDate, new Date());
      if (error !== "") fieldErrors["selectedDate"] = error;
    }
    if (!expenses.amount) {
      fieldErrors["amount"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    }
    if (expense_pdf_upload && !Boolean(expenses.receipt)) {
      returnValue = false;
      error_attachment = "Please upload the receipt";
    }
    if (expenses.amount) {
      this.validateAmount();
    }
    if (
      expenses.gst_number &&
      !gstinNumberRegex.value.test(expenses.gst_number)
    ) {
      fieldErrors["gst_number"] = gstinNumberRegex.errorText;
    }
    if (
      !expenses.selectedVehicle &&
      expenses.selectedExpenses.expense_type_codename === "transport" &&
      !is_token_present
    ) {
      fieldErrors["selectedVehicle"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    }
    // No asset field validation needed for unified Link to Asset (optional selection)
    if (Object.keys(fieldErrors).length > 0) {
      returnValue = false;
      openError = false;
      alertImageData = "";
    }
    this.setState({
      fieldErrors,
      openError,
      alertImageData,
      error_attachment,
    });

    return returnValue;
  };

  submit = () => {
    let { expenses, expenseDetails, isEdit, is_token_present, return_details } =
      this.state;
    let validate = this.validation();
    if (validate) {
      this.setState({ submitDisable: true });
      let post_data = {
        date: dateFormat(expenses.selectedDate, "YYYY-MM-DD"),
        expense_plan: expenses.selectedExpenses.id,
        amount: parseFloat(expenses.amount),
        total_amount: parseFloat(this.getAmountWithTax()),
        tax_amount: parseFloat(expenses.amountTax)
          ? parseFloat(expenses.amountTax)
          : 0.0,
        gst_number: expenses.gst_number,
        ref_number: expenses.refNumber,
        comment: expenses.comment,
        attachment: expenses.receipt ? expenses.receipt : null,
        token: null,
        vehicle: null,
        payee_name: expenses.payee_name,
        mode_of_payment: expenses.mode_of_payment.id,
        purchased_receipt_num: expenses.purchased_receipt_num,
        cheque_clearance_date: expenses.chequeClearanceDate
          ? dateFormat(expenses.chequeClearanceDate, "YYYY-MM-DD")
          : null,
        bank_detail_id: expenses.bank_details?.bank_detail_id || null,
      };

      // Add withdraw_from_cash_in_hand if mode_of_payment is Cash and toggle is enabled
      if (expenses.mode_of_payment && expenses.mode_of_payment.id === "Cash" && this.state.withdraw_from_cash_in_hand) {
        post_data.withdraw_from_cash_in_hand = true;
      }
      if (
        expenses.selectedExpenses.expense_type_codename === "transport" &&
        !is_token_present
      ) {
        post_data["vehicle"] = expenses.selectedVehicle.id;
      } else if (
        expenses.selectedExpenses.expense_type_codename === "transport" &&
        is_token_present
      ) {
        post_data["token"] = return_details.details.id;
        post_data["vehicle"] = return_details.details.other_details.id;
      }
      let url;
      if (isEdit) {
        url = PUT_URL.expense.api + expenseDetails.id + "/";
        putRequest(url, post_data, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: "Your Data has been saved",
              showConfirmButton: false,
              timer: 1500,
            });
            this.props.history.push({
              pathname: Actions.expenses_individual.view.url,
              state: { detail: expenseDetails.id },
            });
          }
          this.setState({ submitDisable: false });
        });
      } else {
        url = PUT_URL.expense.api;
        postRequest(url, post_data, this.props).then((response) => {
          if (response && response.status === 200) {
            // After expense created, link to asset if selected
            if (this.state.selectedLinkAsset && this.state.selectedLinkCategory) {
              this.createAssetLink(response.data?.data?.id);
            } else {
              Swal.fire({
                position: "top-end",
                type: "success",
                title: "Your Data has been saved",
                showConfirmButton: false,
                timer: 1500,
              });
              this.props.history.push(Actions.expenses_create.view.url);
            }
          }
          this.setState({ submitDisable: false });
        });
      }
    }
  };

  createAssetLink = (expenseId) => {
    const { selectedLinkCategory, selectedLinkAsset, expenses } = this.state;
    const totalAmount = parseFloat(this.getAmountWithTax());
    const expenseDate = dateFormat(expenses.selectedDate, "YYYY-MM-DD");

    if (selectedLinkCategory.type === 'FIXED_ASSET') {
      // Create a cost movement (ADDITION) for the selected fixed asset
      const payload = {
        asset: selectedLinkAsset.id,
        financial_year: this.state.year,
        movement_type: 'ADDITION',
        amount: totalAmount,
        movement_date: expenseDate,
        remarks: `Linked from Expense${expenseId ? ' #' + expenseId : ''}`,
      };
      const url = POST_URL.assetCostMovements.api;
      postRequest(url, payload, this.props).then((assetResponse) => {
        if (assetResponse && assetResponse.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Expense saved & linked to asset",
            showConfirmButton: false,
            timer: 1500,
          });
        } else {
          Swal.fire({
            icon: "warning",
            title: "Expense saved but asset linking failed",
            text: assetResponse?.data?.message || assetResponse?.data?.reason || "Could not create cost movement. Please link manually.",
          });
        }
        this.props.history.push(Actions.expenses_create.view.url);
      });
    } else if (selectedLinkCategory.type === 'RECOVERABLE') {
      // Create a recoverable asset transaction (DEBIT) for the selected recoverable asset
      const payload = {
        recoverable_asset: selectedLinkAsset.id,
        transaction_date: expenseDate,
        transaction_type: 'DEBIT',
        amount: totalAmount,
        source_type: 'MANUAL',
        remarks: `Linked from Expense${expenseId ? ' #' + expenseId : ''}`,
      };
      const url = POST_URL.recoverableAssetTransaction.api;
      postRequest(url, payload, this.props).then((txnResponse) => {
        if (txnResponse && txnResponse.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Expense saved & linked to recoverable asset",
            showConfirmButton: false,
            timer: 1500,
          });
        } else {
          Swal.fire({
            icon: "warning",
            title: "Expense saved but recoverable asset linking failed",
            text: txnResponse?.data?.message || txnResponse?.data?.reason || "Could not create transaction. Please link manually.",
          });
        }
        this.props.history.push(Actions.expenses_create.view.url);
      });
    }
  };

  handleClose = () => {
    this.setState({
      openError: false,
      alertImageData: "",
    });
  };

  getVehicles = (name) => {
    let { expenses } = this.state;
    const params = { is_active: true };
    getRequest(GET_URL.vehicle.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let vehicles = response.data.data;
        vehicles.map((data) => {
          data["vehicle_name"] = `${data.name} - ${data.vehicle_num}`;
          if (name == "isEdit") {
            expenses.selectedVehicle = data;
          }
        });
        this.setState({ vehicles, loadingVehicles: false, expenses });
        if (name == "isEdit") {
          this.updateAllDetails();
        }
      }
    });
  };

  getSavedBankList = () => {
    const url = GET_URL.bankdetail.api;
    const params = { is_active: true };

    getRequest(url, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data.data.map((item) => ({
            name: item.id,
            label: item.display_name || item.bank_name,
          }));

          this.setState({ savedBankList: data });
        }
      })
      .catch(() => {
        this.setState({ savedBankList: [] });
      });
  };

  onChangeIsToken = () => {
    let { expenses } = this.state;
    expenses["is_token"] = !expenses.is_token;
    this.setState({
      expenses,
      loadingToken: true,
    });
  };

  return_details = (return_details) => {
    this.setState({
      return_details,
      is_token_present: true,
    });
  };

  deleteToken = () => {
    this.setState({
      return_details: {},
      is_token_present: false,
    });
  };

  loadLinkAssetCategories = () => {
    const assetGroupUrl = GET_URL.assetGroups.api;
    const recoverableCatUrl = GET_URL.recoverableAssetCategory.api;
    const fyId = this.state.year;

    Promise.all([
      getRequest(assetGroupUrl, { is_active: true, limit: 100, pageno: 1 }, this.props),
      getRequest(recoverableCatUrl, { is_active: true, financial_year: fyId }, this.props),
    ]).then(([assetGroupRes, recoverableCatRes]) => {
      let options = [];

      if (assetGroupRes && assetGroupRes.status === 200) {
        const groups = assetGroupRes.data.data.data_list || assetGroupRes.data.data || [];
        const leafGroups = groups.filter(
          (g) => !groups.some((child) => child.parent_group === g.id)
        );
        leafGroups.forEach((g) => {
          let parentName = g.parent_group_name;
          if (!parentName && g.parent_group) {
            const parent = groups.find((p) => p.id === g.parent_group);
            parentName = parent ? parent.name : null;
          }
          options.push({
            id: g.id,
            name: `Fixed Asset → ${parentName ? parentName + ' → ' : ''}${g.name}`,
            type: 'FIXED_ASSET',
          });
        });
      }

      if (recoverableCatRes && recoverableCatRes.status === 200) {
        const categories = recoverableCatRes.data.data || [];
        categories.forEach((c) => {
          options.push({
            id: c.id,
            name: `Recoverable → ${c.name}`,
            type: 'RECOVERABLE',
          });
        });
      }

      this.setState({ linkAssetCategoryOptions: options });
    });
  };

  loadLinkAssets = (category) => {
    if (!category) {
      this.setState({ linkAssetOptions: [], selectedLinkAsset: null });
      return;
    }
    this.setState({ loadingLinkAssets: true, linkAssetOptions: [], selectedLinkAsset: null });
    const fyId = this.state.year;

    if (category.type === 'FIXED_ASSET') {
      const url = GET_URL.assetList.api;
      const params = { is_active: true, asset_group: category.id, status: 'ACTIVE', financial_year: fyId, limit: 100, pageno: 1 };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          const assets = response.data.data.data_list || response.data.data || [];
          const options = assets.map((a) => ({
            id: a.id,
            name: `${a.asset_code} - ${a.asset_name}`,
          }));
          this.setState({ linkAssetOptions: options, loadingLinkAssets: false });
        } else {
          this.setState({ loadingLinkAssets: false });
        }
      });
    } else if (category.type === 'RECOVERABLE') {
      const url = GET_URL.recoverableAsset.api;
      const params = { is_active: true, category: category.id, status: 'APPROVED', limit: 100, pageno: 1 };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          const assets = response.data.data.data_list || response.data.data || [];
          const options = assets.map((a) => ({
            id: a.id,
            name: a.name,
          }));
          this.setState({ linkAssetOptions: options, loadingLinkAssets: false });
        } else {
          this.setState({ loadingLinkAssets: false });
        }
      });
    }
  };


  render() {
    const {
      yearName,
      loading,
      expenses,
      fieldErrors,
      expensesTypeList,
      helperText,
      enableUploadIcons,
      vehicles,
      largeImagePreview,
      is_token_present,
      loadingVehicles,
      fromDate,
      toDate,
      isEnable,
      upload_name,
      openError,
      alertData,
      submitDisable,
      pageLoading,
      isBlankPage,
      alertImageData,
      return_details,
      expense_pdf_upload,
      error_attachment,
      savedBankList,
      show_bank_name_in_payment_details
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <div>
          {largeImagePreview && (
            <Box className="set-question-large-image-preview-box">
              <img
                src={largeImagePreview}
                alt="Image Preview"
                className="set-question-large-image-preview"
              />
              <Tooltip title="Close Image" placement="top-start">
                <Box
                  className="set-question-large-image-remove-icon-box"
                  onClick={this.handleCloseLargeImage}
                >
                  <HighlightOffIcon className="set-question-large-image-remove-icon" />
                </Box>
              </Tooltip>
            </Box>
          )}
          <Paper className="paper-background">
            <Grid container>
              <Grid item md={8} xs={12} className="header-align">
                <Box className="heading">Create Expenses</Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("expenses_create", "view") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.expenses_create.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.expenses_create.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Box className="md-down-justify-start md-up-justify-start mb-y-20">
              <Box className="year-std-box mr-40">
                <Box className="academic-std-head">
                  {" "}
                  Financial Year
                </Box>
                <Box className=" exam-mark-add-heading-bg">{yearName}</Box>
              </Box>
            </Box>
            <Grid container>
              <Grid item md={3} xs={12}>
                <DropDownWithSearch
                  options={expensesTypeList}
                  value={expenses.selectedExpenses}
                  onChange={(e, newValue) =>
                    this.handleDropDownSearchChange(e, newValue)
                  }
                  name="selectedExpenses"
                  label="Expense Type"
                  optionValue="expense_type_name"
                  className="width-100"
                  helperText={
                    expenses.selectedExpenses
                      ? ``
                      : fieldErrors["selectedExpenses"]
                  }
                  error={fieldErrors["selectedExpenses"]}
                  hideClearIcon={true}
                />
              </Grid>
            </Grid>
            {isBlankPage && !pageLoading && (
              <Grid item md={12} className="header-align">
                <BlankPagewithIcon data="Select Expense Type" />
              </Grid>
            )}
            {pageLoading ||
              (loadingVehicles && (
                <Box className="loading">
                  <CircularProgress />
                </Box>
              ))}
            {!pageLoading && !isBlankPage && !loadingVehicles && (
              <Grid container spacing={2}>
                <Grid item md={8} xs={12}>
                  <Paper className="paper-plain-background header-align p-t-20px p-b-20px">
                    {expenses.selectedExpenses &&
                      expenses.selectedExpenses.expense_type_codename ===
                      "transport" &&
                      !is_token_present && (
                        <Box className="end-flex-prop">
                          <AddTokenExpense
                            return_details={this.return_details}
                            from_date={fromDate}
                            to_date={toDate}
                          />
                        </Box>
                      )}
                    <Grid container spacing={2}>
                      <Grid item md={6} xs={12}>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                          <KeyboardDatePicker
                            className="width-100"
                            autoOk
                            variant="inline"
                            inputVariant="outlined"
                            label="Purchase Date"
                            minDate={fromDate}
                            maxDate={new Date()}
                            name="selectedDate"
                            // InputLabelProps={{ shrink: expenses.selectedDate ? true : false }}
                            format="dd-MM-yyyy"
                            value={
                              expenses.selectedDate
                                ? expenses.selectedDate
                                : null
                            }
                            required={true}
                            onChange={(e) => this.handleDateSearchChange(e)}
                            KeyboardButtonProps={{
                              "aria-label": "change date",
                            }}
                            helperText={
                              fieldErrors["selectedDate"] === ""
                                ? helperText["selectedDate"]
                                : fieldErrors["selectedDate"]
                            }
                            error={
                              fieldErrors["selectedDate"] &&
                              (fieldErrors["selectedDate"] === ""
                                ? false
                                : true)
                            }
                          />
                        </MuiPickersUtilsProvider>
                      </Grid>
                      <Grid item md={6} xs={12}>
                        {expenses.selectedExpenses &&
                          expenses.selectedExpenses.expense_type_codename ===
                          "transport" &&
                          !is_token_present && (
                            <DropDownWithSearch
                              options={vehicles}
                              value={expenses.selectedVehicle}
                              onChange={(e, newValue) =>
                                this.handleDropDownChange(
                                  e,
                                  newValue,
                                  "selectedVehicle"
                                )
                              }
                              name="selectedVehicle"
                              label="Select Vehicle"
                              optionValue="vehicle_name"
                              className="width-100"
                              helperText={
                                expenses.selectedVehicle
                                  ? ``
                                  : fieldErrors["selectedVehicle"]
                              }
                              error={fieldErrors["selectedVehicle"]}
                            />
                          )}
                        {is_token_present && (
                          <Box className="red-text close-icon-text-fields-box">
                            <HighlightOffIcon
                              className="cross-btn-nominee end-flex-prop close-icon-multiple-add-text-fields"
                              onClick={() => this.deleteToken()}
                            />
                          </Box>
                        )}
                        {expenses.selectedExpenses &&
                          expenses.selectedExpenses.expense_type_codename ===
                          "transport" &&
                          is_token_present && (
                            <Box className="token-number-expense">
                              {`Token Number - ${return_details.details.token_num}`}
                            </Box>
                          )}
                      </Grid>
                    </Grid>
                    <Grid container spacing={2} className="header-align">
                      <Grid item md={6} xs={12}>
                        <TextField
                          label="Payee Name"
                          required={true}
                          name="payee_name"
                          value={expenses.payee_name}
                          className="width-100"
                          inputProps={{ maxLength: "30" }}
                          fullWidth={true}
                          variant="outlined"
                          helperText={
                            fieldErrors["payee_name"] === ""
                              ? helperText["payee_name"]
                              : fieldErrors["payee_name"]
                          }
                          error={fieldErrors["payee_name"]}
                          onChange={(e) => this.handleSearchChange(e)}
                        />
                      </Grid>
                      <Grid item md={6} xs={12}>
                        <TextField
                          label="Amount"
                          required={true}
                          name="amount"
                          type="text"
                          value={expenses.amount}
                          disabled={expenses.selectedExpenses ? false : true}
                          className="width-100"
                          InputProps={{
                            inputComponent: NumberFormatCustom,
                          }}
                          inputProps={{
                            maxLength: "15",
                            style: { textAlign: "right" },
                          }}
                          fullWidth={true}
                          variant="outlined"
                          helperText={
                            expenses.selectedExpenses
                              ? fieldErrors["amount"]
                                ? fieldErrors["amount"]
                                : expenses.selectedExpenses.max_amount
                                  ? `maximum amount is ${expenses.selectedExpenses.max_amount}`
                                  : ""
                              : "Select Expense Type to enter amount"
                          }
                          error={fieldErrors["amount"]}
                          onChange={(e) => this.handleSearchChange(e)}
                        />
                      </Grid>
                    </Grid>
                    <Grid container spacing={2} className="header-align">
                      <Grid item md={6} xs={12}>
                        <DropDownWithSearch
                          options={MODE_OF_PAYMENTS}
                          value={expenses.mode_of_payment}
                          onChange={(e, newValue) =>
                            this.handleDropDownChange(
                              e,
                              newValue,
                              "mode_of_payment"
                            )
                          }
                          name="mode_of_payment"
                          label="Mode Of Payment"
                          optionValue="name"
                          className="width-100"
                          helperText={
                            expenses.mode_of_payment
                              ? ``
                              : fieldErrors["mode_of_payment"]
                          }
                          error={fieldErrors["mode_of_payment"]}
                          required
                        />
                        {show_bank_name_in_payment_details && expenses.mode_of_payment?.id === "Cash" && (
                          <Box mt={1}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={this.state.withdraw_from_cash_in_hand}
                                  onChange={(e) => {
                                    this.setState({
                                      withdraw_from_cash_in_hand: e.target.checked,
                                    });
                                  }}
                                  color="primary"
                                />
                              }
                              label="Withdraw from cash in hand"
                            />
                          </Box>
                        )}
                        {show_bank_name_in_payment_details && expenses.mode_of_payment?.name !== "Cash" && (
                          <Box mt={1}>
                            <DropDownWithSearch
                              options={savedBankList}
                              optionValue="label"
                              name="saved_bank"
                              value={
                                savedBankList.find((b) => b.name === expenses.bank_details?.bank_detail_id) || null
                              }
                              onChange={(e, newValue) => {
                                let { expenses } = this.state;
                                expenses.bank_details = {
                                  bank_detail_id: newValue ? newValue.name : null,
                                };
                                this.setState({ expenses });
                              }}
                              label="Paid in Bank"
                              className="width-100"
                              hideClearIcon={false}
                            />
                          </Box>
                        )}
                      </Grid>
                      <Grid item md={6} xs={12}>
                        <TextField
                          label={
                            expenses?.mode_of_payment?.["id"] === "Cheque"
                              ? "Cheque Number"
                              : "Ref Number"
                          }
                          required={false}
                          name="refNumber"
                          value={expenses.refNumber}
                          className="width-100"
                          inputProps={{ maxLength: "20" }}
                          fullWidth={true}
                          variant="outlined"
                          helperText={
                            fieldErrors["refNumber"] === ""
                              ? helperText["refNumber"]
                              : fieldErrors["refNumber"]
                          }
                          error={fieldErrors["refNumber"]}
                          onChange={(e) => this.handleSearchChange(e)}
                        />
                      </Grid>
                      {expenses?.mode_of_payment?.["id"] === "Cheque" && (
                        <Grid item md={6} xs={12}>
                          <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                              className="width-100"
                              autoOk
                              variant="inline"
                              inputVariant="outlined"
                              label="Cheque Clearance Date"
                              format="dd-MM-yyyy"
                              value={expenses.chequeClearanceDate || null}
                              onChange={(date) =>
                                this.handleSearchChange({
                                  target: {
                                    name: "chequeClearanceDate",
                                    value: date,
                                  },
                                })
                              }
                              KeyboardButtonProps={{
                                "aria-label": "change date",
                              }}
                              maxDate={new Date()}
                            />
                          </MuiPickersUtilsProvider>
                        </Grid>
                      )}
                    </Grid>
                    <Grid container spacing={2} className="header-align">
                      <Grid item md={6} xs={12}>
                        <Box display="flex" alignItems="center" mb={1}>
                          <ToggleButtonGroup
                            size="small"
                            value={this.state.taxInputMode}
                            exclusive
                            onChange={(event, newMode) => {
                              if (newMode !== null) {
                                let { expenses } = this.state;
                                expenses.amountTax = "";
                                expenses.taxPercentage = "";
                                this.setState({ taxInputMode: newMode, expenses });
                              }
                            }}
                            style={{ marginRight: 10 }}
                          >
                            <ToggleButton value="percentage" style={{ padding: '4px 12px', fontSize: '13px' }}>
                              %
                            </ToggleButton>
                            <ToggleButton value="amount" style={{ padding: '4px 12px', fontSize: '13px' }}>
                              ₹
                            </ToggleButton>
                          </ToggleButtonGroup>
                          <Box style={{ fontSize: '12px', color: '#666' }}>
                            {this.state.taxInputMode === "percentage" ? "Enter tax as percentage" : "Enter tax as amount"}
                          </Box>
                        </Box>
                        {this.state.taxInputMode === "percentage" ? (
                          <TextField
                            label="Tax (%)"
                            name="taxPercentage"
                            type="number"
                            value={expenses.taxPercentage || ""}
                            className="width-100"
                            disabled={expenses.amount ? false : true}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                            inputProps={{
                              maxLength: "6",
                              style: { textAlign: "right" },
                              min: 0,
                              max: 100,
                            }}
                            fullWidth={true}
                            variant="outlined"
                            helperText={
                              expenses.amount
                                ? fieldErrors["amountTax"]
                                  ? fieldErrors["amountTax"]
                                  : expenses.taxPercentage
                                    ? `Tax amount: ₹${((parseFloat(expenses.amount) * parseFloat(expenses.taxPercentage)) / 100).toFixed(2)}`
                                    : "Enter percentage to calculate tax"
                                : "Enter amount first"
                            }
                            error={fieldErrors["amountTax"]}
                            onChange={(e) => {
                              let { expenses, isEnable } = this.state;
                              let percentage = e.target.value;
                              expenses.taxPercentage = percentage;
                              if (percentage && expenses.amount) {
                                expenses.amountTax = ((parseFloat(expenses.amount) * parseFloat(percentage)) / 100).toFixed(2);
                              } else {
                                expenses.amountTax = "";
                              }
                              isEnable["amountTax"] = true;
                              this.setState({ expenses, isEnable }, () => {
                                this.validateAmount();
                              });
                            }}
                          />
                        ) : (
                          <TextField
                            label="Tax (₹)"
                            name="amountTax"
                            type="text"
                            value={expenses.amountTax}
                            className="width-100"
                            disabled={expenses.amount ? false : true}
                            InputProps={{
                              inputComponent: NumberFormatCustom,
                            }}
                            inputProps={{
                              maxLength: "15",
                              style: { textAlign: "right" },
                            }}
                            fullWidth={true}
                            variant="outlined"
                            helperText={
                              expenses.amount
                                ? fieldErrors["amountTax"]
                                  ? fieldErrors["amountTax"]
                                  : expenses.selectedExpenses.max_amount
                                    ? `Including Amount and Tax, maximum amount is ${expenses.selectedExpenses.max_amount}`
                                    : ""
                                : "Enter amount to enter tax"
                            }
                            error={fieldErrors["amountTax"]}
                            onChange={(e) => this.handleSearchChange(e)}
                          />
                        )}
                      </Grid>
                      <Grid item md={6} xs={12} style={{ paddingTop: 40 }}>
                        <TextField
                          label="GSTIN Number"
                          required={false}
                          name="gst_number"
                          value={expenses.gst_number}
                          className="width-100"
                          inputProps={{ maxLength: "15" }}
                          fullWidth={true}
                          variant="outlined"
                          helperText={
                            fieldErrors["gst_number"] === ""
                              ? helperText["gst_number"]
                              : fieldErrors["gst_number"]
                          }
                          error={fieldErrors["gst_number"]}
                          onChange={(e) => this.handleSearchChange(e)}
                        />
                      </Grid>
                      <Grid item md={6} xs={12}>
                        <TextField
                          label="Purchased Receipt Num"
                          required={false}
                          name="purchased_receipt_num"
                          value={expenses.purchased_receipt_num}
                          className="width-100"
                          inputProps={{ maxLength: "15" }}
                          fullWidth={true}
                          variant="outlined"
                          helperText={
                            fieldErrors["purchased_receipt_num"] === ""
                              ? helperText["purchased_receipt_num"]
                              : fieldErrors["purchased_receipt_num"]
                          }
                          error={fieldErrors["purchased_receipt_num"]}
                          onChange={(e) => this.handleSearchChange(e)}
                        />
                      </Grid>
                    </Grid>
                    {/* Unified Link to Asset - shown with asset permission, create mode only */}
                    {this.state.hasAssetPermission && !this.state.isEdit && (
                      <Grid container spacing={2} className="header-align">
                        <Grid item md={12} xs={12}>
                          <Box mt={2} mb={1} fontWeight="bold" fontSize="0.95rem" color="#333">
                            Link to Asset (Optional)
                          </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                          <DropDownWithSearch
                            options={this.state.linkAssetCategoryOptions}
                            value={this.state.selectedLinkCategory}
                            onChange={(e, newValue) => {
                              this.setState({ selectedLinkCategory: newValue, selectedLinkAsset: null });
                              this.loadLinkAssets(newValue);
                            }}
                            name="linkAssetCategory"
                            label="Asset Type / Category"
                            optionValue="name"
                            className="width-100"
                            helperText="Select a Fixed Asset group or Recoverable category"
                            hideClearIcon={false}
                          />
                        </Grid>
                        {this.state.selectedLinkCategory && (
                          <Grid item md={6} xs={12}>
                            <DropDownWithSearch
                              options={this.state.linkAssetOptions}
                              value={this.state.selectedLinkAsset}
                              onChange={(e, newValue) => {
                                this.setState({ selectedLinkAsset: newValue });
                              }}
                              name="linkAsset"
                              label={this.state.selectedLinkCategory.type === 'FIXED_ASSET' ? 'Select Fixed Asset' : 'Select Recoverable Asset'}
                              optionValue="name"
                              className="width-100"
                              loading={this.state.loadingLinkAssets}
                              hideClearIcon={false}
                            />
                          </Grid>
                        )}
                      </Grid>
                    )}
                    <Grid container>
                      <Grid item md={12}>
                        <FormControl
                          fullWidth
                          error={
                            fieldErrors.comment &&
                            (fieldErrors.comment ? true : false)
                          }
                        >
                          <Box className="create-expenses-comment header-align">
                            Comment
                          </Box>
                          <TextareaAutosize
                            aria-label="minimum height"
                            className="create-expenses-comment-auto-size"
                            value={expenses.comment}
                            name="comment"
                            maxLength={200}
                            onChange={(e) => this.handleSearchChange(e)}
                            required
                          />
                          {fieldErrors.comment && (
                            <FormHelperText>
                              {fieldErrors.comment}
                            </FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item md={4} xs={12}>
                  <Paper className="header-align create-expenses-right-part-paper">
                    <Box className="text-center">
                      <Box className="header-align">
                        {enableUploadIcons && (
                          <label htmlFor="upload-pic">
                            <Button
                              variant="raised"
                              component="span"
                              className="create-expenses-upload-receipts-button"
                            >
                              {`${upload_name} ${expense_pdf_upload ? "*" : ""
                                }`}
                              <Box className="upload-icon">
                                <i class="fa fa-upload" aria-hidden="true"></i>
                              </Box>
                            </Button>
                          </label>
                        )}
                        <div className="text-red">{error_attachment}</div>
                        {alertImageData && (
                          <Box className="error-content p-t-20px">
                            {alertImageData}{" "}
                          </Box>
                        )}
                      </Box>
                      <input
                        type="file"
                        id="upload-pic"
                        className="display-none"
                        onChange={(e) => this.handleChange(e, "img")}
                        onClick={(e) => (e.target.value = null)}
                      />

                      {expenses.receipt_preview !== "" &&
                        enableUploadIcons &&
                        expenses.receipt && (
                          <Box className="flex-justify-space-around header-align">
                            <Box>{expenses.receipt_name}</Box>
                            <Box>
                              <VisibilityOutlinedIcon
                                onClick={this.handleViewImage}
                                className="create-expenses-image-view"
                              />
                            </Box>
                            <Box>
                              <DeleteIcon
                                onClick={this.handleDeleteImage}
                                className="create-expenses-image-delete"
                              />
                            </Box>
                          </Box>
                        )}
                      {!enableUploadIcons && (
                        <Box className="upload-profile-loading">
                          <CircularProgress />
                        </Box>
                      )}
                    </Box>
                    <Box className="create-expenses-info-outer-box">
                      {isEnable["selectedDate"] && !is_token_present && (
                        <Box className="create-expenses-outer-box-label-value">
                          <Box className="create-expenses-label">Purchase Date</Box>
                          <Box className="create-expenses-value">
                            {this.getDateFormat()}
                          </Box>
                        </Box>
                      )}
                      {isEnable["selectedExpenses"] && !is_token_present && (
                        <Box className="create-expenses-outer-box-label-value">
                          <Box className="create-expenses-label">
                            Expenses Type
                          </Box>
                          <Box className="create-expenses-value">
                            {expenses.selectedExpenses &&
                              expenses.selectedExpenses.expense_type_name}
                          </Box>
                        </Box>
                      )}
                      {is_token_present && (
                        <Box className="create-expenses-outer-box-label-value">
                          <Box className="create-expenses-label">
                            Staff Name
                          </Box>
                          <Box className="create-expenses-value">
                            {return_details.details.staff_first_name}
                          </Box>
                        </Box>
                      )}
                      {is_token_present && (
                        <Box className="create-expenses-outer-box-label-value">
                          <Box className="create-expenses-label">
                            Vehicle Details
                          </Box>
                          <Box className="create-expenses-value">{`${return_details.details.other_details.name} - ${return_details.details.other_details.vehicle_num}`}</Box>
                        </Box>
                      )}
                      {is_token_present && (
                        <Box className="create-expenses-outer-box-label-value">
                          <Box className="create-expenses-label">
                            Number of Liters
                          </Box>
                          <Box className="create-expenses-value">
                            {return_details.details.liter}
                          </Box>
                        </Box>
                      )}
                      {isEnable["amount"] && (
                        <Box className="create-expenses-outer-box-label-value">
                          <Box className="create-expenses-label">Amount</Box>
                          <Box className="create-expenses-value">
                            {expenses.amount}
                          </Box>
                        </Box>
                      )}
                      {isEnable["amountTax"] && (
                        <Box className="create-expenses-outer-box-label-value">
                          <Box className="create-expenses-label">Tax</Box>
                          <Box className="create-expenses-value">
                            {expenses.amountTax ? expenses.amountTax : 0.0}
                          </Box>
                        </Box>
                      )}
                      {isEnable["amountTax"] && (
                        <Box>
                          <Divider variant="middle" />
                          <Box className="create-expenses-outer-box-label-value">
                            <Box className="create-expenses-total-label">
                              Total
                            </Box>
                            <Box className="create-expenses-total-value">
                              {this.getAmountWithTax()}
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}
            <Box
              display="flex"
              marginLeft="auto"
              justifyContent="flex-end"
              className="header-align"
            >
              <Button
                variant="contained"
                color="primary"
                className="submit"
                disabled={submitDisable ? submitDisable : !enableUploadIcons}
                onClick={this.submit}
              >
                Submit &nbsp;{" "}
              </Button>
            </Box>
          </Paper>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openError}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </div>
      );
    }
  }
}

export default withRouter(CreateExpenses);
