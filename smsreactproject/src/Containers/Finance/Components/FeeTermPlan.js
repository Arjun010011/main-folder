import React from "react";
import { Box, Button, Snackbar, Tooltip } from "@material-ui/core";
import PropTypes from "prop-types";
import DateFnsUtils from "@date-io/date-fns";
import moment from "moment";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import ArrowRightIcon from "@material-ui/icons/ChevronRight";
import ArrowLeftIcon from "@material-ui/icons/ChevronLeft";
import ErrorIcon from "@material-ui/icons/Error";
import { FormattedMessage } from "react-intl";
import messages from "Containers/Finance/messages";
import commonMessage from "Constants/messages";
import { Dropdown } from "Components/DropDown";
import DivideTermsDialog from "./DivideTermsDialog";

import {
  DivideNumberIntoN,
  validateDate,
  Alert,
  isUserHasPermission,
  numberWithCommas,
} from "Includes/functions";
import AddInputField from "Components/AddInputField";
import { validateAmount } from "Includes/validations";
import {
  TRANSPORT_CODE,
  APPROVAL_STATUS,
  minDate,
  maxDate,
  TERMS_LIST,
} from "Constants";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

import "./../styles.scss";

class FeeTermPlan extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldError: [],
      selectedFeePlan: {},
      totalAmountError: "",
      snackbar: { show: false, data: "" },
      permissions: [],
      isFineExpanded: false,
      differenceAmountError: "",
      termList: TERMS_LIST,
      isEnabledSequence: !isFormDefinitionEnabled(
        "fee_configurations",
        "hide_fee_term_sequence",
        1
      ),
    };
    this.columns = [
      {
        label: <FormattedMessage {...commonMessage.term} />,
      },
      {
        label: "Term Alias",
      },
      {
        codename: "amount",
        label: <FormattedMessage {...commonMessage.amount} />,
      },
      {
        label: <FormattedMessage {...messages.viewFeeTermStartDate} />,
      },
      {
        label: <FormattedMessage {...messages.viewFeeTermEndDate} />,
      },
      {
        label: <FormattedMessage {...messages.viewFeeTermPaymentStartDate} />,
      },
      {
        label: <FormattedMessage {...messages.viewFeeTermPaymentEndDate} />,
      },
      {
        codename: "sequence",
        label: <FormattedMessage {...messages.sequence} />,
      },
      {
        codename: "fine",
        label: <FormattedMessage {...messages.fineFrequencyInDays} />,
      },
      {
        codename: "fine",
        label: <FormattedMessage {...messages.fineAmountPerFreq} />,
      },
      {
        codename: "fine",
        label: <FormattedMessage {...messages.maxFineAmount} />,
      },
    ];
  }
  componentDidMount = () => {
    let permissions = ["create"];
    // if (isUserHasPermission('fee_plan', 'create')) {
    //     permissions.push('create');
    // }
    const fieldError = [];
    for (
      let fee_plan = 0;
      fee_plan < this.props.selectedFeePlan.standard_fee.length;
      fee_plan++
    ) {
      let data = {
        terms: "",
        amount: "",
        term_alias: "",
        term_start_date: "",
        term_end_date: "",
        payment_start_date: "",
        payment_end_date: "",
        fee_fine_rate: "",
        fee_fine_frequency_in_days: "",
        max_fee_fine_rate: "",
      };
      fieldError.push(data);
    }
    this.setState(
      { fieldError, selectedFeePlan: this.props.selectedFeePlan },
      () => {
        this.calculateDifferenceAmount();
      }
    );
  };
  onBlurFieldValue = (e, index) => {
    let { selectedFeePlan, fieldError } = this.state;
    let { value, name } = e.target;
    let test = { errorFound: false };
    selectedFeePlan.standard_fee[index][name] = value;
    fieldError[index][name] = "";
    if (name == "term_alias") {
      selectedFeePlan.standard_fee.map((data, dIndex) => {
        if (value && data[name] === value && index !== dIndex) {
          fieldError[index][name] = "Duplicate data found";
        }
      });
    } else {
      test = validateAmount(value, false, 1, null);
      if (value === "") {
        selectedFeePlan.standard_fee[index][name] = "";
        fieldError[index][name] = "";
      } else if (test.errorFound) {
        fieldError[index][name] = test.errorText;
      } else {
        if (!Number.isNaN(parseFloat(value)) && parseFloat(value) !== 0) {
          value = parseFloat(value);
        }
      }
    }
    this.setState({ selectedFeePlan, fieldError }, () => {
      this.props.updateFeeData(selectedFeePlan, false);
      this.calculateDifferenceAmount();
    });
  };

  onChangeFieldValue = (e, index) => {
    let { fieldError } = this.state;
    let { name } = e.target;
    fieldError[index][name] = "";
    this.setState({
      fieldError,
    });
  };
  onChangeTotalAmount = (e) => {
    let { value } = e.target;
    let { selectedFeePlan, totalAmountError } = this.state;
    let test = validateAmount(value);
    if (!test && value === "") {
      totalAmountError = "Please Enter Total Amount";
      selectedFeePlan.amount = value;
    } else if (!test) {
      totalAmountError = "special case not allowed";
    } else {
      if (!Number.isNaN(parseFloat(value)) && parseFloat(value) !== 0) {
        value = parseFloat(value);
      }
      selectedFeePlan.amount = value;
      totalAmountError = "";
    }
    this.setState({ selectedFeePlan, totalAmountError }, () => {
      this.props.updateFeeData(selectedFeePlan, false);
      this.calculateDifferenceAmount();
    });
  };

  onClickActionButton = (action, index) => {
    let selectedFeePlan = JSON.parse(
      JSON.stringify(this.state.selectedFeePlan)
    );
    let fieldError = [...this.state.fieldError];
    let { differenceAmount } = this.state;
    let errors;
    let proceed = true;
    if (action === "delete") {
      fieldError.splice(index, 1);
      selectedFeePlan.standard_fee.splice(index, 1);
      selectedFeePlan.standard_fee.forEach((element, index) => {
        element.terms = "Term" + index;
      });
    } else {
      fieldError.forEach((data, index) => {
        Object.keys(data).forEach((temp) => {
          if (data[temp] != "") {
            errors = true;
          }
        });
      });
      if (!errors) {
        const amount =
          selectedFeePlan.standard_fee[selectedFeePlan.standard_fee.length - 1]
            .amount;
        let academic_year_end_date = new Date(
          selectedFeePlan.academic_year_end_date
        );
        let academic_year_end_date_format = moment(
          academic_year_end_date
        ).format("YYYY-MM-DD");
        let academic_year_start_date = new Date(
          selectedFeePlan.academic_year_start_date
        );

        let term_enddate = new Date(
          selectedFeePlan.standard_fee[
            selectedFeePlan.standard_fee.length - 1
          ].term_end_date
        );
        let aterm_enddate_format = moment(term_enddate).format("YYYY-MM-DD");
        if (aterm_enddate_format === academic_year_end_date_format) {
          let snackbar = {
            show: true,
            data: `Last term end date is equal to academic year end date`,
          };
          this.setState({ snackbar });
          return;
        }
        if (!Boolean(amount)) {
          let snackbar = {
            show: true,
            data: `Add ${
              selectedFeePlan.standard_fee[
                selectedFeePlan.standard_fee.length - 1
              ].terms
            } amount`,
          };
          this.setState({ snackbar });
          return;
        }
        let last_term_start_date = moment(
          selectedFeePlan.standard_fee[selectedFeePlan.standard_fee.length - 1]
            .term_start_date
        );
        let last_term_end_date = moment(
          selectedFeePlan.standard_fee[selectedFeePlan.standard_fee.length - 1]
            .term_end_date
        );

        let differenceInDays = last_term_end_date.diff(
          last_term_start_date,
          "days"
        );
        let term_start_date = new Date(
          selectedFeePlan.standard_fee[
            selectedFeePlan.standard_fee.length - 1
          ].term_end_date
        );
        term_start_date = new Date(
          term_start_date.setDate(term_start_date.getDate() + 1)
        );
        if (
          validateDate(
            term_start_date,
            new Date(academic_year_start_date),
            academic_year_end_date,
            "YYYY-MM-DD"
          ) !== ""
        ) {
          term_start_date = new Date(
            academic_year_end_date.setDate(academic_year_end_date.getDate() + 1)
          );
        }
        let term_end_date = new Date(term_start_date);
        term_end_date = new Date(
          moment(term_end_date).add("days", differenceInDays)
        );
        if (
          validateDate(
            term_end_date,
            new Date(term_start_date),
            academic_year_end_date,
            "YYYY-MM-DD"
          ) !== ""
        ) {
          term_end_date = new Date(
            academic_year_end_date.setDate(academic_year_end_date.getDate())
          );
        }
        let first_payment_start_date =
          selectedFeePlan.standard_fee[0].payment_start_date;
        let payment_start_date = new Date(first_payment_start_date);
        let payment_end_date = new Date(term_end_date);
        if (
          validateDate(
            payment_end_date,
            new Date(payment_start_date),
            academic_year_end_date,
            "YYYY-MM-DD"
          ) !== ""
        ) {
          payment_end_date = new Date(
            academic_year_end_date.setDate(academic_year_end_date.getDate() - 1)
          );
        }
        let tempAmount =
          selectedFeePlan.codename === TRANSPORT_CODE
            ? 12 - parseFloat(selectedFeePlan.amount)
            : differenceAmount >= 0
            ? parseInt(differenceAmount)
            : 0;
        let data = {
          id: "",
          terms: "",
          amount: tempAmount,
          term_start_date,
          term_end_date,
          payment_end_date,
          payment_start_date,
        };
        if (data.amount < 1) {
          data.amount = 0;
        }
        selectedFeePlan.standard_fee.forEach((element, index) => {
          if (parseFloat(element.amount) <= 0) {
            fieldError[index]["amount"] = "Amount Should be greater than 0";
            proceed = false;
          }
        });
        if (!proceed) {
          this.setState({
            fieldError,
          });
          return false;
        }
        selectedFeePlan.standard_fee.push(data);
        let errorData = {
          terms: "",
          term_alias: "",
          amount: "",
          term_start_date: "",
          term_end_date: "",
          payment_start_date: "",
          payment_end_date: "",
        };
        fieldError.push(errorData);
        differenceAmount = 0;
      }
    }
    if (!errors) {
      selectedFeePlan.standard_fee.forEach((element, index) => {
        const num = index + 1;
        element.terms = "Term" + num;
        element.term_alias = "Term" + num;
      });
      this.setState({ selectedFeePlan, fieldError, differenceAmount }, () => {
        const { selectedFeePlan, fieldError } = this.state;
        let fee_index = fieldError.length - 1;
        let {
          term_end_date,
          term_start_date,
          payment_end_date,
          payment_start_date,
        } = selectedFeePlan.standard_fee[fee_index];
        fieldError[fee_index]["term_end_date"] = this.validationForDate(
          selectedFeePlan,
          term_end_date,
          "term_end_date",
          fee_index
        );
        fieldError[fee_index]["term_start_date"] = this.validationForDate(
          selectedFeePlan,
          term_start_date,
          "term_start_date",
          fee_index
        );
        fieldError[fee_index]["payment_end_date"] = this.validationForDate(
          selectedFeePlan,
          payment_end_date,
          "payment_end_date",
          fee_index
        );
        fieldError[fee_index]["payment_start_date"] = this.validationForDate(
          selectedFeePlan,
          payment_start_date,
          "payment_start_date",
          fee_index
        );
        this.setState({ fieldError });
        this.props.updateFeeData(selectedFeePlan, false);
        this.calculateDifferenceAmount();
      });
    }
  };
  calculateDifferenceAmount = () => {
    let { fieldError, differenceAmountError } = this.state;
    differenceAmountError = "";
    const selectedFeePlan = { ...this.state.selectedFeePlan };
    let total = 0;
    let differenceAmount = 0;
    if (selectedFeePlan.codename === TRANSPORT_CODE) {
      total = 12;
    } else if (selectedFeePlan.amount && !isNaN(selectedFeePlan.amount)) {
      total = parseFloat(selectedFeePlan.amount);
    }
    let sumOftermsAmount = 0;
    selectedFeePlan.standard_fee.map((temp, index) => {
      if (selectedFeePlan.codename === TRANSPORT_CODE) {
        if (temp.amount && !isNaN(temp.amount))
          sumOftermsAmount =
            parseFloat(sumOftermsAmount) + parseFloat(temp.amount);
        if (
          temp.fee_fine_frequency_in_days ||
          temp.fee_fine_rate ||
          temp.max_fee_fine_rate
        ) {
          if (
            temp.fee_fine_frequency_in_days &&
            temp.fee_fine_rate &&
            temp.max_fee_fine_rate
          ) {
            if (temp.fee_fine_rate > temp.max_fee_fine_rate) {
              fieldError[index]["max_fee_fine_rate"] =
                "Maximum fine should be greater than fee fine";
            }
          } else {
            if (
              !temp.fee_fine_frequency_in_days &&
              parseFloat(temp.fee_fine_frequency_in_days) !== 0
            ) {
              fieldError[index]["fee_fine_frequency_in_days"] =
                "This field is required";
            }
            if (!temp.fee_fine_rate && parseFloat(temp.fee_fine_rate) !== 0) {
              fieldError[index]["fee_fine_rate"] = "This field is required";
            }
            if (
              !temp.max_fee_fine_rate &&
              parseFloat(temp.max_fee_fine_rate) !== 0
            ) {
              fieldError[index]["max_fee_fine_rate"] = "This field is required";
            }
          }
        }
      } else {
        if (temp.amount && !isNaN(temp.amount))
          sumOftermsAmount =
            parseFloat(sumOftermsAmount) + parseFloat(temp.amount);
        if (
          temp.fee_fine_frequency_in_days ||
          temp.fee_fine_rate ||
          temp.max_fee_fine_rate
        ) {
          if (
            temp.fee_fine_frequency_in_days &&
            temp.fee_fine_rate &&
            temp.max_fee_fine_rate
          ) {
            if (temp.fee_fine_rate > temp.max_fee_fine_rate) {
              fieldError[index]["max_fee_fine_rate"] =
                "Maximum fine should be greater than fee fine";
            }
          } else {
            if (
              !temp.fee_fine_frequency_in_days &&
              parseFloat(temp.fee_fine_frequency_in_days) !== 0
            ) {
              fieldError[index]["fee_fine_frequency_in_days"] =
                "This field is required";
            }
            if (!temp.fee_fine_rate && parseFloat(temp.fee_fine_rate) !== 0) {
              fieldError[index]["fee_fine_rate"] = "This field is required";
            }
            if (
              !temp.max_fee_fine_rate &&
              parseFloat(temp.max_fee_fine_rate) !== 0
            ) {
              fieldError[index]["max_fee_fine_rate"] = "This field is required";
            }
          }
        }
      }
    });
    this.setState({ fieldError });
    if (selectedFeePlan.codename !== TRANSPORT_CODE) {
      differenceAmount = total - sumOftermsAmount;
    } else {
      if (sumOftermsAmount > 12) {
        differenceAmountError = `Months should not exceed 12`;
      }
      selectedFeePlan.amount = sumOftermsAmount;
    }
    this.setState(
      { differenceAmount, selectedFeePlan, differenceAmountError },
      () => {
        this.props.updateFeeData(selectedFeePlan, false);
      }
    );
  };
  onChangeTermDate = (e, type, index) => {
    let selectedFeePlan = { ...this.state.selectedFeePlan };
    let field_name = e && e.currentTarget ? e.currentTarget.name : type;
    let fieldValue = e ? e : selectedFeePlan.standard_fee[index][field_name];
    fieldValue = moment(fieldValue).format("YYYY-MM-DD");
    selectedFeePlan.standard_fee[index][field_name] = fieldValue;
    this.setState({
      selectedFeePlan,
    });
  };
  handleTermsDate = (e, type, index) => {
    let selectedFeePlan = { ...this.state.selectedFeePlan };
    let field_name = e && e.currentTarget ? e.currentTarget.name : type;
    let fieldValue =
      e && e.currentTarget
        ? e.currentTarget.value
        : selectedFeePlan.standard_fee[index][field_name];
    if (
      e &&
      (field_name.includes("start_date") || field_name.includes("end_date"))
    ) {
      fieldValue = moment(fieldValue, "DD-MM-YYYY").format("YYYY-MM-DD");
    }
    let errorMessage = this.validationForDate(
      selectedFeePlan,
      fieldValue,
      field_name,
      index
    );
    let { fieldError } = this.state;
    fieldError[index][field_name] = "";
    if (errorMessage !== "") {
      fieldError[index][field_name] = errorMessage;
      this.setState({ fieldError });
    } else {
      selectedFeePlan.standard_fee[index][field_name] = fieldValue;

      //dependecy check after changing date
      for (let fee_index in selectedFeePlan.standard_fee) {
        let fee = selectedFeePlan.standard_fee[fee_index];
        for (let [term_key, term_value] of Object.entries(fee)) {
          if (
            term_key.includes("date") &&
            !(index === fee_index && term_key === field_name)
          ) {
            fieldError[fee_index][term_key] = this.validationForDate(
              selectedFeePlan,
              term_value,
              term_key,
              fee_index
            );
          }
        }
      }
      if (field_name === "term_start_date") {
        selectedFeePlan.standard_fee[index]["payment_start_date"] = fieldValue;
      } else if (field_name === "term_end_date") {
        selectedFeePlan.standard_fee[index]["payment_end_date"] = fieldValue;
      }
      this.setState({ selectedFeePlan, fieldError }, () => {
        this.props.updateFeeData(selectedFeePlan, false);
      });
    }
  };
  validationForDate = (selectedFeePlan, fieldValue, field_name, index) => {
    let errorMessage = "";
    let academic_year_start_date = new Date(
      selectedFeePlan.academic_year_start_date
    );
    let academic_year_end_date = new Date(
      selectedFeePlan.academic_year_end_date
    );
    let academic_year_end_date_formatted = moment(
      academic_year_end_date,
      "YYYY-MM-DD",
      true
    ).format("DD-MM-YYYY");
    const term_start_date =
      selectedFeePlan.standard_fee[index]["term_start_date"];
    const term_end_date = selectedFeePlan.standard_fee[index]["term_end_date"];
    const payment_start_date =
      selectedFeePlan.standard_fee[index]["payment_start_date"];
    const term_start_formatted = moment(
      term_start_date,
      "YYYY-MM-DD",
      true
    ).format("DD-MM-YYYY");
    const term_end_formatted = moment(term_end_date, "YYYY-MM-DD", true).format(
      "DD-MM-YYYY"
    );
    const payment_start_formatted = moment(
      payment_start_date,
      "YYYY-MM-DD",
      true
    ).format("DD-MM-YYYY");
    const yesterday_date = new Date(
      new Date().setDate(new Date().getDate() - 1)
    );
    const validateTermStartDate = validateDate(
      fieldValue,
      academic_year_start_date,
      academic_year_end_date,
      "YYYY-MM-DD"
    );
    if (field_name === "term_start_date" && validateTermStartDate !== "") {
      let acdemic_start_date_formatted = moment(
        selectedFeePlan.academic_year_start_date,
        "YYYY-MM-DD",
        true
      ).format("DD-MM-YYYY");
      let academic_year_end_date_formatted = moment(
        selectedFeePlan.academic_year_end_date,
        "YYYY-MM-DD",
        true
      ).format("DD-MM-YYYY");
      errorMessage = validateTermStartDate;
      if (validateTermStartDate !== "Invalid Date") {
        errorMessage = `${selectedFeePlan.standard_fee[index].terms} start date is not in a range of academic year(${acdemic_start_date_formatted})-(${academic_year_end_date_formatted})`;
      }
    } else if (field_name === "term_end_date") {
      errorMessage = this.dependentDateFieldCheck(
        term_start_date,
        "term start date",
        "term end date"
      );
      const validateTermEndtDate = validateDate(
        fieldValue,
        new Date(term_start_date),
        new Date(academic_year_end_date),
        "YYYY-MM-DD"
      );
      if (errorMessage === "" && validateTermEndtDate !== "") {
        errorMessage = "Invalid Date";
        if (validateTermEndtDate !== "Invalid Date") {
          errorMessage = `${selectedFeePlan.standard_fee[index].terms} end date should be between ${selectedFeePlan.standard_fee[index].terms} start date(${term_start_formatted}) and academic year end date${academic_year_end_date_formatted}`;
        }
      }
    } else if (field_name === "payment_start_date") {
      errorMessage = this.dependentDateFieldCheck(
        term_start_date,
        "term end date",
        "payment start date"
      );
      const validatePaymentStartDate = validateDate(
        fieldValue,
        new Date(payment_start_date),
        new Date(term_end_date),
        "YYYY-MM-DD"
      );
      if (errorMessage === "" && validatePaymentStartDate !== "") {
        errorMessage = "Invalid Date";
        if (validatePaymentStartDate !== "Invalid Date") {
          errorMessage = `${selectedFeePlan.standard_fee[index].terms} payment start date should be less than ${selectedFeePlan.standard_fee[index].terms} term end date(${term_end_formatted})`;
        }
      }
    } else if (field_name === "payment_end_date") {
      errorMessage = this.dependentDateFieldCheck(
        term_start_date,
        "term end date",
        "payment end date"
      );
      errorMessage = this.dependentDateFieldCheck(
        term_start_date,
        "payment start date",
        "payment end date"
      );
      const validatePaymentEndDate = validateDate(
        new Date(fieldValue),
        new Date(payment_start_date),
        new Date(term_end_date),
        "YYYY-MM-DD"
      );
      if (errorMessage === "" && validatePaymentEndDate !== "") {
        errorMessage = "Invalid Date";
        if (validatePaymentEndDate !== "Invalid Date") {
          errorMessage = `${selectedFeePlan.standard_fee[index].terms} payment end date should be between ${selectedFeePlan.standard_fee[index].terms} payment start date(${payment_start_formatted}) and ${selectedFeePlan.standard_fee[index].terms} term end date(${term_end_formatted})`;
        }
      }
    } else if (index > 0) {
      if (field_name === "term_start_date") {
        let last_term_end_date =
          selectedFeePlan.standard_fee[index - 1]["term_end_date"];
        if (
          validateDate(
            fieldValue,
            new Date(last_term_end_date),
            academic_year_end_date,
            "YYYY-MM-DD"
          ) !== ""
        ) {
          last_term_end_date = moment(
            last_term_end_date,
            "YYYY-MM-DD",
            true
          ).format("DD-MM-YYYY");
          errorMessage = `${
            selectedFeePlan.standard_fee[index].terms
          } start date should be greater than ${
            selectedFeePlan.standard_fee[index - 1].terms
          } end date(${last_term_end_date})`;
        }
      }
    }
    return errorMessage;
  };

  dependentDateFieldCheck = (field, fieldName, dependentFieldName) => {
    let errorMessage = "";
    if (!Boolean(field)) {
      errorMessage = `Select ${dependentFieldName} before selecting ${fieldName}`;
    }
    return errorMessage;
  };

  handleCloseSnackbar = () => {
    const snackbar = { show: false, data: "" };
    this.setState({ snackbar });
  };

  handleIsFineExpand = () => {
    this.setState({
      isFineExpanded: !this.state.isFineExpanded,
    });
  };

  onClickDivideButton = (feePlanName) => {
    this.setState({
      isDivideTermsDialogOpen: true,
      divideFeePlan: feePlanName,
    });
  };

  handleDropDownChange = (e, index) => {
    const { name, value } = e.target;
    let { selectedFeePlan, fieldError } = this.state;
    selectedFeePlan.standard_fee[index][name] = value;
    selectedFeePlan.standard_fee[index]["term_alias"] = value;
    fieldError[index]["terms"] = "";
    this.setState({ selectedFeePlan, fieldError }, () => {
      this.handleDuplicateTerm(index, value);
    });
  };

  handleDuplicateTerm = (index, value) => {
    const { selectedFeePlan, fieldError } = this.state;
    selectedFeePlan.standard_fee.map((data, dIndex) => {
      if (value && data["terms"] === value && index !== dIndex) {
        fieldError[index]["terms"] = "Duplicate data found";
      }
    });
    this.setState({
      fieldError,
    });
  };

  handleCloseDivideTerms = () => {
    this.setState({
      isDivideTermsDialogOpen: false,
    });
  };

  handleSubmitNumOfTerms = (numOfTerms) => {
    let { selectedFeePlan } = this.state;
    let tempPlan = { ...selectedFeePlan };
    tempPlan.standard_fee = [];
    let fieldError = [];
    let data = {
      terms: "",
      amount: "",
      term_alias: "",
      term_start_date: "",
      term_end_date: "",
      payment_start_date: "",
      payment_end_date: "",
      fee_fine_rate: "",
      fee_fine_frequency_in_days: "",
      max_fee_fine_rate: "",
    };
    let term_data = {};
    let amount_list = DivideNumberIntoN(selectedFeePlan.amount, numOfTerms);
    let date_range =  this.splitDateIntoEqualIntervals(new Date(selectedFeePlan.academic_year_start_date),new Date(selectedFeePlan.academic_year_end_date),numOfTerms)
    for (let i = 1; i <= numOfTerms; i++) {
      term_data = {
        terms: `Term${i}`,
        amount: amount_list[i - 1],
        term_alias: `Term ${i}`,
        term_start_date: date_range[i-1]['start'],
        term_end_date: date_range[i-1]['end'],
        payment_start_date: date_range[i-1]['start'],
        payment_end_date: date_range[i-1]['end'],
        fee_fine_rate: "",
        fee_fine_frequency_in_days: "",
        max_fee_fine_rate: "",
      };
      tempPlan.standard_fee.push(term_data);
      fieldError.push(data);
    }
    this.setState({
      isDivideTermsDialogOpen: false,
      selectedFeePlan: { ...tempPlan },
      fieldError,
    },()=>{
      this.props.updateFeeData(tempPlan, false);
    });
  };

  splitDateIntoEqualIntervals=(startDate, endDate, numberOfIntervals)=>{
    const intervalLength = (endDate.getTime() - startDate.getTime()) / numberOfIntervals
    return [...(new Array(numberOfIntervals))]
      .map((e, i) => {
        return {
          start: new Date(startDate.getTime() + i * intervalLength),
          end: new Date(startDate.getTime() + (i + 1) * intervalLength)
        }
      })
   }

  render() {
    const {
      fieldError,
      selectedFeePlan,
      differenceAmount,
      snackbar,
      permissions,
      isFineExpanded,
      isDivideTermsDialogOpen,
      isEnabledSequence,
      differenceAmountError,
      termList,
    } = this.state;
    const disabled =
      selectedFeePlan.is_approved === APPROVAL_STATUS.approved ||
      !permissions.includes("create")
        ? false
        : true;
    let showAddButton = false;
    if (!disabled) {
      showAddButton = true;
    }
    let rowIndex = 0;
    const academic_year_max_date =
      selectedFeePlan && selectedFeePlan.academic_year_end_date
        ? moment(selectedFeePlan.academic_year_end_date).format("YYYY-MM-DD")
        : maxDate;
    const academic_year_min_date =
      selectedFeePlan && selectedFeePlan.academic_year_start_date
        ? moment(selectedFeePlan.academic_year_start_date).format("YYYY-MM-DD")
        : minDate;
    const headerAmountOrPercent =
      selectedFeePlan.codename === TRANSPORT_CODE
        ? "Number Of Months"
        : "Amount (₹)";
    return (
      <>
        <TableRow>
          <TableCell colSpan={this.columns.length}>
            <Table
              aria-label="simple table"
              width="100%"
              style={{ border: "1px solid #e9e9e9" }}
            >
              <TableHead style={{ backgroundColor: "#f0f8ff" }}>
                <TableRow>
                  {this.columns.map((columnHeader, index) => {
                    if (
                      columnHeader.codename &&
                      columnHeader.codename === "amount"
                    ) {
                      return (
                        <TableCell
                          key={index}
                          className="word-break-normal feeterm-text-size"
                        >
                          {headerAmountOrPercent}
                        </TableCell>
                      );
                    } else if (
                      columnHeader.codename &&
                      columnHeader.codename === "fine" &&
                      isFineExpanded
                    ) {
                      return (
                        <TableCell
                          key={index}
                          className="word-break-normal feeterm-text-size"
                        >
                          {columnHeader.label}
                        </TableCell>
                      );
                    } else if (
                      columnHeader.codename &&
                      columnHeader.codename === "sequence" &&
                      isEnabledSequence
                    ) {
                      return (
                        <TableCell
                          key={index}
                          className="word-break-normal feeterm-text-size"
                        >
                          {columnHeader.label}
                        </TableCell>
                      );
                    } else if (!columnHeader.codename) {
                      return (
                        <TableCell
                          key={index}
                          className="word-break-normal feeterm-text-size"
                        >
                          {columnHeader.label}
                        </TableCell>
                      );
                    }
                  })}
                  {!isFineExpanded && (
                    <TableCell className="word-break-normal feeterm-text-size">
                      Expand fine
                    </TableCell>
                  )}
                  {isFineExpanded && (
                    <TableCell className="word-break-normal feeterm-text-size">
                      Collapse fine
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedFeePlan.standard_fee &&
                  selectedFeePlan.standard_fee.map((term, index) => {
                    let showDeleteButton =
                      !disabled && selectedFeePlan.standard_fee.length > 1
                        ? true
                        : false;
                    rowIndex = index;
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Box className="feeterm-text-size position-relative width-200-px">
                            <Dropdown
                              data={termList}
                              name={"terms"}
                              value={term.terms}
                              onChange={(e) =>
                                this.handleDropDownChange(e, index)
                              }
                              error={fieldError[index]["terms"]}
                              label={""}
                              hideSelect={true}
                              style="width-150px"
                              size="small"
                              showErrorMessage={false}
                            />
                            {fieldError[index]["terms"] !== "" && (
                              <Tooltip
                                title={fieldError[index]["terms"]}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <ErrorIcon className="fee-term-error-icon cursor-pointer " />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box className="feeterm-text-size position-relative">
                            {disabled ? (
                              <Box>{numberWithCommas(term.term_alias)}</Box>
                            ) : (
                              <AddInputField
                                type="text"
                                name={"term_alias"}
                                fieldValue={term.term_alias}
                                fieldError={""}
                                fieldProps={this.fieldProps}
                                showAddButton={false}
                                showDeleteButton={false}
                                onBlurFieldValue={this.onBlurFieldValue}
                                onChangeFieldValue={this.onChangeFieldValue}
                                onClickActionButton={this.onClickActionButton}
                                index={index}
                                disabled={disabled}
                              />
                            )}
                            {fieldError[index]["term_alias"] !== "" && (
                              <Tooltip
                                title={fieldError[index]["term_alias"]}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <ErrorIcon className="fee-term-error-icon cursor-pointer " />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box className="feeterm-text-size position-relative">
                            {disabled ? (
                              <Box>{numberWithCommas(term.amount)}</Box>
                            ) : (
                              <AddInputField
                                type="text"
                                name={"amount"}
                                fieldValue={term.amount}
                                fieldError={""}
                                fieldProps={this.fieldProps}
                                showAddButton={false}
                                showDeleteButton={false}
                                onBlurFieldValue={this.onBlurFieldValue}
                                onChangeFieldValue={this.onChangeFieldValue}
                                onClickActionButton={this.onClickActionButton}
                                index={index}
                                disabled={disabled}
                                max={
                                  selectedFeePlan.codename === TRANSPORT_CODE
                                    ? 12
                                    : selectedFeePlan.amount
                                }
                              />
                            )}
                            {fieldError[index]["amount"] !== "" && (
                              <Tooltip
                                title={fieldError[index]["amount"]}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <ErrorIcon className="fee-term-error-icon cursor-pointer " />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box className="feeterm-text-size position-relative">
                            {disabled ? (
                              <Box>{term.term_start_date}</Box>
                            ) : (
                              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <KeyboardDatePicker
                                  autoOk
                                  required
                                  variant="inline"
                                  name="term_start_date"
                                  minDate={academic_year_min_date}
                                  maxDate={academic_year_max_date}
                                  onClose={(e) =>
                                    this.handleTermsDate(
                                      e,
                                      "term_start_date",
                                      index
                                    )
                                  }
                                  onBlur={(e) =>
                                    this.handleTermsDate(
                                      e,
                                      "term_start_date",
                                      index
                                    )
                                  }
                                  format="dd-MM-yyyy"
                                  value={term.term_start_date}
                                  onChange={(e) =>
                                    this.onChangeTermDate(
                                      e,
                                      "term_start_date",
                                      index
                                    )
                                  }
                                  KeyboardButtonProps={{
                                    "aria-label": "change date",
                                  }}
                                  className="fee-term-date-filter"
                                  inputProps={{ color: "black" }}
                                  error={
                                    fieldError[index]["term_start_date"]
                                      ? true
                                      : false
                                  }
                                  helperText=""
                                />
                                {fieldError[index]["term_start_date"] !==
                                  "" && (
                                  <Tooltip
                                    title={fieldError[index]["term_start_date"]}
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <ErrorIcon className="fee-term-error-icon cursor-pointer " />
                                  </Tooltip>
                                )}
                              </MuiPickersUtilsProvider>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box className="feeterm-text-size position-relative">
                            {disabled ? (
                              <Box>{term.term_end_date}</Box>
                            ) : (
                              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <KeyboardDatePicker
                                  autoOk
                                  required
                                  variant="inline"
                                  fullWidth
                                  name="term_end_date"
                                  minDate={academic_year_min_date}
                                  maxDate={academic_year_max_date}
                                  onClose={(e) =>
                                    this.handleTermsDate(
                                      e,
                                      "term_end_date",
                                      index
                                    )
                                  }
                                  onBlur={(e) =>
                                    this.handleTermsDate(
                                      e,
                                      "term_end_date",
                                      index
                                    )
                                  }
                                  InputLabelProps={{
                                    shrink: term.term_end_date ? true : false,
                                  }}
                                  format="dd-MM-yyyy"
                                  value={term.term_end_date}
                                  onChange={(e) =>
                                    this.onChangeTermDate(
                                      e,
                                      "term_end_date",
                                      index
                                    )
                                  }
                                  KeyboardButtonProps={{
                                    "aria-label": "change date",
                                  }}
                                  className="fee-term-date-filter"
                                  helperText=""
                                  error={
                                    fieldError[index]["term_end_date"]
                                      ? true
                                      : false
                                  }
                                />
                              </MuiPickersUtilsProvider>
                            )}
                            {fieldError[index]["term_end_date"] !== "" && (
                              <Tooltip
                                title={fieldError[index]["term_end_date"]}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <ErrorIcon className="fee-term-error-icon cursor-pointer " />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box className="feeterm-text-size position-relative">
                            {disabled ? (
                              <Box>{term.payment_start_date}</Box>
                            ) : (
                              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <KeyboardDatePicker
                                  autoOk
                                  required
                                  variant="inline"
                                  fullWidth
                                  name="payment_start_date"
                                  maxDate={academic_year_max_date}
                                  onClose={(e) =>
                                    this.handleTermsDate(
                                      e,
                                      "payment_start_date",
                                      index
                                    )
                                  }
                                  onBlur={(e) =>
                                    this.handleTermsDate(
                                      e,
                                      "payment_start_date",
                                      index
                                    )
                                  }
                                  InputLabelProps={{
                                    shrink: term.payment_start_date
                                      ? true
                                      : false,
                                  }}
                                  format="dd-MM-yyyy"
                                  value={term.payment_start_date}
                                  onChange={(e) =>
                                    this.onChangeTermDate(
                                      e,
                                      "payment_start_date",
                                      index
                                    )
                                  }
                                  KeyboardButtonProps={{
                                    "aria-label": "change date",
                                  }}
                                  className="fee-term-date-filter"
                                  helperText=""
                                  error={
                                    fieldError[index]["payment_start_date"]
                                      ? true
                                      : false
                                  }
                                />
                              </MuiPickersUtilsProvider>
                            )}
                            {fieldError[index]["payment_start_date"] !== "" && (
                              <Tooltip
                                title={fieldError[index]["payment_start_date"]}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <ErrorIcon className="fee-term-error-icon cursor-pointer " />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell className="position-relative">
                          <Box className="feeterm-text-size position-relative">
                            {disabled ? (
                              <Box>{term.payment_end_date}</Box>
                            ) : (
                              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <KeyboardDatePicker
                                  autoOk
                                  required
                                  variant="inline"
                                  fullWidth
                                  name="payment_end_date"
                                  minDate={academic_year_min_date}
                                  maxDate={academic_year_max_date}
                                  onClose={(e) =>
                                    this.handleTermsDate(
                                      e,
                                      "payment_end_date",
                                      index
                                    )
                                  }
                                  onBlur={(e) =>
                                    this.handleTermsDate(
                                      e,
                                      "payment_end_date",
                                      index
                                    )
                                  }
                                  InputLabelProps={{
                                    shrink: term.payment_end_date
                                      ? true
                                      : false,
                                  }}
                                  format="dd-MM-yyyy"
                                  value={term.payment_end_date}
                                  onChange={(e) =>
                                    this.onChangeTermDate(
                                      e,
                                      "payment_end_date",
                                      index
                                    )
                                  }
                                  KeyboardButtonProps={{
                                    "aria-label": "change date",
                                  }}
                                  className="fee-term-date-filter"
                                  helperText=""
                                  error={
                                    fieldError[index]["payment_end_date"]
                                      ? true
                                      : false
                                  }
                                />
                              </MuiPickersUtilsProvider>
                            )}
                            {fieldError[index]["payment_end_date"] !== "" && (
                              <Tooltip
                                title={fieldError[index]["payment_end_date"]}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <ErrorIcon className="fee-term-error-icon cursor-pointer " />
                              </Tooltip>
                            )}
                            {showDeleteButton && (
                              <HighlightOffIcon
                                className="cross-btn-nominee end-flex-prop position-absolute top--11px"
                                style={{ right: "-8px" }}
                                onClick={() =>
                                  this.onClickActionButton("delete", index)
                                }
                              />
                            )}
                          </Box>
                        </TableCell>
                        {isFineExpanded && (
                          <TableCell>
                            <Box className="feeterm-text-size position-relative">
                              {disabled ? (
                                <Box>
                                  {numberWithCommas(
                                    term.fee_fine_frequency_in_days
                                  )}
                                </Box>
                              ) : (
                                <AddInputField
                                  name={"fee_fine_frequency_in_days"}
                                  fieldValue={term.fee_fine_frequency_in_days}
                                  fieldError={""}
                                  fieldProps={this.fieldProps}
                                  showAddButton={false}
                                  showDeleteButton={false}
                                  onBlurFieldValue={this.onBlurFieldValue}
                                  onChangeFieldValue={this.onChangeFieldValue}
                                  onClickActionButton={this.onClickActionButton}
                                  index={index}
                                  disabled={disabled}
                                  max={
                                    selectedFeePlan.fee_fine_frequency_in_days
                                  }
                                  error={
                                    fieldError[index][
                                      "fee_fine_frequency_in_days"
                                    ]
                                  }
                                />
                              )}
                              {fieldError.index?.fee_fine_frequency_in_days &&
                                fieldError.index.fee_fine_frequency_in_days !==
                                  "" && (
                                  <Tooltip
                                    title={
                                      fieldError[index][
                                        "fee_fine_frequency_in_days"
                                      ]
                                    }
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <ErrorIcon className="fee-term-error-icon cursor-pointer " />
                                  </Tooltip>
                                )}
                            </Box>
                          </TableCell>
                        )}
                        {isFineExpanded && (
                          <TableCell>
                            <Box className="feeterm-text-size position-relative">
                              {disabled ? (
                                <Box>
                                  {numberWithCommas(term.fee_fine_rate)}
                                </Box>
                              ) : (
                                <AddInputField
                                  name={"fee_fine_rate"}
                                  fieldValue={term.fee_fine_rate}
                                  fieldError={""}
                                  fieldProps={this.fieldProps}
                                  showAddButton={false}
                                  showDeleteButton={false}
                                  onBlurFieldValue={this.onBlurFieldValue}
                                  onChangeFieldValue={this.onChangeFieldValue}
                                  onClickActionButton={this.onClickActionButton}
                                  index={index}
                                  disabled={disabled}
                                  max={selectedFeePlan.fee_fine_rate}
                                  error={fieldError[index]["fee_fine_rate"]}
                                />
                              )}
                              {fieldError.index?.fee_fine_rate &&
                                fieldError.index.fee_fine_rate !== "" && (
                                  <Tooltip
                                    title={fieldError[index]["fee_fine_rate"]}
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <ErrorIcon className="fee-term-error-icon cursor-pointer " />
                                  </Tooltip>
                                )}
                            </Box>
                          </TableCell>
                        )}
                        {isFineExpanded && (
                          <TableCell>
                            <Box className="feeterm-text-size position-relative">
                              {disabled ? (
                                <Box>
                                  {numberWithCommas(term.max_fee_fine_rate)}
                                </Box>
                              ) : (
                                <AddInputField
                                  name={"max_fee_fine_rate"}
                                  fieldValue={term.max_fee_fine_rate}
                                  fieldProps={this.fieldProps}
                                  showAddButton={false}
                                  showDeleteButton={false}
                                  onBlurFieldValue={this.onBlurFieldValue}
                                  onChangeFieldValue={this.onChangeFieldValue}
                                  onClickActionButton={this.onClickActionButton}
                                  index={index}
                                  disabled={disabled}
                                  error={fieldError[index]["max_fee_fine_rate"]}
                                />
                              )}
                              {fieldError.index?.max_fee_fine_rate &&
                                fieldError.index.max_fee_fine_rate !== "" && (
                                  <Tooltip
                                    title={
                                      fieldError[index]["max_fee_fine_rate"]
                                    }
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <ErrorIcon className="fee-term-error-icon cursor-pointer" />
                                  </Tooltip>
                                )}
                            </Box>
                          </TableCell>
                        )}
                        {isEnabledSequence && (
                          <TableCell className="cursor-pointer feeterm-text-size">
                            {disabled ? (
                              <Box>{numberWithCommas(term.sequence)}</Box>
                            ) : (
                              <AddInputField
                                name={"sequence"}
                                fieldValue={term?.sequence ?? null}
                                fieldError={""}
                                fieldProps={this.fieldProps}
                                showAddButton={false}
                                showDeleteButton={false}
                                onBlurFieldValue={this.onBlurFieldValue}
                                onChangeFieldValue={this.onChangeFieldValue}
                                onClickActionButton={this.onClickActionButton}
                                index={index}
                                disabled={disabled}
                                max={selectedFeePlan.sequence}
                              />
                            )}
                          </TableCell>
                        )}
                        {!isFineExpanded && (
                          <TableCell
                            className="cursor-pointer feeterm-text-size"
                            onClick={this.handleIsFineExpand}
                          >
                            <ArrowRightIcon />
                          </TableCell>
                        )}
                        {isFineExpanded && (
                          <TableCell
                            className="cursor-pointer feeterm-text-size"
                            onClick={this.handleIsFineExpand}
                          >
                            <ArrowLeftIcon />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                {showAddButton && (
                  <TableRow>
                    <TableCell
                      colSpan={1}
                      style={{ borderBottom: "0px", padding: "0px" }}
                    >
                      <div className="display-flex">
                        <Button
                          color="primary"
                          size="small"
                          className="margin-top-10"
                          onClick={() =>
                            this.onClickActionButton("add", rowIndex)
                          }
                        >
                          <FormattedMessage {...messages.addAnotherTerm} />
                        </Button>
                        <Button
                          color="primary"
                          size="small"
                          className="margin-top-10"
                          onClick={() =>
                            this.onClickDivideButton(selectedFeePlan)
                          }
                        >
                          Divide it into equal terms
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell colSpan={3}>
                      {disabled && permissions.includes("create") && (
                        <Box p={2} className="red-text">
                          Note: Since Fee Plan is already Approved, you cannot
                          modify fee structure.
                        </Box>
                      )}
                      {!disabled &&
                        differenceAmount !== 0 &&
                        selectedFeePlan.codename !== TRANSPORT_CODE && (
                          <Box className="red-text">
                            Difference{" "}
                            {selectedFeePlan.codename !== TRANSPORT_CODE
                              ? "Amount"
                              : "Percent"}
                            : {differenceAmount}
                          </Box>
                        )}
                      {!disabled &&
                        differenceAmountError &&
                        selectedFeePlan.codename === TRANSPORT_CODE && (
                          <Box className="red-text">
                            {differenceAmountError}
                          </Box>
                        )}
                    </TableCell>
                  </TableRow>
                )}
                {/* {!disabled && <Box className='end-flex-prop'><Button className="submit fee-ter-submit-button" variant="contained" onClick={() => this.submit()} >Submit</Button></Box>} */}
              </TableBody>
            </Table>
          </TableCell>
        </TableRow>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar.show}
          autoHideDuration={10000}
          onClose={this.handleCloseSnackbar}
        >
          <Alert onClose={this.handleCloseSnackbar} severity="error">
            {snackbar.data}
          </Alert>
        </Snackbar>
        {isDivideTermsDialogOpen && (
          <DivideTermsDialog
            handleCloseDivideTerms={this.handleCloseDivideTerms}
            handleSubmitNumOfTerms={this.handleSubmitNumOfTerms}
          />
        )}
      </>
    );
  }
}

FeeTermPlan.propTypes = {
  menuItems: PropTypes.array,
};

FeeTermPlan.defaultProps = {
  menuItems: [],
};
export default FeeTermPlan;
