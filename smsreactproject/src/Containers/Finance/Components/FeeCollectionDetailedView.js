/* eslint-disable react/jsx-key */
import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { Box, Grid, Divider, Tooltip, Button } from "@material-ui/core";
import Checkbox from "@material-ui/core/Checkbox";
import TextField from "@material-ui/core/TextField";
import NumberFormat from "react-number-format";
import _ from "lodash";
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import WarningIcon from "@material-ui/icons/Warning";
import {
  numberWithCommas,
  numberWithCommasWithoutSymbol,
  isUserHasPermission,
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import InfoIcon from "@material-ui/icons/Info";
import PaymentIcon from "@material-ui/icons/Payment";
import { FormattedMessage } from "react-intl";
import messages from "./../messages";
import commonMessages from "Constants/messages";
import { Dropdown } from "Components/DropDown";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import FeeCollectionDetailedTermView from "Containers/Finance/Components/FeeCollectionDetailedTermView";
import FeeCollectionDetailedTermViewNew from "Containers/Finance/Components/FeeCollectionDetailedTermViewNew";
import FeeCollectionDetailedGroup from "Containers/Finance/Components/FeeCollectionDetailedGroup";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import FeeAdjustmentList from "./FeeAdjustmentList";
import FeeStoreList from "./FeeStoreList";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import FeeCollectionDetailedTypeView from "Containers/Finance/Components/FeeCollectionDetailedTypeView";

const useStyles = makeStyles({
  expanded: {
    "&$expanded": {
      margin: "0px 0",
      height: "0px",
      backgroundColor: "#f8f8ff",
      borderBottom: "1px solid rgba(0,0,0,.125)",
    },
    minHeight: "60px",
  },
  root: {
    boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.15)",
    marginBottom: "20px",
  },
});

function NumberFormatCustom(props) {
  const { inputRef, onChange, ...other } = props;
  return (
    <NumberFormat
      {...other}
      thousandsGroupStyle="lakh"
      thousandSeparator={true}
      getInputRef={inputRef}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      isNumericString
      prefix="₹ "
    />
  );
}

