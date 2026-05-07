import React from "react";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { Paper, Box } from "@material-ui/core";
import { numberWithCommas } from "Includes/functions";
import { MODE_OF_PAYMENTS } from "Constants";
import { Dropdown } from "Components/DropDown";

export default function FeeCollectionInvoiceView(props) {
  const [invoiceData, setInvoiceData] = React.useState([]);
  const [invoiceFields, setInvoiceFields] = React.useState([]);
  const [summary, setSummary] = React.useState([]);
  const [isAdditionalChargePlan, setIsAdditionalChargePlan] =
    React.useState(false);
  const [modeOfPay, setModeOfPay] = React.useState("Cash");
  const [fieldError, setFieldError] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(() => true);
    let tempData = props.invoiceData;
    let summary = [];
    let invoiceData = [];
    let totalAmountpaid = 0;
    let totalConcession = 0;
    let totalAdditional = {};
    let totalPayable = 0;
    let totalAdditionalPayable = 0;
    let isAdditionalChargePlan = false;
    let additionalChargeTypes = {};
    let additionalChargesIds = {};
    let additionalPayable = 0;
    let additionalList = {};
    tempData.map((data) => {
      data["standard_fee"].map((termData) => {
        if (termData.is_checked === true && termData["amount_paid"] > 0) {
          let temp = {
            amount_paid: termData["amount_paid"],
            terms: termData?.term_alias ?? termData["terms"],
            feetype_name: data?.["fee_type_name"] ?? termData["fee_type_name"],
          };
          if (props.enabledConcession) {
            temp["concessionAmount"] = termData?.["concessionAmount"] ?? 0;
            temp["payable_amount"] = termData?.["concessionAmount"]
              ? termData["amount_paid"] - termData?.["concessionAmount"]
              : termData["amount_paid"];
            totalPayable += parseFloat(temp["payable_amount"]);
          }
          totalAmountpaid += parseFloat(termData["amount_paid"]);
          totalConcession += parseFloat(temp["concessionAmount"]);
          if (
            !termData.fee_plan_additional_charge_mapping_fee_plan ||
            termData?.fee_plan_additional_charge_mapping_fee_plan.length === 0
          ) {
            temp["total_additional_amount"] = parseFloat(
              props.enabledConcession
                ? temp["payable_amount"]
                : termData["amount_paid"]
            );
            totalAdditionalPayable += parseFloat(
              props.enabledConcession
                ? temp["payable_amount"]
                : termData["amount_paid"]
            );
          }
          additionalPayable = 0;
          if (
            termData?.fee_plan_additional_charge_mapping_fee_plan.length > 0
          ) {
            isAdditionalChargePlan = true;
            additionalList[termData["id"]] = [];
            termData.fee_plan_additional_charge_mapping_fee_plan.map(
              (add_data) => {
                let add_payment_type_list =
                  add_data.additional_charge.apply_on_payment_mode.split(",");
                let amount = 0;
                if (add_payment_type_list.includes(modeOfPay)) {
                  if (!additionalChargeTypes.hasOwnProperty(modeOfPay)) {
                    additionalChargeTypes[modeOfPay] = [];
                  }
                  if (!additionalChargesIds[modeOfPay]) {
                    additionalChargesIds[modeOfPay] = [];
                    totalAdditional[
                      add_data.additional_charge.additional_charge_type_name
                    ] = 0;
                  }
                  if (
                    !additionalChargesIds[modeOfPay].includes(
                      add_data.additional_charge.additional_charge_type
                    )
                  ) {
                    additionalChargesIds[modeOfPay].push(
                      add_data.additional_charge.additional_charge_type
                    );
                    additionalChargeTypes[modeOfPay].push(
                      add_data.additional_charge
                    );
                  }
                  if (add_data.additional_charge.is_percentage) {
                    amount =
                      (parseFloat(
                        props.enabledConcession
                          ? temp["payable_amount"]
                          : termData["amount_paid"]
                      ) *
                        parseFloat(add_data.additional_charge.fees)) /
                      100;
                  } else {
                    amount =
                      parseFloat(
                        props.enabledConcession
                          ? temp["payable_amount"]
                          : termData["amount_paid"]
                      ) + parseFloat(add_data.additional_charge.fees);
                  }
                  temp[
                    add_data.additional_charge.additional_charge_type_name
                  ] = `${numberWithCommas(amount)} (${
                    add_data.additional_charge.is_percentage
                      ? `* ${add_data.additional_charge.fees} %`
                      : `+ ${numberWithCommas(add_data.additional_charge.fees)}`
                  })`;
                  totalAdditional[
                    add_data.additional_charge.additional_charge_type_name
                  ] += parseFloat(amount);
                  additionalPayable += parseFloat(amount);
                  additionalList[termData["id"]].push({
                    amount: amount,
                    additional_charge: add_data.additional_charge.id,
                  });
                }
              }
            );
            temp["total_additional_amount"] =
              parseFloat(
                props.enabledConcession
                  ? temp["payable_amount"]
                  : termData["amount_paid"]
              ) + additionalPayable;
            totalAdditionalPayable += parseFloat(
              temp["total_additional_amount"]
            );
          }
          invoiceData.push(temp);
        }
      });
    });
    if (totalAmountpaid !== 0) {
      summary = [
        {
          label: "Total",
          className: "",
        },
        {
          label: "",
          className: "",
        },
        {
          label: numberWithCommas(totalAmountpaid),
          className: "text-align-right",
        },
      ];
      if (props.enabledConcession && !isAdditionalChargePlan) {
        summary = [
          {
            label: "Total",
            className: "",
          },
          {
            label: "",
            className: "",
          },
          {
            label: numberWithCommas(totalAmountpaid),
            className: "text-align-right",
          },
          {
            label: numberWithCommas(totalConcession),
            className: "text-align-right",
          },
          {
            label: numberWithCommas(totalPayable),
            className: "text-align-right",
          },
        ];
      }
      if (!props.enabledConcession && isAdditionalChargePlan) {
        summary = [
          {
            label: "Total With CGST",
            className: "",
          },
          {
            label: "",
            className: "",
          },
          {
            label: numberWithCommas(totalAmountpaid),
            className: "text-align-right",
          },
        ];
        if (
          additionalChargeTypes?.[modeOfPay] &&
          additionalChargeTypes?.[modeOfPay].length > 0
        ) {
          additionalChargeTypes[modeOfPay].map((addData) => {
            summary.push({
              label: numberWithCommas(
                totalAdditional[addData.additional_charge_type_name]
              ),
              className: "text-align-right",
            });
          });
          summary.push({
            label: numberWithCommas(totalAdditionalPayable),
            className: "text-align-right",
          });
        }
      }
      if (props.enabledConcession && isAdditionalChargePlan) {
        summary = [
          {
            label: "Total With CGST",
            className: "",
          },
          {
            label: "",
            className: "",
          },
          {
            label: numberWithCommas(totalAmountpaid),
            className: "text-align-right",
          },
          {
            label: numberWithCommas(totalConcession),
            className: "text-align-right",
          },
          {
            label: numberWithCommas(totalPayable),
            className: "text-align-right",
          },
        ];
        if (
          additionalChargeTypes?.[modeOfPay] &&
          additionalChargeTypes?.[modeOfPay].length > 0
        ) {
          additionalChargeTypes[modeOfPay].map((addData) => {
            summary.push({
              label: numberWithCommas(
                totalAdditional[addData.additional_charge_type_name]
              ),
              className: "text-align-right",
            });
          });
          summary.push({
            label: numberWithCommas(totalAdditionalPayable),
            className: "text-align-right",
          });
        }
      }
    }
    if (isAdditionalChargePlan) {
      let temp_fields = [...props.invoiceFields];
      let additional_charge_plan = [];
      let total = {
        name: "Total Payable",
        key: "total_additional_amount",
        is_amount: true,
      };
      if (
        additionalChargeTypes?.[modeOfPay] &&
        additionalChargeTypes?.[modeOfPay].length > 0
      ) {
        additionalChargeTypes[modeOfPay].map((addData) => {
          additional_charge_plan.push({
            name: addData.additional_charge_type_name,
            key: addData.additional_charge_type_name,
            is_amount: false,
            className: "text-align-right",
          });
        });
        additional_charge_plan.push(total);
      }
      temp_fields = [...props.invoiceFields, ...additional_charge_plan];
      setInvoiceFields(() => temp_fields);
    } else if (invoiceFields.length === 0) {
      setInvoiceFields(props.invoiceFields);
    }
    if (props.updateAdditionalCharges && isAdditionalChargePlan) {
      props.updateAdditionalCharges(
        additionalList,
        totalAdditionalPayable,
        modeOfPay
      );
    }
    setIsAdditionalChargePlan(() => isAdditionalChargePlan);
    setInvoiceData(() => invoiceData);
    setSummary(() => summary);
  }, [props.invoiceData, modeOfPay, props.totalAmountPaid]);

  React.useEffect(() => {
    setLoading(() => false);
  }, [invoiceData]);

  const handleStandardChange = (e) => {
    setInvoiceData(() => []);
    setInvoiceFields(() => []);
    setSummary(() => []);
    setIsAdditionalChargePlan(() => false);
    setModeOfPay(() => e.target.value);
  };

  return (
    <div>
      {!loading && (
        <>
          {isAdditionalChargePlan && (
            <>
              <hr />
              <div className="mt-30">
                <Dropdown
                  data={MODE_OF_PAYMENTS}
                  name={modeOfPay}
                  value={modeOfPay}
                  onChange={(e) => handleStandardChange(e)}
                  label="Mode Of Payment"
                  hideSelect={true}
                  error={fieldError.modeOfPay}
                />
              </div>
            </>
          )}
          {(props.enabledConcession || isAdditionalChargePlan) && invoiceData.length > 0 && (
            <>
              <Box className="invoice-heading mt-20">Invoice</Box>
              <TableContainer component={Paper}>
                <Table className="" aria-label="Invoice table">
                  <TableHead>
                    <TableRow style={{ backgroundColor: "#CADFF0" }}>
                      {invoiceFields.map((field, iIndex) => {
                        return (
                          <TableCell key={iIndex}>
                            <div
                              className={
                                field.is_amount
                                  ? "text-align-right"
                                  : field?.className ?? ""
                              }
                            >
                              {field.name}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoiceData.map((invoice, index) => (
                      <TableRow
                        key={index + "invoice"}
                        style={
                          index % 2
                            ? { background: "#F5F5F5" }
                            : { background: "white" }
                        }
                      >
                        {invoiceFields.map((field, rowIndex) => {
                          if (field.key in invoice) {
                            return (
                              <TableCell
                                component="th"
                                scope="row"
                                key={rowIndex + "rowIndex"}
                              >
                                <div
                                  className={
                                    field.is_amount
                                      ? "text-align-right"
                                      : field?.className ?? ""
                                  }
                                >
                                  {field.is_amount
                                    ? numberWithCommas(invoice[field.key])
                                    : invoice[field.key]}
                                </div>
                              </TableCell>
                            );
                          } else {
                            return (
                              <TableCell
                                component="th"
                                scope="row"
                                key={rowIndex + "rowIndex"}
                              >
                                <div
                                  className={
                                    field.is_amount
                                      ? "text-align-right"
                                      : field?.className ?? ""
                                  }
                                >
                                  {numberWithCommas(0)}
                                </div>
                              </TableCell>
                            );
                          }
                        })}
                      </TableRow>
                    ))}
                    <TableRow>
                      {summary.map((data, index) => {
                        return (
                          <TableCell key={index} className={data["className"]}>
                            <div
                              className={`${data["className"]} font-weight-bold`}
                            >
                              {data["label"]}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}
    </div>
  );
}
