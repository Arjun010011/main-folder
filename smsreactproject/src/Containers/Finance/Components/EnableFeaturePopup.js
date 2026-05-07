import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import CloseIcon from "@material-ui/icons/Close";
import Slide from "@material-ui/core/Slide";
import Checkbox from "@material-ui/core/Checkbox";
import Swal from "sweetalert2";
import { Box, Grid, TextField, Collapse } from "@material-ui/core";
import {
  validateDate,
  dateFormat,
  getReverseList,
  getPropertyValues,
} from "Includes/functions";
import WarningIcon from "@material-ui/icons/Warning";
import { FormattedMessage } from "react-intl";
import messages from "../messages";
import commonMessages from "Constants/messages";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
import { Dropdown } from "Components/DropDown";

import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { CUSTOM_CODE } from "Constants";
import LoadingGif from "Components/LoadingGif";
import FeatureStudentListReview from "Containers/Finance/Components/FeatureStudentListReview";
import VisibilityIcon from "@material-ui/icons/Visibility";

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    flex: 1,
  },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const today = new Date();

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

export default function FullScreenDialog(props) {
  const { studentIds, studentTypes, isViewOnly } = props;
  const classes = useStyles();
  const [open, setOpen] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [features, setFeatures] = React.useState([]);
  const [enabledFeatures, enableFeature] = React.useState({});
  const [enabledStoreFeatures, setEnabledStoreFeatures] = React.useState({});
  const [lastEnabledFeatures, setLastEnabledFeatures] = React.useState([]);
  const [disabledFeatures, setdisabledFeatures] = React.useState([]);
  const [alertData, setAlertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);
  const [fieldError, setFieldError] = React.useState({});
  const [submitDisable, setSubmitDisable] = React.useState(false);
  const [postData, setPostData] = React.useState({});
  const [reviewStudents, setReviewStudents] = React.useState(false);
  const [action, setAction] = React.useState("");
  const [store_amount, set_store_amount] = React.useState({
    paid_amount: 0,
    total_amount: 0,
    balance_amount: 0,
  });
  const [showIssuedHistory, setshowIssuedHistory] = React.useState(false);
  const [hoveredRowIndex, setHoveredRowIndex] = React.useState(null);
  const [openRowIndex, setOpenRowIndex] = React.useState(null);
  const [openCollapseRow, setOpenCollapseRow] = React.useState(null);
  const [instiuteName, setInstiuteName] = React.useState(user ? user.institute_details.name : "")

  const handleClose = (action) => {
    if (["save", "enable", "disable"].includes(action)) {
      setSubmitDisable(() => true);
      let custom_fee_type_mapping = {};
      let postData = {
        student_feature: props.studentIds,
        feature_status: 3,
        deleted_feature: [],
      };
      if (action === "enable") {
        postData["feature_status"] = 1;
      } else if (action === "disable") {
        postData["feature_status"] = 2;
      }

      let fee_ids = [];
      let is_any_store_enabled = false;
      let delted_ids_store = [];
      let quantity = "";
      let issued_quantity = 0;
      let total_paid_store_amount = 0;
      let total_paying_store_amount = 0;
      let fee_plan_item_selling_mapping = {};
      for (const [fee_id, store_list] of Object.entries(enabledStoreFeatures)) {
        fee_plan_item_selling_mapping[fee_id] = [];
        is_any_store_enabled = false;
        for (const [store_id, status] of Object.entries(store_list)) {
          if (status) {
            for (const featData of features) {
              for (const standard of featData["standard_fee"]) {
                total_paid_store_amount = standard["total_paid_amount"];
                if (standard["id"] == fee_id) {
                  for (const storeData of featData[
                    "fee_standard_mapping_item_selling_price_fee_standard_mapping"
                  ]) {
                    if (storeData["id"] == store_id) {
                      quantity = storeData["assigned_quantity"];
                      issued_quantity = storeData['issued_quantity']
                      total_paying_store_amount += storeData["selling_price"];
                    }
                  }
                }
              }
            }
            is_any_store_enabled = true;
          } else if (!delted_ids_store.includes(store_id)) {
            fee_plan_item_selling_mapping[fee_id].push({
              fee_standard_mapping_item_selling_price_id: parseInt(store_id),
              feature_status: 2,
            });
            delted_ids_store.push(store_id);
          }
          if (
            (action == "save" || status) &&
            !delted_ids_store.includes(store_id)
          ) {
            fee_plan_item_selling_mapping[fee_id].push({
              fee_standard_mapping_item_selling_price_id: parseInt(store_id),
              feature_status: status === true ? 1 : 2,
              quantity: status ? quantity : null,
              issued_quantity : issued_quantity
            });
          }
        }
        if (!is_any_store_enabled) {
          postData["deleted_feature"].push(parseInt(fee_id));
        } else if (!fee_ids.includes(parseInt(fee_id))) {
          fee_ids.push(parseInt(fee_id));
        }
      }
      for (const [fee_id, status] of Object.entries(enabledFeatures)) {
        if (
          status &&
          !postData["deleted_feature"].includes(parseInt(fee_id)) &&
          !fee_ids.includes(parseInt(fee_id))
        ) {
          fee_ids.push(parseInt(fee_id));
        }
        for (const featData of features) {
          if (featData.codename === CUSTOM_CODE) {
            for (const standard of featData["standard_fee"]) {
              if (standard["id"] == fee_id) {
                custom_fee_type_mapping[fee_id] = { amount: standard["rate"] };
              }
            }
          }
        }
      }
      postData["feature"] = fee_ids;
      postData["fee_plan_item_selling_mapping"] = fee_plan_item_selling_mapping;
      postData["custom_fee_type_mapping"] = custom_fee_type_mapping;
      if (postData["feature_status"] === 3) {
        for (let feature_id of lastEnabledFeatures) {
          if (
            !fee_ids.includes(feature_id) &&
            !(feature_id in disabledFeatures)
          ) {
            postData["deleted_feature"].push(parseInt(feature_id));
          }
        }
      }
      setPostData(postData);
      if (studentIds.length > 1) {
        setReviewStudents(true);
        setAction(action);
        setSubmitDisable(() => false);
      } else {
        postCall(postData);
      }
    } else {
      setOpen(false);
      props.closeFeaturePopup();
    }
  };

  const handleCloseStudentReview = () => {
    setReviewStudents(false);
  };

  const postCall = (postDataTemp) => {
    const url = POST_URL.feature.api;
    postRequest(url, postDataTemp, props).then((response) => {
      setSubmitDisable(() => false);
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        setOpen(false);
        props.closeFeaturePopup();
      }
    });
  };

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  const changeParent = (e, fIndex) => {
    let { value } = e.target;
    value = value === "true" ? false : true;
    let enabled = { ...enabledFeatures };
    let featuresTemp = [...features];
    features[fIndex]["standard_fee"].map((data) => {
      if (!(data["id"] in disabledFeatures)) {
        enabled[data["id"]] = value;
      }
    });
    featuresTemp[fIndex]["is_checked"] = value;
    featuresTemp[fIndex]["standard_fee"].map((data) => {
      data["is_checked"] = value;
    });
    setFeatures(() => featuresTemp);
    enableFeature(enabled);
  };

  const changeStoreParent = (value, fIndex) => {
    let enabled = { ...enabledStoreFeatures };
    let store_temp_amount = { ...store_amount };
    let termId = features[fIndex]["standard_fee"][0]["id"];
    if (!value) {
      store_temp_amount["balance_amount"] =
        store_temp_amount["balance_amount"] -
        store_temp_amount["not_issued_paid_amount"];
    }
    features[fIndex][
      "fee_standard_mapping_item_selling_price_fee_standard_mapping"
    ].map((store) => {
      store["is_enabled"] = value;
      if (
        store["assigned_quantity"] !== store["issued_quantity"] &&
        store["issued_quantity"] !== store["quantity"] &&
        ((!value &&
          store_temp_amount["balance_amount"] > store["selling_price"]) ||
          value)
      ) {
        if (!enabled?.[termId]) {
          enabled[termId] = { [store["id"]]: value };
        } else if (!enabled?.[termId]?.[store["id"]]) {
          enabled[termId][store["id"]] = value;
        } else {
          enabled[termId][store["id"]] = value;
        }
        if (!value) {
          store_temp_amount["balance_amount"] =
            store_temp_amount["balance_amount"] - store["selling_price"];
        } else {
          store_temp_amount["balance_amount"] =
            store_temp_amount["balance_amount"] + store["selling_price"];
        }
      }
    });
    let featuresTemp = [...features];
    featuresTemp[fIndex]["is_checked"] = value;
    featuresTemp[fIndex]["standard_fee"].map((data) => {
      data["is_checked"] = value;
    });
    setFeatures(() => featuresTemp);
    set_store_amount({ ...store_temp_amount });
    setEnabledStoreFeatures(enabled);
  };

  React.useEffect(() => {
    getNonMandatoryFeatures();
  }, []);

  const getNonMandatoryFeatures = () => {
    const url = GET_URL.feature.api;
    let params = {
      is_mandatory: 0,
      academic_year: props.yearId,
      standard: props.current_standard,
      student: studentIds.toString(),
    };
    //Getting only resident/day scholar fee type
    if (studentIds.length > 1) {
      let studentTypeParam = "";
      let isRPresent = studentTypes.includes("Residential");
      let isDPresent = studentTypes.includes("Day Scholar");
      if (isRPresent && !isDPresent) {
        studentTypeParam = "R";
      } else if (!isRPresent && isDPresent) {
        studentTypeParam = "D";
      } else {
        studentTypeParam = "B";
      }
      params["student_type"] = studentTypeParam;
    }
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        let features = response.data.data;
        let enabled = { ...enabledFeatures };
        let storeEnabled = { ...enabledStoreFeatures };
        let lenabled = [];
        let disabled = { ...disabledFeatures };
        let balance_amount = 0;
        let { studentIds } = props;
        let store_amount = {
          paid_amount: 0,
          total_amount: 0,
          balance_amount: 0,
        };
        features.map((featureData) => {
          featureData["standard_fee"].map((termData) => {
            let intersection = studentIds.filter((value) =>
              Object.keys(termData["student_feature"]).includes(
                value.toString()
              )
            );
            if (
              studentIds.length === 1 &&
              intersection[0] == studentIds[0] &&
              featureData["codename"] === CUSTOM_CODE
            ) {
              termData["rate"] =
                termData["student_feature"][studentIds[0]]["amount"];
            }
            // if (!termData['is_fee_paid'] && (new Date(termData['term_start_date'])) >= today) {
            //   enabled[termData['id']] = (intersection.length > 0) ? true : false;
            //   lenabled.push(termData['id'])
            // }
            // else {
            if (intersection.length > 0 && studentIds.length === 1) {
              enabled[termData["id"]] = true;
              lenabled.push(termData["id"]);
            }
            // }
            if (featureData["codename"] === "store") {
              store_amount["paid_amount"] = termData["total_paid_amount"];
              store_amount["not_issued_paid_amount"] = 0;
              featureData[
                "fee_standard_mapping_item_selling_price_fee_standard_mapping"
              ].map((storeData) => {
                storeData["assigned_quantity"] =
                  storeData["assigned_quantity"] > 0
                    ? storeData["assigned_quantity"]
                    : storeData["quantity"];
                storeData['temp_issued_quantity'] = storeData["issued_quantity"] > 0
                ? storeData["issued_quantity"] : 0
                if (!storeEnabled[termData["id"]]) {
                  storeEnabled[termData["id"]] = {
                    [storeData["id"]]: storeData["is_enabled"],
                  };
                } else if (!storeEnabled[termData["id"]][storeData["id"]]) {
                  storeEnabled[termData["id"]][storeData["id"]] =
                    storeData["is_enabled"];
                }
                if (storeData.issued_quantity) {
                  balance_amount += parseFloat(storeData.selling_price);
                  store_amount["not_issued_paid_amount"] += parseFloat(
                    storeData.selling_price
                  );
                }
                if (storeData.is_enabled) {
                  store_amount["total_amount"] += parseFloat(
                    storeData.selling_price
                  );
                }
              });
            }
          });
        });
        store_amount["balance_amount"] =
          parseFloat(store_amount["total_amount"]) -
          parseFloat(store_amount["paid_amount"]);
        setEnabledStoreFeatures(() => storeEnabled);
        setdisabledFeatures(disabled);
        enableFeature(enabled);
        setLastEnabledFeatures(lenabled);
        setFeatures(features);
        setLoading(() => false);
        set_store_amount(store_amount);
      }
    });
  };

  const enableFeatureOnChange = (e, feature, feeIndex, stIndex) => {
    let { value } = e.target;
    let featuresTemp = [...features];
    value = value === "true" ? false : true;
    featuresTemp[feeIndex]["standard_fee"][stIndex]["is_checked"] = value;
    let enabled = { ...enabledFeatures };
    enabled[feature] = value;
    let parent_checked = false;
    featuresTemp[feeIndex]["standard_fee"].map((data) => {
      if (data.is_checked) {
        parent_checked = true;
      }
    });
    featuresTemp[feeIndex]["is_checked"] = parent_checked;
    setFeatures(() => featuresTemp);
    enableFeature(enabled);
  };

  const customRateChange = (e, feeIndex, stIndex) => {
    if (e.target.value < 1000000) {
      let featuresTemp = [...features];
      featuresTemp[feeIndex]["standard_fee"][stIndex]["rate"] = e.target.value;
      setFeatures(() => featuresTemp);
    }
  };

  const enableStoreFeatureOnChange = (
    e,
    feature,
    storeId,
    selling_price,
    feeIndex,
    storeIndex
  ) => {
    let { value } = e.target;
    value = value === "true" ? false : true;
    let store_temp_amount = { ...store_amount };
    if (!value && selling_price > store_amount["balance_amount"]) {
      setAlertData("Already Paid The Amount Cannot Remove");
      setSnackbar(true);
      return;
    }
    let enabled = { ...enabledStoreFeatures };
    if (!enabled?.[feature]) {
      enabled[feature] = { [storeId]: value };
    } else if (!enabled?.[feature]?.[storeId]) {
      enabled[feature][storeId] = value;
    } else {
      enabled[feature][storeId] = value;
    }
    if (value) {
      store_temp_amount["balance_amount"] =
        parseFloat(store_temp_amount["balance_amount"]) +
        parseFloat(selling_price);
    } else {
      store_temp_amount["balance_amount"] =
        parseFloat(store_temp_amount["balance_amount"]) -
        parseFloat(selling_price);
    }
    let featuresTemp = [...features];
    featuresTemp[feeIndex]["is_checked"]=value
    set_store_amount({ ...store_temp_amount });
    setEnabledStoreFeatures(enabled);
    setFeatures(() => featuresTemp);
  };

  const handleSearchChange = (e, stIndex, storeIndex, name) => {
    let featuresTemp = [...features];
    featuresTemp[stIndex][
      "fee_standard_mapping_item_selling_price_fee_standard_mapping"
    ][storeIndex][name] = e.target.value;
    setFeatures(() => featuresTemp);
  };

  const handleSubmitReview = () => {
    postCall(postData);
  };

  const handlePrintAllReceipts = () => {
    const itemsToPrint = [];
    features.forEach((feature) => {
      feature.standard_fee.forEach((standardFee) => {
        const storeList = feature.fee_standard_mapping_item_selling_price_fee_standard_mapping;
        storeList.forEach((store) => {
            itemsToPrint.push(store);
        });
      });
    });
    const newWindow = window.open('', '_blank', 'width=800,height=600');
    let printContent = `
      <html>
        <head>
          <title>${instiuteName} Issued Items Receipt</title>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1 style="text-align: center">${instiuteName}</h1>
          <h2>Issued Items Receipt</h2>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Date</th>
                <th>Issued Quantity</th>
              </tr>
            </thead>
            <tbody>
    `;
  
    itemsToPrint.forEach((item) => {
      if (item.studentstoremappinglog && item.studentstoremappinglog.length > 0) {
        item.studentstoremappinglog.forEach((log) => {
          printContent += `
            <tr>
              <td>${item.item_name}</td>
              <td>${log.created ? new Date(log.created).toLocaleString('en-IN') : ''}</td>
              <td>${log.is_addition 
                    ? `Issued: ${log.current_issued_quantity}` 
                    : `Reduced: ${log.current_issued_quantity}`
                  }
              </td>
            </tr>
          `;
        });
      }
    });
  
    printContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;
  
    newWindow.document.write(printContent);
    newWindow.document.close();
    newWindow.print();
  };


  return (
    <div>
      <Dialog
        fullScreen
        open={open}
        onClose={() => handleClose("close")}
        TransitionComponent={Transition}
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => handleClose("close")}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              {isViewOnly
                ? "View Non Mandatory Fee"
                : "Enable/Disable Non Mandatory Fee"}
            </Typography>
          </Toolbar>
        </AppBar>
        {loading && <LoadingGif />}
        {!loading && (
          <div>
            {reviewStudents ? (
              <FeatureStudentListReview
                handleClosePopup={handleCloseStudentReview}
                studentList={props.studentList}
                features={features}
                enabledFeatures={enabledFeatures}
                enabledStoreFeatures={enabledStoreFeatures}
                studentIds={studentIds}
                action={action}
                handleSubmit={handleSubmitReview}
              />
            ) : (
              <>
                <Box ml={4} mr={4} mb={5}>
                  {features.length !== 0 && !isViewOnly && (
                    <Box
                      display="flex"
                      m={1}
                      ml={2}
                      className="warning-message"
                    >
                      Terms can not be disabled on the following conditions.{" "}
                      <br />
                      1) If Non Mandatory fee is already paid for the particular
                      term.
                    </Box>
                  )}
                  <Grid container>
                    {features.length > 0 &&
                      features.map((featureData, feeIndex) => {
                        let isParentDisabled = true;
                        let isParentChecked = true;
                        let tempChecked = false;
                        featureData["standard_fee"].map((e) => {
                          tempChecked = Boolean(
                            enabledFeatures.hasOwnProperty(e["id"]) &&
                              enabledFeatures[e["id"]]
                          );
                          if (!tempChecked && !(e["id"] in disabledFeatures)) {
                            isParentChecked = false;
                          }
                          if (!(e["id"] in disabledFeatures)) {
                            isParentDisabled = false;
                          }
                        });
                        if (isViewOnly) {
                          isParentDisabled = true;
                        }
                        if (featureData.codename === "store") {
                          isParentChecked = true;
                          isParentDisabled = true;
                          let store_list_ids =
                            enabledStoreFeatures[
                              featureData["standard_fee"][0]["id"]
                            ] ?? {};
                          Object.keys(store_list_ids).map((storeTemp) => {
                            if (!store_list_ids[storeTemp]) {
                              isParentChecked = false;
                            }
                          });
                          let store_list =
                            featureData?.fee_standard_mapping_item_selling_price_fee_standard_mapping ??
                            [];
                          store_list.map((data) => {
                            if (
                              data["assigned_quantity"] !==
                                data["issued_quantity"] ||
                              data["issued_quantity"] !== data["quantity"]
                            ) {
                              isParentDisabled = false;
                            }
                          });
                          return (
                            <Grid item lg={12} md={12}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handlePrintAllReceipts(features)}
                                style={{ margin: '10px 0', backgroundColor: '#4caf50', color: 'white' }}
                              >
                                Print All Issued Items Receipt
                              </Button>
                              <Box className="feature-fee-name">
                                {featureData.fee_type_name}
                              </Box>
                              <table className="width-100-perc">
                                <tr>
                                  <th className="feature-table-border">
                                    <Checkbox
                                      color="primary"
                                      checked={isParentChecked}
                                      value={isParentChecked}
                                      onChange={(e) =>
                                        changeStoreParent(
                                          !isParentChecked,
                                          feeIndex
                                        )
                                      }
                                      disabled={isParentDisabled}
                                      size="small"
                                    />
                                  </th>
                                  <th className="feature-table-border">
                                    Quantity
                                  </th>
                                  <th className="feature-table-border">
                                    Total Issued Quantity
                                  </th>
                                  <th className="feature-table-border">
                                    Item Name
                                  </th>
                                  <th className="feature-table-border">
                                    Category [ SubCategory ]
                                  </th>
                                  <th className="feature-table-border">
                                    Property Values
                                  </th>
                                  <th className="feature-table-border">
                                    Total Amount
                                  </th>
                                  <th className="feature-table-border">
                                    Selected Quantity Amount
                                  </th>
                                </tr>
                                {featureData["standard_fee"].map(
                                  (standardFee, stIndex) => {
                                    let isChecked = Boolean(
                                      enabledFeatures.hasOwnProperty(
                                        standardFee["id"]
                                      ) && enabledFeatures[standardFee["id"]]
                                    );
                                    let disabled =
                                      standardFee["id"] in disabledFeatures
                                        ? true
                                        : false;
                                    if (
                                      !isChecked &&
                                      standardFee["id"] in disabledFeatures &&
                                      disabledFeatures[standardFee["id"]]
                                    ) {
                                      isChecked = true;
                                    }
                                    if (isViewOnly) {
                                      disabled = true;
                                    }
                                    let store_list =
                                      featureData?.fee_standard_mapping_item_selling_price_fee_standard_mapping ??
                                      [];
                                    let isStoreChecked = false;
                                    return (
                                      <>
                                        {store_list.map((data, storeIndex) => {
                                          isStoreChecked =
                                            enabledStoreFeatures?.[
                                              standardFee["id"]
                                            ]
                                              ? Boolean(
                                                  enabledStoreFeatures[
                                                    standardFee["id"]
                                                  ].hasOwnProperty(
                                                    data["id"]
                                                  ) &&
                                                    enabledStoreFeatures[
                                                      standardFee["id"]
                                                    ][data["id"]]
                                                )
                                              : false;
                                          disabled =
                                            data["assigned_quantity"] ===
                                              data["temp_issued_quantity"] &&
                                            data["temp_issued_quantity"] ===
                                              data["quantity"]
                                              ? true
                                              : false;
                                          return (
                                            // eslint-disable-next-line react/jsx-key
                                            <>
                                            <tr>
                                              <td className="feature-table-border">
                                                <Checkbox
                                                  onChange={(e) =>
                                                    enableStoreFeatureOnChange(
                                                      e,
                                                      standardFee["id"],
                                                      data["id"],
                                                      data["selling_price"],
                                                      feeIndex,
                                                      storeIndex
                                                    )
                                                  }
                                                  value={isStoreChecked}
                                                  checked={isStoreChecked}
                                                  disabled={disabled}
                                                  color="primary"
                                                  size="small"
                                                />
                                              </td>
                                              <td className="feature-table-border">
                                                {disabled ? (
                                                  <div>
                                                    {data["issued_quantity"]}
                                                    <Box className="amount-paid-collected ml-20">
                                                      Issued
                                                    </Box>
                                                  </div>
                                                ) : (
                                                  <Dropdown
                                                    data={getReverseList(
                                                      data["quantity"],
                                                      data[
                                                        "temp_issued_quantity"
                                                      ] === 0
                                                        ? 1
                                                        : data[
                                                            "issued_quantity"
                                                          ]
                                                    )}
                                                    name={"assigned_quantity"}
                                                    value={
                                                      data["assigned_quantity"]
                                                    }
                                                    onChange={(e) =>
                                                      handleSearchChange(
                                                        e,
                                                        feeIndex,
                                                        storeIndex,
                                                        'assigned_quantity'
                                                      )
                                                    }
                                                    error={
                                                      fieldError[
                                                        `${storeIndex}_assigned_quantity`
                                                      ]
                                                    }
                                                    // label={'Quantity'}
                                                    disabled={!isStoreChecked}
                                                    hideSelect={true}
                                                    variant="standard"
                                                    size="small"
                                                    style={"width-50-px"}
                                                    selectClassName={"m-t-0px"}
                                                  />
                                                )}
                                              </td>

                                              <td className="feature-table-border" style={{ placeItems: "center" }}>
                                                <Box className="d-flex">
                                                  <Dropdown
                                                    data={getReverseList(
                                                      data["assigned_quantity"],
                                                      data["temp_issued_quantity"] === 0
                                                        ? 1
                                                        : data["temp_issued_quantity"]
                                                    )}
                                                    name={"issued_quantity"}
                                                    value={data["issued_quantity"]}
                                                    onChange={(e) =>
                                                      handleSearchChange(
                                                        e,
                                                        feeIndex,
                                                        storeIndex,
                                                        'issued_quantity'
                                                      )
                                                    }
                                                    error={fieldError[`${storeIndex}_issued_quantity`]}
                                                    disabled={!isStoreChecked}
                                                    hideSelect={true}
                                                    variant="standard"
                                                    size="small"
                                                    style={"width-50-px"}
                                                    selectClassName={"m-t-0px"}
                                                  />
                                                  
                                                  {/* Visibility Icon for expanding */}
                                                  {data['studentstoremappinglog'] && data['studentstoremappinglog'].length > 0 && (
                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                      <VisibilityIcon
                                                        style={{ cursor: 'pointer', marginTop: '4px', marginLeft: '4px', color: 'seagreen' }}
                                                        onClick={() => setOpenCollapseRow(openCollapseRow === storeIndex ? null : storeIndex)}
                                                      />
                                                    </div>
                                                  )}
                                                </Box>
                                              </td>

                                              <td className="feature-table-border">
                                                {data["item_name"]}
                                              </td>
                                              <td className="feature-table-border">
                                                {data["sub_category_name"]
                                                  ? `${data["category_name"]} [ ${data["sub_category_name"]} ]`
                                                  : data["category_name"]}
                                              </td>
                                              <td className="feature-table-border">
                                                {getPropertyValues(
                                                  data["property_values"]
                                                )}
                                              </td>
                                              <td className="feature-table-border">
                                                {data["selling_price"]}
                                              </td>
                                              <td className="feature-table-border">
                                                {Math.floor(
                                                  data["selling_price"] /
                                                    data["quantity"]
                                                ) * data["assigned_quantity"]}
                                              </td>
                                            </tr>
                                            {openCollapseRow === storeIndex && (
                                              <tr>
                                                <td colSpan={8} style={{ backgroundColor: '#FFF3E0' }}>
                                                  <Collapse in={openCollapseRow === storeIndex}>
                                                    <div style={{ padding: '10px' }}>
                                                      <table style={{ width: '100%' }}>
                                                        <thead>
                                                          <tr>
                                                            <th className="feature-table-border">Date</th>
                                                            <th className="feature-table-border">Quantity</th>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {data['studentstoremappinglog']?.map((logRow, logIndex) => (
                                                            <tr key={logIndex}>
                                                              <td className="feature-table-border">
                                                                {dateFormat(logRow['created'], 'DD-MM-YYYY hh:mm A')}
                                                              </td>
                                                              <td className="feature-table-border">
                                                                {logRow['is_addition']
                                                                  ? `Issued a quantity of ${logRow['current_issued_quantity']}`
                                                                  : `Reduced issued quantity by ${logRow['current_issued_quantity']}`}
                                                              </td>
                                                            </tr>
                                                          ))}
                                                        </tbody>
                                                      </table>
                                                      <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                                                        Total Issued Quantity is {data['issued_quantity']}
                                                      </div>
                                                    </div>
                                                  </Collapse>
                                                </td>
                                              </tr>
                                            )}
                                            </>
                                          );
                                        })}
                                      </>
                                    );
                                  }
                                )}
                              </table>
                            </Grid>
                          );
                        }
                        return (
                          <Grid item lg={6} xs={12}>
                            <Box className="feature-fee-name">
                              {featureData.fee_type_name}
                            </Box>
                            <table
                              className="w-100"
                              style={{
                                paddingLeft: "20px",
                                paddingRight: "20px",
                              }}
                            >
                              <tr>
                                <th className="feature-table-border">
                                  <Checkbox
                                    color="primary"
                                    checked={isParentChecked}
                                    value={isParentChecked}
                                    onChange={(e) => changeParent(e, feeIndex)}
                                    disabled={isParentDisabled}
                                    size="small"
                                  />
                                </th>
                                <th className="feature-table-border">
                                  <FormattedMessage
                                    {...messages.viewFeeTermTermName}
                                  />
                                </th>
                                <th className="feature-table-border">
                                  <FormattedMessage
                                    {...commonMessages.amount}
                                  />
                                </th>
                                <th className="feature-table-border">
                                  <FormattedMessage
                                    {...commonMessages.start_date}
                                  />
                                </th>
                                <th className="feature-table-border">
                                  <FormattedMessage
                                    {...commonMessages.end_date}
                                  />
                                </th>
                              </tr>
                              {featureData["standard_fee"].map(
                                (standardFee, stIndex) => {
                                  let isChecked = Boolean(
                                    enabledFeatures.hasOwnProperty(
                                      standardFee["id"]
                                    ) && enabledFeatures[standardFee["id"]]
                                  );
                                  let disabled =
                                    standardFee["id"] in disabledFeatures
                                      ? true
                                      : false;
                                  if (
                                    !isChecked &&
                                    standardFee["id"] in disabledFeatures &&
                                    disabledFeatures[standardFee["id"]]
                                  ) {
                                    isChecked = true;
                                  }
                                  if (isViewOnly) {
                                    disabled = true;
                                  }
                                  return (
                                    <tr>
                                      <td className="feature-table-border">
                                        <Checkbox
                                          onChange={(e) =>
                                            enableFeatureOnChange(
                                              e,
                                              standardFee["id"],
                                              feeIndex,
                                              stIndex
                                            )
                                          }
                                          value={isChecked}
                                          checked={isChecked}
                                          disabled={disabled}
                                          color="primary"
                                          size="small"
                                        />
                                      </td>
                                      <td className="feature-table-border">
                                        {standardFee?.["term_alias"] ??
                                          standardFee["terms"]}
                                      </td>
                                      <td className="feature-table-border">
                                        {featureData.codename ===
                                        CUSTOM_CODE ? (
                                          <TextField
                                            type="number"
                                            value={standardFee["rate"]}
                                            onChange={(e) =>
                                              customRateChange(
                                                e,
                                                feeIndex,
                                                stIndex
                                              )
                                            }
                                            inputProps={{
                                              max: 8,
                                              style: { textAlign: "right" },
                                            }}
                                            disabled={!isChecked}
                                          />
                                        ) : (
                                          standardFee["rate"]
                                        )}
                                      </td>
                                      <td className="feature-table-border">
                                        {dateFormat(
                                          standardFee["term_start_date"],
                                          "DD-MM-YYYY"
                                        )}
                                      </td>
                                      <td className="feature-table-border">
                                        {dateFormat(
                                          standardFee["term_end_date"],
                                          "DD-MM-YYYY"
                                        )}
                                      </td>
                                    </tr>
                                  );
                                }
                              )}
                            </table>
                          </Grid>
                        );
                      })}
                  </Grid>
                </Box>
                {features.length === 0 && (
                  <BlankPagewithIcon data="No feature is available to display" />
                )}
                <Box className="submt-button-float-bottom" mt={3}>
                  {studentIds.length === 1 &&
                    features.length !== 0 &&
                    !isViewOnly && (
                      <Button
                        autoFocus
                        onClick={submitDisable ? "" : () => handleClose("save")}
                        variant="contained"
                        color="primary"
                        disabled={submitDisable}
                        className="submit"
                      >
                        Save
                      </Button>
                    )}
                  {studentIds.length !== 1 && features.length !== 0 && (
                    <Button
                      autoFocus
                      onClick={submitDisable ? "" : () => handleClose("enable")}
                      variant="contained"
                      color="primary"
                      className="submit"
                      disabled={submitDisable}
                    >
                      <FormattedMessage {...commonMessages.enable} />
                    </Button>
                  )}
                  {studentIds.length !== 1 && features.length !== 0 && (
                    <Button
                      autoFocus
                      onClick={
                        submitDisable ? "" : () => handleClose("disable")
                      }
                      variant="contained"
                      color="primary"
                      className="submit margin-left-5"
                      disabled={submitDisable}
                    >
                      <FormattedMessage {...commonMessages.disable} />
                    </Button>
                  )}
                </Box>
              </>
            )}
          </div>
        )}
      </Dialog>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={snackbar}
        autoHideDuration={10000}
        onClose={handleCloseSnackBar}
      >
        <Alert onClose={handleCloseSnackBar} severity="error">
          {alertData}
        </Alert>
      </Snackbar>
    </div>
  );
}