export default function FeeCollectionStudentProfilefrom(props) {
  const classes = useStyles();
  const [feePlan, setFeePlan] = React.useState([]);
  const [adjustmentEnabled, setadjustmentEnabled] = React.useState(false);
  const [isAddPermission, setAddPermission] = React.useState(false);
  const [isFullPay, setIsFullPay] = React.useState(false);
  const [sequenceNeedToPay, setSequenceNeedToPay] = React.useState("");
  const [sequenceMap, setSequenceMap] = React.useState({});
  const [fee_group, set_fee_group] = React.useState(false);
  const [is_fee_group_enabled] = React.useState(
    isFormDefinitionEnabled("fee_configurations", "fee_type_view_web", 3)
  );
  const [is_term_wise_view] = React.useState(
    isFormDefinitionEnabled("fee_configurations", "fee_type_view_web", 2)
  );
  const [isEnabledSequence] = React.useState(
    !isFormDefinitionEnabled("fee_configurations", "hide_fee_term_sequence", 1)
  );
  const [updatedFeePlan, setUpdatedFeePlan] = React.useState([]);
  const [expanded, setExpanded] = React.useState({});
  const [feeSummary, setFeeSummary] = React.useState({});
  const [isAdjustmentDetail, setIsAdjustmentDetail] = React.useState(false);
  const [isCheckedForAdjustment, setIsCheckedForAdjustment] =
    React.useState(false);

  const [isStoreDetail, setIsStoreDetail] = React.useState(false);
  const [discountDetailFeePlan, setDiscountDetailFeePlan] = React.useState({});
  const updatePermissions = () => {
    const hasAddPermission = isUserHasPermission("fee_collection", "create");
    const hasViewPermission = isUserHasPermission("fee_collection", "view");
    if (!hasViewPermission) {
      props.history.push(Actions.fee_collection.view.url);
    }
    if (hasAddPermission) {
      setAddPermission(hasAddPermission);
    }
  };

  const updateTermAmount = (e, findex, index, is_amount_checked) => {
    let tempIsAmountChecked = !is_amount_checked;
    if (e === "group") {
      let tempFeePlan = _.cloneDeep(feePlan);
      let temp_fee_group_plan = _.cloneDeep(fee_group);
      temp_fee_group_plan[findex].is_checked = tempIsAmountChecked;
      tempFeePlan.map((data) => {
        if (data.fee_group == findex) {
          if ("standard_fee" in data) {
            data.standard_fee.map((feetermData) => {
              if (feetermData["pending_amount"] > 0) {
                feetermData.is_checked = tempIsAmountChecked;
                if (!tempIsAmountChecked) {
                  feetermData["amount_paid"] = feetermData["pending_amount"];
                }
              }
            });
          }
        }
      });
      setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
      set_fee_group(() => temp_fee_group_plan);
      props.updateToParent(tempFeePlan);
    } else if (e === "all") {
      let tempFeePlan = _.cloneDeep(feePlan);
      if ("standard_fee" in tempFeePlan[findex]) {
        tempFeePlan[findex].is_checked = tempIsAmountChecked;
        tempFeePlan[findex].standard_fee.map((feetermData) => {
          if (feetermData["pending_amount"] > 0)
            feetermData.is_checked = tempIsAmountChecked;
        });
      }
      setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
      props.updateToParent(tempFeePlan);
    } else if (e === "term_all") {
      // let tempFeePlan = _.cloneDeep(feePlan);
      if ("standard_fee" in feePlan[findex]) {
        feePlan[findex].is_checked = tempIsAmountChecked;
        feePlan[findex].standard_fee.map((feetermData) => {
          if (feetermData["pending_amount"] > 0)
            feetermData.is_checked = tempIsAmountChecked;
        });
      }
      setFeePlan(() => JSON.parse(JSON.stringify(feePlan)));
      setUpdatedFeePlan(() => JSON.parse(JSON.stringify(feePlan)));
      props.updateToParent(feePlan);
      if (isEnabledSequence) {
        let updateSequenceNumber = 1;
        feePlan[findex]["standard_fee"].map((data) => {
          updateSequenceNumber = data.sequence;
          data.is_checked = tempIsAmountChecked;
        });
        updateSequence(updateSequenceNumber);
      }
      // setToTermWiseDefault(props.feePlan, true);
    } else {
      // let tempFeePlan = _.cloneDeep(feePlan);
      if (!tempIsAmountChecked) {
        feePlan[findex]["standard_fee"][index]["amount_paid_error"] = "";
        feePlan[findex]["standard_fee"][index]["adjust_amount"] =
          feePlan[findex]["standard_fee"][index]["adjustment_amount"];
        feePlan[findex]["standard_fee"][index]["adjust_amount_error"] = "";
        feePlan[findex]["standard_fee"][index]["amount_paid"] =
          feePlan[findex]["standard_fee"][index]["pending_amount"];
        feePlan[findex]["standard_fee"][index]["concessionAmount"] = 0;
      }
      feePlan[findex]["standard_fee"][index]["is_checked"] =
        tempIsAmountChecked;
      if ("standard_fee" in feePlan[findex]) {
        feePlan[findex].is_checked = false;
        feePlan[findex].standard_fee.map((feetermData) => {
          if (feetermData["pending_amount"] > 0 && feetermData.is_checked) {
            feePlan[findex].is_checked = true;
          }
        });
      }
      setFeePlan(() => JSON.parse(JSON.stringify(feePlan)));
      setUpdatedFeePlan(() => JSON.parse(JSON.stringify(feePlan)));
      props.updateToParent(feePlan);
      if (isEnabledSequence) {
        updateSequence(feePlan[findex]["standard_fee"][index]["sequence"]);
      }
      if (is_fee_group_enabled) {
        let is_all_checked = true;
        feePlan.map((data) => {
          if (data.fee_group == props.selectedGroup["fee_group"]) {
            if ("standard_fee" in data) {
              data.standard_fee.map((feetermData) => {
                if (
                  feetermData["pending_amount"] > 0 &&
                  !feetermData.is_checked
                ) {
                  is_all_checked = false;
                }
              });
            }
          }
        });
        let temp_fee_group_plan = _.cloneDeep(fee_group);
        temp_fee_group_plan[props.selectedGroup["fee_group"]].is_checked =
          is_all_checked;
        set_fee_group(() => temp_fee_group_plan);
      }
    }
  };

  const handleConcessionApply = () => {
    let feeSummary = props.feeDetailedSummary;
    if (feeSummary.total_paid_amount != 0) {
      return true;
    }
    let isAllSelected = true;
    let totalAmountpaid = 0;
    let totalConcession = 0;
    let tempFeePlan = _.cloneDeep(feePlan);
    tempFeePlan.map((data) => {
      if ("standard_fee" in data) {
        data.standard_fee.map((feetermData, index) => {
          feetermData.concessionAmount = 0;
          if (!feetermData.is_checked) {
            isAllSelected = false;
          } else {
            totalAmountpaid += parseFloat(feetermData["amount_paid"]);
            if (
              feetermData?.automatic_concession_data
                ?.concession_fee_plan_mapping?.concession_amount
            ) {
              feetermData.concessionAmount =
                feetermData?.automatic_concession_data?.concession_fee_plan_mapping?.concession_amount;
              totalConcession +=
                feetermData?.automatic_concession_data
                  ?.concession_fee_plan_mapping?.concession_amount;
            }
          }
        });
      }
    });
    if (
      totalAmountpaid === feeSummary.total_pending_amount &&
      isAllSelected &&
      totalConcession
    ) {
      props.updateConcessionToParent(true, totalConcession);
      setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
      props.updateToParent(tempFeePlan);
    } else {
      props.updateConcessionToParent(false);
      // setFeePlan(() => JSON.parse(JSON.stringify(feePlan)));
      // props.updateToParent(feePlan);
    }
  };

  const updateSequence = (updatingSequence) => {
    let tempFeePlan = _.cloneDeep(feePlan);
    let sequenceNeedToPay = [];
    tempFeePlan.map((data) => {
      if ("standard_fee" in data) {
        data.standard_fee.map((feetermData, index) => {
          if (!feetermData["is_disabled"]) {
            if (
              !feetermData.is_checked &&
              feetermData.sequence &&
              parseInt(feetermData.pending_amount) > 0 &&
              !sequenceNeedToPay.includes(feetermData.sequence)
            ) {
              sequenceNeedToPay.push(feetermData.sequence);
              feetermData.sequence_text = "Please Pay Fee";
            }
            if (parseInt(updatingSequence) < parseInt(feetermData.sequence)) {
              feetermData.is_checked = false;
            }
          }
        });
      }
    });
    setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
    props.updateToParent(tempFeePlan);
    setSequenceNeedToPay(() => Math.min(...sequenceNeedToPay));
  };

  const updateValue = (e, findex, index) => {
    let tempFeePlan = _.cloneDeep(feePlan);
    if (tempFeePlan[findex]["standard_fee"][index]["is_checked"]) {
      if (e.target.value >= 0 || e.target.value == "") {
        if (
          !(
            !e.target.value ||
            tempFeePlan[findex]["standard_fee"][index]["pending_amount"] >=
              parseFloat(e.target.value)
          )
        ) {
          tempFeePlan[findex]["standard_fee"][index]["amount_paid_error"] =
            "Amount is greater than the pending Amount";
        } else if (!e.target.value || e.target.value === "0") {
          tempFeePlan[findex]["standard_fee"][index]["amount_paid_error"] =
            "Amount Should be greater than 0";
        } else {
          tempFeePlan[findex]["standard_fee"][index]["amount_paid_error"] = "";
        }
        tempFeePlan[findex]["standard_fee"][index]["concessionAmount"] = 0;
        tempFeePlan[findex]["standard_fee"][index]["amount_paid"] =
          e.target.value;
        setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
        setUpdatedFeePlan(() => JSON.parse(JSON.stringify(feePlan)));
        props.updateToParent(tempFeePlan);
      }
    }
  };

  useEffect(() => {
    handleConcessionApply();
  }, [updatedFeePlan]);

  const updateAdjustmentValue = (e, findex, index) => {
    const { name, value } = e.target;
    let tempFeePlan = _.cloneDeep(feePlan);
    if (
      feePlan[findex]["standard_fee"][index]["is_checked"] &&
      (value >= 0 || value == "")
    ) {
      if (
        !(
          !value ||
          getExistingPendingAmount(
            tempFeePlan[findex]["standard_fee"][index]
          ) >= parseFloat(value)
        ) &&
        tempFeePlan[findex]["standard_fee"][index]["type"] === "decrement"
      ) {
        tempFeePlan[findex]["standard_fee"][index]["adjust_amount_error"] =
          "Amount is greater than the pending Amount";
      } else if (
        !value &&
        tempFeePlan[findex]["standard_fee"][index]["type"] === "decrement"
      ) {
        tempFeePlan[findex]["standard_fee"][index]["adjust_amount_error"] =
          "Amount Should be greater than 0";
      } else {
        tempFeePlan[findex]["standard_fee"][index]["adjust_amount_error"] = "";
      }
      tempFeePlan[findex]["standard_fee"][index][name] = value;
      setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
      props.updateToParent(tempFeePlan);
    }
  };

  const setToDefault = (feeplanData, isAmountUpdating) => {
    let feeSummary = props.feeDetailedSummary;
    let tempFeePlan = _.cloneDeep(feeplanData);
    let totalAmount = 0;
    let amountWithoutConcession = 0;
    let totalAmountWithConcession = 0;
    let amountwithConcession = 0;
    let sequenceNeedToPay = [];
    let expanded = {};
    let sequenceMap = {};

    tempFeePlan.map((data, findex) => {
      totalAmount = 0;
      data.is_checked = false;
      totalAmountWithConcession = 0;
      let total_paid_amount = 0;
      data.paid_amount = 0;
      data.concession_amount = 0;
      data.adjustment_amount = 0;
      if ("standard_fee" in data) {
        data.standard_fee.map((feetermData, index) => {
          data.adjustment_amount += feetermData.adjustment_amount;
          data.paid_amount += parseFloat(feetermData.paid_amount);
          data.concession_amount += feetermData.concession_amount;
          amountWithoutConcession = 0;
          feetermData.is_checked = false;
          if (isAmountUpdating) {
            total_paid_amount += feetermData.amount_paid;
            feetermData.is_checked = feetermData.amount_paid > 0 ? true : false;
          }
          if (!feetermData["is_disabled"]) {
            amountWithoutConcession = feetermData.is_amount
              ? parseFloat(feetermData.rate)
              : parseFloat(feetermData.rate_amount);
            amountwithConcession =
              amountWithoutConcession - feetermData["concession_amount"];
            feetermData.adjust_amount = feetermData.adjustment_amount;
            feetermData.type = feetermData.is_addition
              ? "increment"
              : "decrement";
            feetermData.pending_without_adjustment = parseFloat(
              feetermData.pending_amount
            );
            // feetermData.pending_without_adjustment = feetermData.is_addition ? parseFloat(feetermData.pending_amount) - feetermData.adjustment_amount : parseFloat(feetermData.pending_amount) + feetermData.adjustment_amount
            feetermData.payable_without_adjustment = feetermData.is_addition
              ? parseFloat(feetermData.amount) - feetermData.adjustment_amount
              : parseFloat(feetermData.amount) + feetermData.adjustment_amount;
            if (
              !feetermData.is_checked &&
              feetermData.sequence &&
              parseInt(feetermData.pending_amount) > 0 &&
              !sequenceNeedToPay.includes(feetermData.sequence)
            ) {
              sequenceNeedToPay.push(feetermData.sequence);
              sequenceMap[feetermData.sequence] = {
                fee_type: findex,
                term: index,
              };
            }
          }
          totalAmount += amountWithoutConcession;
          totalAmountWithConcession += amountwithConcession;
        });
      }
      expanded[findex] =
        feeSummary.total_pending_amount === 0 || data.pending_amount > 0
          ? true
          : false;
      data["total_amount_local"] = totalAmount;
      data["total_amount_local_after_concession"] = totalAmountWithConcession;
      if (isAmountUpdating) {
        data["is_checked"] = total_paid_amount > 0;
      }
    });
    sequenceNeedToPay = sequenceNeedToPay.sort();
    sequenceNeedToPay.map((data, index) => {
      if (index) {
        sequenceMap[data]["depends"] = sequenceNeedToPay[index - 1];
      }
    });
    setSequenceMap(() => sequenceMap);
    setSequenceNeedToPay(() => Math.min(...sequenceNeedToPay));
    setFeePlan(tempFeePlan);
    setExpanded(() => expanded);
  };

  const setToGroupDefault = (feeplanData) => {
    let feeSummary = props.feeDetailedSummary;
    let tempFeePlan = _.cloneDeep(feeplanData.feePlan);
    let totalAmount = 0;
    let amountWithoutConcession = 0;
    let totalAmountWithConcession = 0;
    let amountwithConcession = 0;
    let paid_amount = 0;
    let sequenceNeedToPay = [];
    let expanded = {};
    let sequenceMap = {};
    let fee_group = props.fee_group_plan;
    tempFeePlan.map((data, findex) => {
      totalAmount = 0;
      paid_amount = 0;
      totalAmountWithConcession = 0;
      if ("standard_fee" in data) {
        data.standard_fee.map((feetermData, index) => {
          amountWithoutConcession = 0;
          feetermData.is_checked = false;
          if (!feetermData["is_disabled"]) {
            if (
              !props.adjustmentEnabled &&
              props.selectedGroup["fee_group"] === data.fee_group &&
              feetermData.pending_amount > 0
            ) {
              feetermData.is_checked = true;
              feetermData.amount_paid = feetermData.pending_amount;
            }
            amountWithoutConcession = feetermData.is_amount
              ? parseFloat(feetermData.rate)
              : parseFloat(feetermData.rate_amount);
            amountwithConcession =
              amountWithoutConcession - feetermData["concession_amount"];
            feetermData.adjust_amount = feetermData.adjustment_amount;
            feetermData.type = feetermData.is_addition
              ? "increment"
              : "decrement";
            feetermData.pending_without_adjustment = parseFloat(
              feetermData.pending_amount
            );
            feetermData.payable_without_adjustment = feetermData.is_addition
              ? parseFloat(feetermData.amount) - feetermData.adjustment_amount
              : parseFloat(feetermData.amount) + feetermData.adjustment_amount;
            if (
              feetermData.sequence &&
              parseInt(feetermData.pending_amount) > 0 &&
              !sequenceNeedToPay.includes(feetermData.sequence)
            ) {
              sequenceNeedToPay.push(feetermData.sequence);
              sequenceMap[feetermData.sequence] = {
                fee_type: findex,
                term: index,
              };
            }
          }
          totalAmount += amountWithoutConcession;
          totalAmountWithConcession += amountwithConcession;
          paid_amount += feetermData.paid_amount;
        });
      }
      data["total_amount_local"] = totalAmount;
      data["paid_amount"] = paid_amount;
      data["total_amount_local_after_concession"] = totalAmountWithConcession;
      if (props.adjustmentEnabled) {
        expanded[findex] = true;
      }
    });
    let group_total = 0;
    let group_pending = 0;
    let group_paid = 0;
    Object.keys(fee_group).map((group) => {
      group_total = 0;
      group_pending = 0;
      group_paid = 0;
      tempFeePlan.map((plan) => {
        if (group == plan.fee_group) {
          group_total += plan.total_amount;
          group_pending += plan.pending_amount;
          group_paid += plan?.paid_amount > 0 ? plan?.paid_amount : 0;
        }
      });
      fee_group[group].group_total = group_total;
      fee_group[group].group_pending = group_pending;
      fee_group[group].group_paid = group_paid;
      if (
        parseInt(props.selectedGroup["fee_group"]) === parseInt(group) &&
        !adjustmentEnabled
      ) {
        fee_group[group].is_checked = true;
      } else {
        fee_group[group].is_checked = false;
      }
      if (!props.adjustmentEnabled) {
        expanded[group] = true;
      }
    });
    sequenceNeedToPay = sequenceNeedToPay.sort();
    sequenceNeedToPay.map((data, index) => {
      if (index) {
        sequenceMap[data]["depends"] = sequenceNeedToPay[index - 1];
      }
    });
    set_fee_group(() => fee_group);
    props.updateToParent(tempFeePlan);
    props.updateParentGroupPlan(fee_group);
    setSequenceMap(() => sequenceMap);
    setSequenceNeedToPay(() => Math.min(...sequenceNeedToPay));
    setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
    setExpanded(() => expanded);
  };

  const setToTermWiseDefault = (feeplanData, isAmountUpdating) => {
    let feeSummary = props.feeDetailedSummary;
    let tempFeePlan = _.cloneDeep(feeplanData);
    let feeTerms = {};
    let totalAmount = 0;
    let amountWithoutConcession = 0;
    let totalAmountWithConcession = 0;
    let amountwithConcession = 0;
    let total_payable_amount = 0;
    let pending_amount = 0;
    let sequenceNeedToPay = [];
    let sequenceNeedToPayTemp = [];
    let sequenceMap = {};
    let expanded = {};
    let sequenceText = "";
    tempFeePlan.map((data, findex) => {
      data.is_checked = false;
      if ("standard_fee" in data) {
        data.standard_fee.map((feetermData, index) => {
          feetermData["fee_type_name"] = data["fee_type_name"];
          feetermData["codename"] = data["codename"];
          if (
            data["fee_standard_mapping_item_selling_price_fee_standard_mapping"]
          ) {
            feetermData["store_list"] =
              data[
                "fee_standard_mapping_item_selling_price_fee_standard_mapping"
              ];
          }
          if (!feeTerms[feetermData.terms]) {
            feeTerms[feetermData.terms] = {
              name: feetermData?.term_alias ?? feetermData.terms,
              standard_fee: [],
            };
          }
          if (data["reason"]) {
            feetermData["reason"] = data["reason"];
          }
          feeTerms[feetermData.terms]["standard_fee"].push(feetermData);
        });
      }
    });
    let tempTermWiseList = [];
    Object.keys(feeTerms).map((data) => {
      tempTermWiseList.push(feeTerms[data]);
    });
    tempTermWiseList.map((data, findex) => {
      totalAmount = 0;
      totalAmountWithConcession = 0;
      pending_amount = 0;
      data.is_checked = false;
      data.adjustment_amount = 0;
      data.concession_amount = 0;
      data.paid_amount = 0;
      total_payable_amount = 0;
      let total_paid_amount = 0;
      if ("standard_fee" in data) {
        data.standard_fee.map((feetermData, index) => {
          data.adjustment_amount += feetermData.adjustment_amount;
          data.paid_amount += feetermData.paid_amount;
          data.concession_amount += feetermData.concession_amount;
          amountWithoutConcession = 0;
          feetermData.is_checked = false;
          if (isAmountUpdating) {
            total_paid_amount += feetermData.amount_paid;
            feetermData.is_checked = feetermData.amount_paid > 0 ? true : false;
          }
          if (!feetermData["is_disabled"]) {
            amountWithoutConcession = feetermData.is_amount
              ? parseFloat(feetermData.rate)
              : parseFloat(feetermData.rate_amount);
            amountwithConcession =
              amountWithoutConcession - feetermData["concession_amount"];
            feetermData.adjust_amount = feetermData.adjustment_amount;
            feetermData.type = feetermData.is_addition
              ? "increment"
              : "decrement";
            feetermData.pending_without_adjustment = parseFloat(
              feetermData.pending_amount
            );
            feetermData.adjust_amount_new = 0;
            feetermData.payable_without_adjustment = feetermData.amount;
            sequenceText = `Please Pay First ${feetermData.fee_type_name} - ( ${feetermData.terms} )`;
            if (
              !feetermData.is_checked &&
              feetermData.sequence &&
              parseInt(feetermData.pending_amount) > 0 &&
              !sequenceNeedToPay.includes(feetermData.sequence)
            ) {
              sequenceNeedToPay.push(feetermData.sequence);
              sequenceMap[feetermData.sequence] = {
                fee_type: findex,
                term: index,
              };
            }
          }
          totalAmount += amountWithoutConcession;
          totalAmountWithConcession += amountwithConcession;
          total_payable_amount += feetermData.payable_without_adjustment;
          pending_amount += feetermData?.pending_amount ?? 0;
        });
      }
      expanded[findex] =
        feeSummary.total_pending_amount === 0 || pending_amount > 0
          ? true
          : false;
      data["total_amount_local"] = totalAmount;
      data["total_amount_local_after_concession"] = totalAmountWithConcession;
      data["total_payable_amount"] = total_payable_amount;
      data["pending_amount"] = pending_amount;
      if (isAmountUpdating) {
        data["is_checked"] = total_paid_amount > 0;
      }
    });
    sequenceNeedToPay = sequenceNeedToPay.sort();
    sequenceNeedToPay.map((data, index) => {
      if (index) {
        sequenceMap[data]["depends"] = sequenceNeedToPay[index - 1];
      }
    });
    setSequenceMap(() => sequenceMap);
    setSequenceNeedToPay(() => Math.min(...sequenceNeedToPay));
    setFeePlan(() => tempTermWiseList);
    setExpanded(() => expanded);
    props.updateTermFeePlanNew(tempTermWiseList);
  };

  const showPaidAmount = (feeSummary) => {
    return (
      <table>
        <tr>
          <td>Total Paid Amount</td>
          <td>
            {numberWithCommasWithoutSymbol(
              feeSummary.paid_amount - feeSummary.total_fine_paid_amount
            )}
          </td>
        </tr>
        {feeSummary.total_fine_paid_amount > 0 && (
          <tr>
            <td>Fine Paid Amount</td>
            <td>
              {numberWithCommasWithoutSymbol(feeSummary.total_fine_paid_amount)}
            </td>
          </tr>
        )}
        <tr>
          <td>
            <hr />
            Term Paid Amount
          </td>
          <td>
            <hr />
            <div className="text-align-right">
              {numberWithCommasWithoutSymbol(feeSummary.paid_amount)}
            </div>
          </td>
        </tr>
      </table>
    );
  };

  const showCalculation = (feeSummary) => {
    return (
      <table>
        <tr>
          <td>
            <FormattedMessage {...commonMessages.totalAmount} />
          </td>
          <td>{numberWithCommasWithoutSymbol(feeSummary.total_amount)}</td>
        </tr>
        {feeSummary.total_fine_amount > 0 && (
          <tr>
            <td>Fine Amount</td>
            <td>
              {numberWithCommasWithoutSymbol(feeSummary.total_fine_amount)}
            </td>
          </tr>
        )}
        {feeSummary.concession_amount > 0 && (
          <tr>
            <td>
              <FormattedMessage {...messages.concessionAmount} />
            </td>
            <td>
              -{numberWithCommasWithoutSymbol(feeSummary.concession_amount)}
            </td>
          </tr>
        )}
        {feeSummary.adjustment_amount > 0 && (
          <tr>
            <td>
              <FormattedMessage {...messages.adjustedAmount} />
            </td>
            <td>
              {numberWithCommasWithoutSymbol(-feeSummary.adjustment_amount)}
            </td>
          </tr>
        )}
        <tr>
          <td>
            <hr />
            <FormattedMessage {...messages.termTotal} />
          </td>
          <td>
            <hr />
            <div className="text-align-right">
              {numberWithCommasWithoutSymbol(feeSummary.amount)}
            </div>
          </td>
        </tr>
      </table>
    );
  };

  const showFeeTypeCalculation = (feeSummary) => {
    return (
      <table>
        <tr>
          <td>
            <FormattedMessage {...commonMessages.totalAmount} />
          </td>
          <td>{numberWithCommasWithoutSymbol(feeSummary.total_amount)}</td>
        </tr>
        {feeSummary.concession_amount > 0 && (
          <tr>
            <td>
              <FormattedMessage {...messages.concessionAmount} />
            </td>
            <td>
              -{numberWithCommasWithoutSymbol(feeSummary.concession_amount)}
            </td>
          </tr>
        )}
        {feeSummary.adjustment_amount > 0 && (
          <tr>
            <td>
              <FormattedMessage {...messages.adjustedAmount} />
            </td>
            <td>
              -{numberWithCommasWithoutSymbol(feeSummary.adjustment_amount)}
            </td>
          </tr>
        )}
        <tr>
          <td>
            <hr />
            <FormattedMessage {...messages.termTotal} />
          </td>
          <td>
            <hr />
            <div className="text-align-right">
              {numberWithCommasWithoutSymbol(feeSummary.total_payable_amount)}
            </div>
          </td>
        </tr>
      </table>
    );
  };

  const getLabel = (feeSummary) => {
    let returnData = [];
    if (feeSummary.concession_amount) {
      returnData.push("Concession");
    }
    if (feeSummary.adjustment_amount) {
      returnData.push("Adjusted");
    }
    return returnData.join("/ ");
  };

  const getPendingAmount = (feetermData) => {
    if (feetermData.type === "increment") {
      return (
        parseFloat(feetermData.pending_without_adjustment) +
        parseFloat(feetermData.adjust_amount_new)
      );
    }
    return (
      parseFloat(feetermData.pending_without_adjustment) -
      parseFloat(feetermData.adjust_amount_new)
    );
  };

  const getExistingPendingAmount = (feetermData) => {
    return parseFloat(feetermData.pending_without_adjustment);
  };

  const changeToggle = (findex, index, newValue) => {
    let tempFeePlan = _.cloneDeep(feePlan);
    let type = newValue;
    tempFeePlan[findex]["standard_fee"][index]["type"] = type;
    let value = tempFeePlan[findex]["standard_fee"][index]["adjust_amount_new"];
    if (
      feePlan[findex]["standard_fee"][index]["is_checked"] &&
      (value >= 0 || value == "")
    ) {
      if (
        !(
          !value ||
          getExistingPendingAmount(
            tempFeePlan[findex]["standard_fee"][index]
          ) >= parseFloat(value)
        ) &&
        tempFeePlan[findex]["standard_fee"][index]["type"] === "decrement"
      ) {
        tempFeePlan[findex]["standard_fee"][index]["adjust_amount_error"] =
          "Amount is greater than the pending Amount";
      } else if (
        !value &&
        tempFeePlan[findex]["standard_fee"][index]["type"] === "decrement"
      ) {
        tempFeePlan[findex]["standard_fee"][index]["adjust_amount_error"] =
          "Amount Should be greater than 0";
      } else {
        tempFeePlan[findex]["standard_fee"][index]["adjust_amount_error"] = "";
      }
      tempFeePlan[findex]["standard_fee"][index]["adjust_amount_new"] = value;
    }
    if (type === "increment") {
      tempFeePlan[findex]["standard_fee"][index]["is_addition"] = true;
    } else {
      tempFeePlan[findex]["standard_fee"][index]["is_addition"] = false;
    }
    setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
    props.updateToParent(tempFeePlan);
  };

  const getAdjustmentPendingAmount = (index) => {
    let returnValue = 0;
    let tempFeePlan = _.cloneDeep(feePlan);
    tempFeePlan[index]["standard_fee"].map((data) => {
      if (data.type === "increment") {
        returnValue =
          parseFloat(data.pending_without_adjustment) +
          parseFloat(data.adjust_amount_new);
      } else {
        returnValue =
          parseFloat(data.pending_without_adjustment) -
          parseFloat(data.adjust_amount_new);
      }
    });
    return returnValue;
  };

  const getAdjustmentTotalAmount = (index) => {
    let returnValue = 0;
    let tempFeePlan = _.cloneDeep(feePlan);
    tempFeePlan[index]["standard_fee"].map((data) => {
      if (data.type === "increment") {
        returnValue =
          parseFloat(data.payable_without_adjustment) +
          parseFloat(data.adjust_amount_new);
      } else {
        returnValue =
          parseFloat(data.payable_without_adjustment) -
          parseFloat(data.adjust_amount_new);
      }
    });
    return returnValue;
  };

  React.useEffect(() => {
    setadjustmentEnabled(() => props.adjustmentEnabled);
    setFeeSummary(() => props.feeDetailedSummary);
    if (is_fee_group_enabled) {
      setToGroupDefault(props);
    } else if (is_term_wise_view) {
      setToTermWiseDefault(props.feePlan);
    } else {
      setToDefault(props.feePlan);
    }
    updatePermissions();
  }, [props.adjustmentEnabled, props.selectedGroup, props.fee_group_plan]);

  React.useEffect(() => {
    if (is_term_wise_view && props.updateFeePlan === true) {
      setToTermWiseDefault(props.feePlan, true);
    } else if (!is_term_wise_view && props.updateFeePlan === true) {
      setToDefault(props.feePlan, true);
    }
  }, [props.updateFeePlan]);

  const handleExpand = (index) => {
    let temp_expanded = { ...expanded };
    temp_expanded[index] = !temp_expanded[index];
    setExpanded(() => temp_expanded);
  };

  const handleAdjustmentDetailDialog = (fIndex, index, is_checked) => {
    let fee_plan = { fee_type: fIndex, fee_term: index };
    setDiscountDetailFeePlan(() => fee_plan);
    setIsAdjustmentDetail(() => true);
    setIsCheckedForAdjustment(is_checked);
  };

  const saveButtonAdjustmentDetail = (data) => {
    let tempFeePlan = _.cloneDeep(feePlan);
    let fee_term =
      tempFeePlan[discountDetailFeePlan["fee_type"]]["standard_fee"][
        discountDetailFeePlan["fee_term"]
      ];
    fee_term["adjustment_amount"] = data["total_adjustment"];
    fee_term["adjustment_list"] = data["adjustment_list"];
    fee_term["adjustment_deletable_ids"] = data["deletable_ids"];
    // fee_term['pending_amount'] = parseFloat(fee_term['pending_amount']) - Math.abs(parseFloat(data['total_adjustment']))
    // fee_term['pending_without_adjustment'] = parseFloat(fee_term['pending_without_adjustment']) - Math.abs(parseFloat(data['total_adjustment']))
    setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
    props.updateToParent(tempFeePlan);
    handleCloseAdjustmentDetail();
  };

  const updateToParentFeePlan = (tempFeePlan) => {
    setFeePlan(() => JSON.parse(JSON.stringify(tempFeePlan)));
    props.updateToParent(tempFeePlan);
  };

  const handleCloseAdjustmentDetail = () => {
    setIsAdjustmentDetail(() => false);
    let fee_plan = {};
    setDiscountDetailFeePlan(() => fee_plan);
  };

  const handleOpenStoreList = (fIndex, index) => {
    let fee_plan = { fee_type: fIndex, fee_term: index };
    setDiscountDetailFeePlan(() => fee_plan);
    setIsStoreDetail(() => true);
  };

  const handleCloseStoreList = () => {
    setIsStoreDetail(() => false);
    let fee_plan = {};
    setDiscountDetailFeePlan(() => fee_plan);
  };
  return (
    <div>
      {/* <div className="width-fit-content">
        <Button
          variant="contained" p={1}
          className='addDetails'
          onClick={handleFullPay}
        > Apply Full Pay</Button>
      </div> */}
      {is_fee_group_enabled && fee_group && !adjustmentEnabled && (
        <FeeCollectionDetailedGroup
          fee_group_plan={fee_group}
          selectedGroup={props.selectedGroup}
          feePlan={feePlan}
          adjustmentEnabled={adjustmentEnabled}
          getAdjustmentTotalAmount={getAdjustmentTotalAmount}
          getAdjustmentPendingAmount={getAdjustmentPendingAmount}
          isAddPermission={isAddPermission}
          sequenceNeedToPay={sequenceNeedToPay}
          updateTermAmount={updateTermAmount}
          showPaidAmount={showPaidAmount}
          updateValue={updateValue}
          updateAdjustmentValue={updateAdjustmentValue}
          changeToggle={changeToggle}
          getPendingAmount={getPendingAmount}
          getLabel={getLabel}
          expanded={expanded}
          handleExpand={handleExpand}
          sequenceMap={sequenceMap}
          handleOpenStoreList={handleOpenStoreList}
          updateToParentFeePlan={updateToParentFeePlan}
        />
      )}
      {!is_fee_group_enabled && is_term_wise_view && !adjustmentEnabled && (
        // !props.updateFeePlan &&
        <FeeCollectionDetailedTermViewNew
          feePlan={feePlan}
          adjustmentEnabled={adjustmentEnabled}
          getAdjustmentTotalAmount={getAdjustmentTotalAmount}
          getAdjustmentPendingAmount={getAdjustmentPendingAmount}
          isAddPermission={isAddPermission}
          sequenceNeedToPay={sequenceNeedToPay}
          updateTermAmount={updateTermAmount}
          showPaidAmount={showPaidAmount}
          updateValue={updateValue}
          updateAdjustmentValue={updateAdjustmentValue}
          changeToggle={changeToggle}
          getPendingAmount={getPendingAmount}
          getLabel={getLabel}
          expanded={expanded}
          handleExpand={handleExpand}
          sequenceMap={sequenceMap}
          handleAdjustmentDetailDialog={handleAdjustmentDetailDialog}
          handleOpenStoreList={handleOpenStoreList}
        />
      )}
      {/* {!adjustmentEnabled && is_term_wise_view && (
        <FeeCollectionDetailedTermView
          feePlan={feePlan}
          adjustmentEnabled={adjustmentEnabled}
          getAdjustmentTotalAmount={getAdjustmentTotalAmount}
          getAdjustmentPendingAmount={getAdjustmentPendingAmount}
          isAddPermission={isAddPermission}
          sequenceNeedToPay={sequenceNeedToPay}
          updateTermAmount={updateTermAmount}
          showPaidAmount={showPaidAmount}
          updateValue={updateValue}
          updateAdjustmentValue={updateAdjustmentValue}
          changeToggle={changeToggle}
          getPendingAmount={getPendingAmount}
          getLabel={getLabel}
          expanded={expanded}
          handleExpand={handleExpand}
          sequenceMap={sequenceMap}
          handleAdjustmentDetailDialog={handleAdjustmentDetailDialog}
          handleOpenStoreList={handleOpenStoreList}
        />
      )} */}
      {!adjustmentEnabled && !is_term_wise_view && !is_fee_group_enabled && (
        <FeeCollectionDetailedTypeView
          feePlan={feePlan}
          adjustmentEnabled={adjustmentEnabled}
          getAdjustmentTotalAmount={getAdjustmentTotalAmount}
          getAdjustmentPendingAmount={getAdjustmentPendingAmount}
          isAddPermission={isAddPermission}
          sequenceNeedToPay={sequenceNeedToPay}
          updateTermAmount={updateTermAmount}
          showPaidAmount={showPaidAmount}
          updateValue={updateValue}
          updateAdjustmentValue={updateAdjustmentValue}
          changeToggle={changeToggle}
          getPendingAmount={getPendingAmount}
          getLabel={getLabel}
          expanded={expanded}
          handleExpand={handleExpand}
          sequenceMap={sequenceMap}
          handleAdjustmentDetailDialog={handleAdjustmentDetailDialog}
          handleOpenStoreList={handleOpenStoreList}
        />
      )}
      {adjustmentEnabled &&
        feePlan.map((data, findex) => {
          return (
            <div className={classes.root}>
              <Accordion
                key={findex}
                expanded={expanded[findex]}
                onChange={() => handleExpand(findex)}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-label="Expand"
                  aria-controls="additional-actions1-content"
                  id="additional-actions1-header"
                  className={classes.expanded}
                  style={adjustmentEnabled ? {} : {}}
                >
                  <div className="feecollection-feetype-heading align-items-center display-flex">
                    {is_term_wise_view ? data.name : data.fee_type_name}
                    <div className="ml-5">
                      {`: ${numberWithCommas(data.total_payable_amount)}`}
                    </div>
                    {/* {(!!data.adjustment_amount || !!data.concession_amount) &&
                  <Tooltip title={showFeeTypeCalculation(data)} enterDelay={400}
                    enterNextDelay={400} placement='top-start' arrow
                  >
                    <InfoIcon />
                  </Tooltip>
                } */}
                    {data.reason ? (
                      <span>
                        <WarningIcon style={{ color: "#f6c342" }} />
                      </span>
                    ) : (
                      ""
                    )}
                  </div>
                  <Box ml="auto" className="feecollection-feetype-heading">
                    <div className="display-flex">
                      <div className="ml-5">
                        {`Pending : ${numberWithCommas(data.pending_amount)}`}
                      </div>
                    </div>
                  </Box>
                  <Divider />
                </AccordionSummary>
                <Grid className="d-flex flex-wrap padding-top-10">
                  {data["reason"] ? (
                    <Grid
                      item
                      xl={12}
                      className="margin-bottom-20 pb-5 margin-left-auto margin-right-auto"
                    >
                      <Box
                        display="flex"
                        className="warning-message padding-left-20 padding-right-20"
                        mb={2}
                        mt={2}
                      >
                        {data["reason"]}
                      </Box>
                    </Grid>
                  ) : (
                    data.standard_fee.map((feetermData, index) => {
                      let is_amount_checked = feetermData.is_checked;
                      let selectedClassName = is_amount_checked
                        ? "selected-checkbox rounded-box display-flex"
                        : "rounded-box display-flex";
                      let isAmountDisabled =
                        isUserHasPermission(
                          "fee_collection_editable",
                          "create"
                        ) &&
                        is_amount_checked &&
                        !adjustmentEnabled
                          ? false
                          : true;
                      let isAdjustmentDisabled =
                        adjustmentEnabled && is_amount_checked ? false : true;
                      let isNotOpted = feetermData["is_disabled"];
                      let isAdjustmentAmount = Boolean(
                        feetermData["adjustment_amount"]
                      )
                        ? true
                        : false;
                      let hideCheckbox = false;
                      let seq =
                        sequenceMap?.[
                          sequenceMap?.[feetermData.sequence]?.["depends"]
                        ];
                      let seq_fee_type_name =
                        feePlan[seq?.["fee_type"]]?.["fee_type_name"];
                      let seq_term_name =
                        feePlan[seq?.["fee_type"]]?.["standard_fee"][
                          seq.term
                        ]?.["terms"];
                      let enabledAdjustmentList = adjustmentEnabled
                        ? (feetermData["adjustment_list"] &&
                            feetermData["adjustment_list"].length > 0) ||
                          (feetermData["adjustment_deletable_ids"] &&
                            feetermData["adjustment_deletable_ids"].length > 0)
                        : false;
                      // if ((!enabledAdjustmentList || !adjustmentEnabled) && !feetermData['reason'] && (!feetermData['pending_amount'] || isNotOpted)) {
                      //   selectedClassName += ' opacity';
                      // }
                      if (!isNotOpted) {
                        return (
                          <Grid
                            item
                            md={6}
                            xl={6}
                            key={index}
                            className="margin-bottom-20 pb-5"
                          >
                            {
                              <div className={selectedClassName}>
                                {adjustmentEnabled ||
                                (!feetermData.reason &&
                                  feetermData["pending_amount"] &&
                                  isAddPermission &&
                                  !!!hideCheckbox) ? (
                                  <div>
                                    {!isEnabledSequence ||
                                    adjustmentEnabled ||
                                    (isEnabledSequence &&
                                      !!feetermData.sequence &&
                                      sequenceNeedToPay >=
                                        feetermData.sequence) ||
                                    !!!feetermData.sequence ? (
                                      <div>
                                        <Checkbox
                                          id={`${feetermData.terms}_${findex}_${index}`}
                                          color="primary"
                                          checked={is_amount_checked}
                                          value={is_amount_checked}
                                          inputProps={{
                                            "aria-label": "secondary checkbox",
                                          }}
                                          onChange={(e) =>
                                            updateTermAmount(
                                              e,
                                              findex,
                                              index,
                                              is_amount_checked
                                            )
                                          }
                                        />
                                      </div>
                                    ) : (
                                      <Box ml={2} className="mt-10 pointer">
                                        <Tooltip
                                          title={`Please Pay ${seq_fee_type_name} - ${seq_term_name}`}
                                          enterDelay={400}
                                          enterNextDelay={400}
                                          placement="top-start"
                                          classes={{
                                            tooltip: "tooltip-show-data",
                                          }}
                                        >
                                          <InfoIcon />
                                        </Tooltip>
                                      </Box>
                                    )}
                                  </div>
                                ) : (
                                  <Box ml={4}></Box>
                                )}
                                <div className="margin-left-10 pt-6 margin-right-10 w-100">
                                  <div className="feecollection-term-name">
                                    {is_term_wise_view
                                      ? feetermData.fee_type_name
                                      : feetermData?.term_alias ??
                                        feetermData?.terms}
                                  </div>
                                  <div className="term-total-amount d-flex">
                                    <div className="position-relative align-items-center display-flex pointer">
                                      Term Total
                                      {/* {(('concession_amount' in feetermData && feetermData['concession_amount'] > 0) ||
                                  ('adjustment_amount' in feetermData && feetermData['adjustment_amount'] > 0) ||
                                  ('total_fine_amount' in feetermData && feetermData['total_fine_amount'] > 0) ||
                                  ('pending_fine_amount' in feetermData && feetermData['pending_fine_amount'] > 0)) &&
                                  <Tooltip title={showCalculation(feetermData)} enterDelay={400}
                                    enterNextDelay={400} placement='top-start' className='text-info' arrow
                                  >
                                    <InfoIcon />
                                  </Tooltip>
                                } */}
                                    </div>
                                    <div className="margin-left-auto">
                                      {feetermData.is_amount
                                        ? numberWithCommas(
                                            feetermData.total_amount
                                          )
                                        : numberWithCommas(
                                            feetermData.rate_amount
                                          )}
                                    </div>
                                  </div>
                                  {/* <div className='term-total-amount d-flex'>
                                <div className='position-relative align-items-center display-flex pointer'>
                                  Additional Charges
                                  {(('concession_amount' in feetermData && feetermData['concession_amount'] > 0) ||
                                    ('adjustment_amount' in feetermData && feetermData['adjustment_amount'] > 0) ||
                                    ('total_fine_amount' in feetermData && feetermData['total_fine_amount'] > 0) ||
                                    ('pending_fine_amount' in feetermData && feetermData['pending_fine_amount'] > 0)) &&
                                    <Tooltip title={showCalculation(feetermData)} enterDelay={400}
                                      enterNextDelay={400} placement='top-start' className='text-info' arrow
                                    >
                                      <InfoIcon />
                                    </Tooltip>
                                  }
                                </div>
                                <div className='margin-left-auto'>{(feetermData.is_amount) ?
                                  numberWithCommas(feetermData.total_amount) : numberWithCommas(feetermData.rate_amount)}
                                </div>
                              </div> */}
                                  {!!feetermData.total_fine_amount && (
                                    <div className="term-pending-amount d-flex">
                                      <div>
                                        <FormattedMessage
                                          {...messages.fineAmount}
                                        />
                                      </div>
                                      <div className="margin-left-auto">
                                        {numberWithCommas(
                                          feetermData.total_fine_amount
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <div className="term-paid-amount d-flex ">
                                    <div className="align-items-center display-flex pointer">
                                      <FormattedMessage
                                        {...messages.paidAmount}
                                      />
                                      {"total_fine_paid_amount" in
                                        feetermData &&
                                        feetermData["total_fine_paid_amount"] >
                                          0 && (
                                          <Tooltip
                                            title={showPaidAmount(feetermData)}
                                            enterDelay={400}
                                            enterNextDelay={400}
                                            placement="top-start"
                                            className="text-info"
                                            arrow
                                          >
                                            <InfoIcon />
                                          </Tooltip>
                                        )}
                                    </div>
                                    <div className="margin-left-auto">
                                      {numberWithCommas(
                                        feetermData.paid_amount
                                      )}
                                    </div>
                                  </div>
                                  {!!feetermData.concession_amount && (
                                    <div className="term-pending-amount d-flex">
                                      <div>
                                        <FormattedMessage
                                          {...messages.concessionAmount}
                                        />
                                      </div>
                                      <div className="margin-left-auto">
                                        {numberWithCommas(
                                          -feetermData.concession_amount
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {!!feetermData.adjustment_amount &&
                                    !adjustmentEnabled && (
                                      <div className="term-pending-amount d-flex">
                                        <div>Adjustment Amount</div>
                                        <div className="ml-5 hover-visible">
                                          <Tooltip
                                            title={`Click for details adjustment list`}
                                            enterDelay={400}
                                            enterNextDelay={400}
                                            placement="top-start"
                                            classes={{
                                              tooltip: "tooltip-show-data",
                                            }}
                                          >
                                            <VisibilityOutlinedIcon
                                              className="height-width-20px  pointer"
                                              disabled={!feetermData.is_checked}
                                              onClick={() =>
                                                handleAdjustmentDetailDialog(
                                                  findex,
                                                  index
                                                )
                                              }
                                            />
                                          </Tooltip>
                                        </div>
                                        <div className="margin-left-auto">
                                          {numberWithCommas(
                                            feetermData.adjustment_amount
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  {adjustmentEnabled &&
                                    feetermData?.adjustment_list.length > 0 && (
                                      <div className="term-pending-amount d-flex">
                                        <div>Adjustment Amount</div>
                                        {/* {feetermData.is_checked && ( */}
                                        <div className="ml-5 hover-visible">
                                          <Tooltip
                                            title={`Click for details adjustment list`}
                                            enterDelay={400}
                                            enterNextDelay={400}
                                            placement="top-start"
                                            classes={{
                                              tooltip: "tooltip-show-data",
                                            }}
                                          >
                                            <VisibilityOutlinedIcon
                                              className="height-width-20px  pointer"
                                              disabled={!feetermData.is_checked}
                                              onClick={
                                                feetermData.is_checked
                                                  ? () =>
                                                      handleAdjustmentDetailDialog(
                                                        findex,
                                                        index
                                                      )
                                                  : {}
                                              }
                                            />
                                            {/* <div
                                              disabled={!feetermData.is_checked}
                                              onClick={() =>
                                                handleAdjustmentDetailDialog(
                                                  findex,
                                                  index,
                                                  feetermData.is_checked
                                                )
                                              }
                                            >
                                              (See List)
                                            </div> */}
                                          </Tooltip>
                                        </div>
                                        {/* )} */}
                                        <div className="margin-left-auto">
                                          {numberWithCommas(
                                            feetermData.adjustment_amount
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  {adjustmentEnabled &&
                                    feetermData.total_amount !==
                                      feetermData.pending_without_adjustment && (
                                      <div className="term-pending-amount d-flex">
                                        <div>Balance Amount</div>
                                        <div className="margin-left-auto">
                                          {numberWithCommas(
                                            feetermData.pending_without_adjustment
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  {!adjustmentEnabled && (
                                    <div className="term-pending-amount d-flex">
                                      <div>
                                        <FormattedMessage
                                          {...messages.pendingAmount}
                                        />
                                      </div>
                                      <div className="margin-left-auto">
                                        {numberWithCommas(
                                          feetermData.pending_amount
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {feetermData &&
                                  // ((feetermData?.adjustment_list && feetermData?.adjustment_list.length>0 && adjustmentEnabled) || (feetermData['pending_amount'])) ? (
                                  (adjustmentEnabled ||
                                    feetermData["pending_amount"]) ? (
                                    <div className="term-paid-amount border-dotted-top margin-top-5">
                                      <div className="margin-left-auto">
                                        {!adjustmentEnabled && (
                                          <TextField
                                            id={`${findex}_${index}_rupees_id`}
                                            value={feetermData["amount_paid"]}
                                            onChange={(e) =>
                                              updateValue(e, findex, index)
                                            }
                                            name="amount_paid"
                                            disabled={isAmountDisabled}
                                            InputProps={{
                                              inputComponent:
                                                NumberFormatCustom,
                                              borderBottom: "none",
                                            }}
                                            inputProps={{
                                              maxLength: 15,
                                              width: "100%",
                                              style: { textAlign: "right" },
                                            }}
                                            error={
                                              Boolean(
                                                feetermData["amount_paid_error"]
                                              )
                                                ? true
                                                : false
                                            }
                                            helperText={
                                              Boolean(
                                                feetermData["amount_paid_error"]
                                              ) ? (
                                                <Box>
                                                  {
                                                    feetermData[
                                                      "amount_paid_error"
                                                    ]
                                                  }
                                                </Box>
                                              ) : (
                                                ""
                                              )
                                            }
                                            style={{ width: "100%" }}
                                          />
                                        )}
                                      </div>
                                      {
                                        adjustmentEnabled && (
                                          <Box mt={1}>
                                            <Box className="term-paid-amount text-bold">
                                              {`Adjustment ${
                                                feetermData.type === "increment"
                                                  ? " ( + )"
                                                  : "( - )"
                                              }`}
                                            </Box>
                                            <TextField
                                              autoComplete="off"
                                              fullWidth
                                              // style={{ marginTop: '-5px' }}
                                              id={`${findex}_${index}_adj_rupees_id`}
                                              value={
                                                feetermData["adjust_amount_new"]
                                              }
                                              onChange={(e) =>
                                                updateAdjustmentValue(
                                                  e,
                                                  findex,
                                                  index
                                                )
                                              }
                                              name="adjust_amount_new"
                                              disabled={isAdjustmentDisabled}
                                              InputProps={{
                                                inputComponent:
                                                  NumberFormatCustom,
                                              }}
                                              inputProps={{
                                                maxLength: 15,
                                                width: "100%",
                                                style: { textAlign: "right" },
                                              }}
                                              error={
                                                Boolean(
                                                  feetermData[
                                                    "adjust_amount_error"
                                                  ]
                                                )
                                                  ? true
                                                  : false
                                              }
                                              helperText={
                                                Boolean(
                                                  feetermData[
                                                    "adjust_amount_error"
                                                  ]
                                                ) ? (
                                                  <Box>
                                                    {
                                                      feetermData[
                                                        "adjust_amount_error"
                                                      ]
                                                    }
                                                  </Box>
                                                ) : (
                                                  ""
                                                )
                                              }
                                            />
                                            <div className="mt-10">
                                              <ToggleButtonGroup
                                                className={
                                                  feetermData.is_checked
                                                    ? ""
                                                    : "pointer-event-none"
                                                }
                                                size="small"
                                                value={feetermData.type}
                                                disabled={
                                                  !feetermData.is_checked
                                                }
                                                exclusive
                                                style={{
                                                  backgroundColor: "white",
                                                }}
                                              >
                                                <ToggleButton
                                                  key={2}
                                                  value="increment"
                                                  className={
                                                    feetermData.type ==
                                                    "increment"
                                                      ? "selected-fee-collection"
                                                      : "not-selected-fee-collection"
                                                  }
                                                  onClick={
                                                    feetermData.is_checked
                                                      ? () =>
                                                          changeToggle(
                                                            findex,
                                                            index,
                                                            "increment"
                                                          )
                                                      : ""
                                                  }
                                                >
                                                  Increment
                                                </ToggleButton>
                                                <ToggleButton
                                                  key={1}
                                                  value="decrement"
                                                  className={
                                                    feetermData.type ==
                                                    "decrement"
                                                      ? "selected-fee-collection"
                                                      : "not-selected-fee-collection"
                                                  }
                                                  onClick={
                                                    feetermData.is_checked
                                                      ? () =>
                                                          changeToggle(
                                                            findex,
                                                            index,
                                                            "decrement"
                                                          )
                                                      : ""
                                                  }
                                                >
                                                  Decrement
                                                </ToggleButton>
                                              </ToggleButtonGroup>
                                            </div>
                                            <div className="term-pending-amount d-flex mt-10 text-bold">
                                              <div>
                                                <FormattedMessage
                                                  {...messages.pendingAmount}
                                                />
                                              </div>
                                              <div className="margin-left-auto">
                                                {numberWithCommas(
                                                  getPendingAmount(feetermData)
                                                )}
                                              </div>
                                            </div>
                                          </Box>
                                        )
                                        //  :
                                        // <Box>
                                        //   {isAdjustmentAmount && adjustmentEnabled &&
                                        //     <Box display='flex' justifyContent='space-between' style={{
                                        //       color: 'green',
                                        //       padding: '10px 0px'
                                        //     }}>
                                        //       <Box>
                                        //         <FormattedMessage {...messages.adjustedAmount} />
                                        //       </Box>
                                        //       <Box>
                                        //         {numberWithCommas(feetermData['adjustment_amount'])}
                                        //       </Box>
                                        //     </Box>
                                        //   }
                                        // </Box>
                                      }
                                    </div>
                                  ) : (
                                    <>
                                      <div className="amount-paid-fully">
                                        {!feetermData["paid_amount"] &&
                                        (feetermData["adjustment_amount"] ||
                                          feetermData["concession_amount"]) ? (
                                          <div className="d-flex">
                                            {`${getLabel(feetermData)} Applied`}
                                          </div>
                                        ) : (
                                          <div>Amount Paid</div>
                                        )}
                                        <div className="margin-left-5">
                                          <PaymentIcon />
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                                {adjustmentEnabled ||
                                  (!feetermData["reason"] &&
                                    (feetermData["pending_amount"] ? (
                                      <Box></Box>
                                    ) : (
                                      <Box marginLeft="auto" color="green">
                                        <CheckCircleOutlinedIcon />
                                      </Box>
                                    )))}
                              </div>
                            }
                          </Grid>
                        );
                      }
                    })
                  )}
                </Grid>
              </Accordion>
            </div>
          );
        })}
      {isAdjustmentDetail && (
        <FeeAdjustmentList
          adjustmentEnabled={adjustmentEnabled || isCheckedForAdjustment}
          closeInParent={handleCloseAdjustmentDetail}
          saveAdjustment={saveButtonAdjustmentDetail}
          discountList={
            feePlan[discountDetailFeePlan["fee_type"]]["standard_fee"][
              discountDetailFeePlan["fee_term"]
            ]["adjustment_list"]
          }
          saveButtonBlocked={props.saveButtonBlocked}
        />
      )}
      {isStoreDetail && (
        <FeeStoreList
          closeInParent={handleCloseStoreList}
          saveAdjustment={saveButtonAdjustmentDetail}
          discountList={
            feePlan[discountDetailFeePlan["fee_type"]]["standard_fee"][
              discountDetailFeePlan["fee_term"]
            ]["store_list"]
          }
        />
      )}
    </div>
  );
}
