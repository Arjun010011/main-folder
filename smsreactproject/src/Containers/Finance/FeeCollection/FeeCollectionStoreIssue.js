import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Button, Box, Dialog, TextField } from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import WarningIcon from "@material-ui/icons/Warning";
import { getReverseList, getPropertyValues } from "Includes/functions";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
// import './styles.scss';
import { nameAndNumberAndHyphenRegex } from "Constants/regularExpression";
import { minDate, reasonType } from "Constants";
import { POST_URL, GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import Skeleton from "@material-ui/lab/Skeleton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import Checkbox from "@material-ui/core/Checkbox";
import { Dropdown } from "Components/DropDown";

const fieldDetails = [
  {
    label: "Reason Name",
    regex: nameAndNumberAndHyphenRegex,
    autoFocus: false,
    name: "name",
    md: 12,
    className: "w-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 50,
    gridClassName: "margin-vertical-20",
  },
];

const styles = (theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(2),
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
});

const DialogTitle = withStyles(styles)((props) => {
  const { children, classes, onClose, ...other } = props;
  return (
    <MuiDialogTitle disableTypography className={classes.root} {...other}>
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton
          aria-label="close"
          className={classes.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  );
});

const DialogContent = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}))(MuiDialogContent);

const DialogActions = withStyles((theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(1),
  },
}))(MuiDialogActions);

const header = "Add Discount";

const body = "";

export default function FeeCollectionStoreIssue(props) {
  const [feeStorePlan, setFeeStorePlan] = React.useState([]);
  const [body, setBody] = React.useState([]);
  const [isPresentStore, setIsPresentStore] = React.useState(false);
  const [isPresentDisabled, setIsPresentDisabled] = React.useState(false);
  const [fieldError, setFieldError] = React.useState({});
  const [alertData, setAlertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  React.useEffect(() => {
    let isPresentStore = false;
    let isPresentDisabled = true;
    let bodyTemp = [];
    setBody(() => []);
    if (props.updateSelectedData) {
      props.updateSelectedData.map((feeData) => {
        feeData.standard_fee.map((stdFee) => {
          stdFee["store_list"] =
            stdFee[
              "fee_standard_mapping_item_selling_price_fee_standard_mapping"
            ];
          if (
            stdFee.codename === "store" &&
            stdFee.is_checked &&
            stdFee.store_list
          ) {
            stdFee.is_checked = true;
            isPresentStore = true;
            stdFee.store_list.map((storeData) => {
              storeData["is_checked"] = false;
              storeData["is_disabled"] =
                storeData["issued_quantity"] === storeData["assigned_quantity"];
              if (!storeData["is_disabled"]) {
                isPresentDisabled = false;
                storeData["is_checked"] = true;
              }
              storeData["quantity"] =
                parseInt(storeData["assigned_quantity"]) -
                parseInt(storeData["issued_quantity"]);
              storeData["assigned_quantity"] =
                parseInt(storeData["assigned_quantity"]) -
                parseInt(storeData["issued_quantity"]);
            });
          }
        });
        bodyTemp.push(feeData);
      });
    }
    setBody(() => bodyTemp);
    setIsPresentStore(() => isPresentStore);
    setIsPresentDisabled(() => isPresentDisabled);
    props.updateToStoreParent(bodyTemp);
  }, [props.updateSelectedData, props.feePlan]);

  const changeStoreParent = (value, feeIndex, stIndex, storeIndex) => {
    let bodyTemp = [...body];
    bodyTemp[feeIndex]["standard_fee"][stIndex]["store_list"][storeIndex][
      "is_checked"
    ] = value;
    setBody(() => bodyTemp);
    props.updateToStoreParent(bodyTemp);
  };

  const changeAllStoreParent = (value, feeIndex, stIndex) => {
    let bodyTemp = [...body];
    bodyTemp[feeIndex]["standard_fee"][stIndex]["store_list"].map((strData) => {
      strData["is_checked"] = value;
    });
    setBody(() => bodyTemp);
    props.updateToStoreParent(bodyTemp);
  };

  const handleSearchChange = (e, feeIndex, stIndex, storeIndex) => {
    let bodyTemp = [...body];
    bodyTemp[feeIndex]["standard_fee"][stIndex]["store_list"][storeIndex][
      "issued_quantity"
    ] = e.target.value;
    setBody(() => bodyTemp);
    props.updateToStoreParent(bodyTemp);
  };

  return (
    <div>
      {isPresentStore && (
        <div className="mt-20">
          <div className="invoice-heading">Issue Store Items</div>
          {body.map((feePlanData, feeIndex) => {
            return feePlanData.standard_fee.map((stdFee, stIndex) => {
              if (stdFee.codename === "store" && stdFee.is_checked) {
                let stdIsChecked = true;
                stdFee.store_list.map((strData) => {
                  if (!strData.is_checked && !strData["is_disabled"]) {
                    stdIsChecked = false;
                  }
                });
                return (
                  <table className="width-50">
                    <thead>
                      <tr className="thead-adjustment">
                        <th className="text-align-center">
                          <Checkbox
                            color="primary"
                            checked={stdIsChecked}
                            value={stdIsChecked}
                            onChange={(e) =>
                              changeAllStoreParent(
                                !stdIsChecked,
                                feeIndex,
                                stIndex
                              )
                            }
                            disabled={isPresentDisabled}
                            size="small"
                            className="padding-0"
                          />
                        </th>
                        <th>Item Name </th>
                        <th>Property Values </th>
                        <th>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stdFee.store_list &&
                        stdFee.store_list.map((data, storeIndex) => {
                          return (
                            <tr className="tbody-adjustment" key={storeIndex}>
                              <td className="text-align-center">
                                <Checkbox
                                  color="primary"
                                  checked={
                                    data.is_disabled ? true : data.is_checked
                                  }
                                  value={
                                    data.is_disabled ? true : data.is_checked
                                  }
                                  onChange={(e) =>
                                    data.is_disabled
                                      ? ""
                                      : changeStoreParent(
                                          !data.is_checked,
                                          feeIndex,
                                          stIndex,
                                          storeIndex
                                        )
                                  }
                                  disabled={data.is_disabled}
                                  size="small"
                                  className="padding-0"
                                />
                              </td>
                              <td>{data?.["item_name"]}</td>
                              <td>
                                {getPropertyValues(data?.property_values)}
                              </td>
                              <td>
                                {data.is_disabled ? (
                                  <div>
                                    {data["issued_quantity"]}
                                    <Box className="amount-paid-collected ml-20">
                                      Issued
                                    </Box>
                                  </div>
                                ) : (
                                  <Dropdown
                                    data={getReverseList(
                                      data["assigned_quantity"]
                                    )}
                                    name={"quantity"}
                                    value={data["quantity"]}
                                    onChange={(e) =>
                                      handleSearchChange(
                                        e,
                                        feeIndex,
                                        stIndex,
                                        storeIndex
                                      )
                                    }
                                    error={fieldError[`${storeIndex}_quantity`]}
                                    // label={'Quantity'}
                                    disabled={!data.is_checked}
                                    hideSelect={true}
                                    variant="standard"
                                    size="small"
                                    style={"width-50-px"}
                                    selectClassName={"m-t-0px"}
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                );
              }
            });
          })}
        </div>
      )}
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
