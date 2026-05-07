import React from "react";
import { Box, Snackbar } from "@material-ui/core";
import PropTypes from "prop-types";
import moment from "moment";
import { FormattedMessage } from "react-intl";
import commonMessage from "Constants/messages";
import DivideTermsDialog from "./DivideTermsDialog";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

import { Alert, numberWithCommas } from "Includes/functions";
import { validateAmount } from "Includes/validations";
import { TRANSPORT_CODE, APPROVAL_STATUS } from "Constants";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import "./../styles.scss";

class FeeAdditionalPlanDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldError: {},
      selectedFeePlan: {},
      totalAmountError: "",
      snackbar: { show: false, data: "" },
      permissions: [],
      isFineExpanded: false,
      isEnabledSequence: !isFormDefinitionEnabled(
        "fee_configurations",
        "hide_fee_term_sequence",
        1
      ),
      beneficiary_data: this.props?.beneficiary_data ?? [],
      deletable_ids: [],
      numberList: [],
    };
    this.columns = [
      {
        label: <FormattedMessage {...commonMessage.term} />,
      },
      {
        label: "Additional Charge Plan",
      },
    ];
  }
  componentDidMount = () => {
    this.setState({ selectedFeePlan: this.props.selectedFeePlan });
  };
  onBlurFieldValue = (e, index) => {
    let { selectedFeePlan, fieldError, deletable_ids } = this.state;
    let { value, name } = e.target;
    let test = validateAmount(value, false, 0, null);
    if (value === "") {
      selectedFeePlan.standard_fee[index][name] = "";
      fieldError[index][name] = "";
    } else if (test.errorFound) {
      fieldError[index][name] = test.errorText;
    } else {
      if (!Number.isNaN(parseInt(value)) && parseInt(value) !== 0) {
        value = parseInt(value);
      }
      selectedFeePlan.standard_fee[index][name] = value;

      fieldError[index][name] = "";
    }
    this.setState({ selectedFeePlan, fieldError }, () => {
      this.props.updateFeeData(selectedFeePlan, deletable_ids);
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

  handleCloseSnackbar = () => {
    const snackbar = { show: false, data: "" };
    this.setState({ snackbar });
  };

  handleIsFineExpand = () => {
    this.setState({
      isFineExpanded: !this.state.isFineExpanded,
    });
  };

  onChange = (e, index, accIndex) => {
    let { value, name } = e.target;
    let { selectedFeePlan, fieldError, deletable_ids } = this.state;
    delete fieldError[`${index}_${accIndex}_${name}`];
    selectedFeePlan.standard_fee[index]["beneficiary_split"][accIndex][name] =
      value;
    this.setState({ selectedFeePlan, fieldError }, () => {
      this.props.updateFeeData(selectedFeePlan, deletable_ids);
      this.onBlurValidation();
    });
  };

  onChangeDivided = (e, index) => {
    let { value, name } = e.target;
    let { selectedFeePlan, deletable_ids } = this.state;
    let temp_plan = { ...selectedFeePlan };
    temp_plan.standard_fee[index][name] = value;
    let totalAmount = temp_plan.standard_fee[index]["is_amount"]
      ? temp_plan.standard_fee[index]["rate"]
      : 100;
    temp_plan.standard_fee[index]["beneficiary_split"] = [];
    for (let i = 0; i < value; i++) {
      temp_plan.standard_fee[index]["beneficiary_split"].push({
        priority: i + 1,
        beneficiary_id: "",
        rate: Math.floor(totalAmount / value),
      });
    }

    this.setState({ selectedFeePlan: { ...temp_plan }, deletable_ids }, () => {
      this.props.updateFeeData(temp_plan, deletable_ids);
      this.onBlurValidation();
    });
  };

  onChangeIsAmount = (e, index) => {
    let { selectedFeePlan, deletable_ids } = this.state;
    selectedFeePlan.standard_fee[index]["is_amount"] =
      !selectedFeePlan.standard_fee[index]["is_amount"];
    this.setState({ selectedFeePlan }, () => {
      this.props.updateFeeData(selectedFeePlan, deletable_ids);
      this.onBlurValidation();
    });
  };

  onBlurValidation = () => {
    let { selectedFeePlan, deletable_ids } = this.state;
    let fieldError = {};
    let termTotal = 0;
    let beneficiary_list = [];
    selectedFeePlan.standard_fee.map((term, index) => {
      termTotal = 0;
      term.reason = "";
      beneficiary_list = [];
      term.beneficiary_split.map((account, accIndex) => {
        termTotal += parseFloat(account.rate);
        if (!account.beneficiary_id) {
          fieldError[`${index}_${accIndex}_beneficiary_id`] = (
            <FormattedMessage {...commonMessage.fieldMandatoryError} />
          );
        } else if (beneficiary_list.includes(account.beneficiary_id)) {
          fieldError[`${index}_${accIndex}_beneficiary_id`] = (
            <FormattedMessage {...commonMessage.duplicateFoundLabel} />
          );
        }
        beneficiary_list.push(account["beneficiary_id"]);
      });
      if (term.is_amount && termTotal !== parseFloat(term.rate)) {
        term.reason = `Difference amount ${term.rate - termTotal}`;
      } else if (!term.is_amount && termTotal != 100) {
        term.reason = `Difference percentage ${100 - termTotal}`;
      }
      if (!("is_primary_adjustment" in term)) {
        term.reason = `Select any radio primary adjustment`;
      }
    });
    this.setState({ selectedFeePlan, fieldError }, () => {
      this.props.updateFeeData(selectedFeePlan, deletable_ids);
    });
  };

  handlePrimaryAdjustment = (index, strIndex) => {
    let { selectedFeePlan } = this.state;
    selectedFeePlan.standard_fee[index]["is_primary_adjustment"] = strIndex;
    delete selectedFeePlan.standard_fee[index]["reason"];
    this.setState({ selectedFeePlan });
  };

  handleSearchChange = (e, index) => {
    let { selectedFeePlan } = this.state;
    selectedFeePlan.standard_fee[index]["additionalcharges"] = e;
    this.setState({ selectedFeePlan }, () => {
      this.props.updateFeeData(selectedFeePlan);
    });
  };

  render() {
    const {
      fieldError,
      selectedFeePlan,
      snackbar,
      permissions,
      isFineExpanded,
      isDivideTermsDialogOpen,
      isEnabledSequence,
    } = this.state;
    const disabled =
      selectedFeePlan.is_approved === APPROVAL_STATUS.approved ||
      !permissions.includes("create")
        ? false
        : true;
    let showAddButton = false;
    const { feeTypeList } = this.props;
    if (!disabled) {
      showAddButton = true;
    }
    let rowIndex = 0;
    const headerAmountOrPercent =
      selectedFeePlan.codename === TRANSPORT_CODE ? "Percentage" : "Amount (₹)";
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
                </TableRow>
              </TableHead>
              <TableBody>
                <>
                  {selectedFeePlan.standard_fee &&
                    selectedFeePlan.standard_fee.map((term, index) => {
                      rowIndex = index;
                      return (
                        <>
                          <TableRow key={index}>
                            <TableCell>
                              <Box className="">{`${
                                term?.term_alias ?? term.terms
                              } - ${numberWithCommas(term.rate)}`}</Box>
                            </TableCell>
                            <TableCell>
                              <Box className="width-300px">
                                <MultipleSelectDropdown
                                  data_list={feeTypeList}
                                  selected_list={term["additionalcharges"]}
                                  error={
                                    fieldError[`${index}_additionalcharges`] &&
                                    fieldError[`${index}_additionalcharges`]
                                  }
                                  // label={field.selectLabel}
                                  onChange={(e) =>
                                    this.handleSearchChange(e, index)
                                  }
                                  className={"width-300px"}
                                  size="small"
                                />
                              </Box>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                </>
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
        {isDivideTermsDialogOpen && <DivideTermsDialog />}
      </>
    );
  }
}

FeeAdditionalPlanDetail.propTypes = {
  menuItems: PropTypes.array,
};

FeeAdditionalPlanDetail.defaultProps = {
  menuItems: [],
};
export default FeeAdditionalPlanDetail;
