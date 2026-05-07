import React, { Component } from "react";
import { withRouter, Link } from "react-router-dom";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Box, CircularProgress, Button, Paper, Grid } from "@material-ui/core";
import Swal from "sweetalert2";
import Snackbar from "@material-ui/core/Snackbar";
import { cloneDeep } from "lodash";

import FeeTermPlanBenificiary from "Containers/Finance/Components/FeeTermPlanBenificiary";
import { numberWithCommas } from "Includes/functions";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import {
  validateDate,
  Alert,
  dateFormat,
  getUrlParam,
} from "Includes/functions";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { DATATABLEROWSPERPAGEOPT, TRANSPORT_CODE } from "Constants";
import { FormattedMessage } from "react-intl";
import commonMessage from "Constants/messages";
import FeeAdditionalPlanDetail from "./Components/FeeAdditionalPlanDetail";
import { DataUsageSharp } from "@material-ui/icons";

class CreateTermAdditionalCharge extends Component {
  constructor(props) {
    super(props);
    this.state = {
      feePlanData: [],
      selectedFeePlan: {},
      feePlanwholeData: {},
      alertData: "",
      snackbar: false,
      permissions: ["create"],
      studentType: "",
      standardName: "",
      expandedRowsIndex: [0],
      beneficiary_data: [],
      deletable_ids: [],
      feeTypeList: [],
    };
    this.columns = [
      {
        name: "id",
        options: {
          filter: false,
          sort: true,
          display: false,
        },
      },
      {
        name: "codename",
        options: {
          filter: false,
          sort: true,
          display: false,
        },
      },
      {
        name: "fee_type_name",
        label: "Fee Type",
        options: {
          filter: false,
        },
      },
      {
        name: "rate",
        label: "Total Amount",
        options: {
          filter: false,
          customBodyRender: (value, tableMeta) => {
            if (tableMeta.rowData[1] === TRANSPORT_CODE) {
              return `${value}%`;
            } else {
              return numberWithCommas(value);
            }
          },
        },
      },
      {
        name: "total_terms",
        label: "Total Terms",
        options: {
          filter: false,
          customBodyRender: (value, tableMeta) => {
            if (
              tableMeta["rowIndex"] in this.state.feePlanData &&
              "standard_fee" in this.state.feePlanData[tableMeta["rowIndex"]] &&
              this.state.feePlanData[tableMeta["rowIndex"]]["standard_fee"]
                .length
            ) {
              return `${
                this.state.feePlanData[tableMeta["rowIndex"]]["standard_fee"]
                  .length
              }`;
            } else {
              return 0;
            }
          },
        },
      },
      {
        name: "standard_fee",
        options: {
          filter: false,
          sort: true,
          display: false,
        },
      },
    ];
    this.getFeeTypes = this.getFeeTypes.bind(this);
  }

  componentDidMount() {
    let { year, standard, studentType, standardName } = getUrlParam();
    if (year && standard && studentType) {
      this.setState({
        year: year,
        standard: standard,
        tableUpdating: true,
        studentType: studentType,
        standardName: standardName,
      });
      this.getAdditionalChargePlan(year, standard, studentType);
    } else {
      this.props.history.push(Actions.fee_additional_charge_plan.view.url);
    }
  }

  getAdditionalChargePlan = (year, standard, studentType) => {
    const url = GET_URL.additionalcharge.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            feeTypeList: response.data.data,
          },
          () => {
            this.getFeeTypes(year, standard, studentType);
          }
        );
      }
    });
  };

  getAdditionalCharges = (typeList) => {
    let return_data = [];
    let { feeTypeList } = this.state;
    let tempList = cloneDeep(feeTypeList);
    tempList.map((data) => {
      typeList.map((type) => {
        if (type["additional_charge"]["id"] === data["id"]) {
          data["editId"] = type["id"];
          return_data.push(data);
        }
      });
    });
    return return_data;
  };

  getFeeTypes = (year, standard, studentType) => {
    const params = {
      academic_year: year,
      standard: standard,
      student_type: studentType,
    };
    getRequest(GET_URL.feeplan.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let feePlanData = response.data.data.plan;
        if (feePlanData.length > 0) {
          feePlanData.forEach((plan, index) => {
            plan.standard_fee.forEach((fee) => {
              fee.additionalcharges = [];
              if (
                fee.fee_plan_additional_charge_mapping_fee_plan &&
                fee.fee_plan_additional_charge_mapping_fee_plan.length > 0
              ) {
                fee.additionalcharges = this.getAdditionalCharges(
                  fee.fee_plan_additional_charge_mapping_fee_plan
                );
              }
            });
            feePlanData[index]["total_terms"] = plan.standard_fee.length;
          });
        }
        this.setState({
          feePlanData,
          tableUpdating: false,
        });
      } else {
        this.setState({
          tableUpdating: false,
        });
      }
    });
  };

  showErrorPopUp = (text) => {
    this.setState({ snackbar: true, alertData: text });
  };
  validateTotalAmount = () => {
    let fieldError = {};
    let beneficiary_list = [];
    let return_value = true;
    let feePlanData = [...this.state.feePlanData];
    for (let fee_plan_index in feePlanData) {
      let data = feePlanData[fee_plan_index];
      let termTotal = 0;
      for (let standard_fee_ind in data.standard_fee) {
        let selectedFeeData = data.standard_fee[standard_fee_ind];
        termTotal = 0;
        selectedFeeData.reason = "";
        beneficiary_list = [];
        selectedFeeData.beneficiary_split.map((account, accIndex) => {
          termTotal += parseFloat(account.rate);
          if (!account.beneficiary_id) {
            return_value = false;
            fieldError[`${standard_fee_ind}_${accIndex}_beneficiary_id`] = (
              <FormattedMessage {...commonMessage.fieldMandatoryError} />
            );
          } else if (beneficiary_list.includes(account.beneficiary_id)) {
            return_value = false;
            fieldError[`${standard_fee_ind}_${accIndex}_beneficiary_id`] = (
              <FormattedMessage {...commonMessage.duplicateFoundLabel} />
            );
          }
          beneficiary_list.push(account["beneficiary_id"]);
        });

        if (
          selectedFeeData.is_amount &&
          termTotal !== parseFloat(selectedFeeData.rate)
        ) {
          return_value = false;
          selectedFeeData.reason = `Difference amount ${
            selectedFeeData.rate - termTotal
          }`;
        } else if (!selectedFeeData.is_amount && termTotal != 100) {
          return_value = false;
          selectedFeeData.reason = `Difference percentage ${100 - termTotal}`;
        }
        if (!("is_primary_adjustment" in selectedFeeData)) {
          return_value = false;
          selectedFeeData.reason = `Select any radio primary adjustment`;
        }
      }
    }
    this.setState({ feePlanData, fieldError });
    return return_value;
  };

  getPostData = () => {
    const { year, standard, deletable_ids } = this.state;
    let return_value = {
      // year: parseInt(year),
      // standard: parseInt(standard),
      data_list: [],
      deletable_ids: [],
    };
    let temp_list = [];
    let deletable_ids_temp = [];
    let feePlanData = [...this.state.feePlanData];
    let temp = {};
    let temp_ids = [];
    for (let data of feePlanData) {
      for (let selectedFeeData of data.standard_fee) {
        temp_ids = [];
        if (selectedFeeData.additionalcharges) {
          selectedFeeData.additionalcharges.map((account) => {
            temp = {};
            temp["fee_plan"] = selectedFeeData.id;
            temp["additional_charge"] = account.id;
            temp["apply_on"] = 1;
            if (account.editId) {
              temp["id"] = account.editId;
            }
            temp_ids.push(account.id);
            temp_list.push(temp);
          });
        }
        if (
          selectedFeeData.fee_plan_additional_charge_mapping_fee_plan &&
          selectedFeeData.fee_plan_additional_charge_mapping_fee_plan.length > 0
        ) {
          deletable_ids_temp = [
            ...deletable_ids_temp,
            ...this.getDeletableIds(
              selectedFeeData.fee_plan_additional_charge_mapping_fee_plan,
              temp_ids
            ),
          ];
        }
      }
    }
    return_value["data_list"] = temp_list;
    return_value["deletable_ids"] = deletable_ids_temp;
    return return_value;
  };

  getDeletableIds = (list, ids) => {
    let return_list = [];
    list.map((data) => {
      if (!ids.includes(data.additional_charge.id)) {
        return_list.push(data.id);
      }
    });
    return return_list;
  };

  submitFeeTems = () => {
    const url = POST_URL.feeplanadditionalchargemapping.api;
    const postData = this.getPostData();
    // if (this.validateTotalAmount()) {
    postRequest(url, postData, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        const { year, standard } = getUrlParam();
        this.getFeeTypes(year, standard);
        this.props.history.push(Actions.fee_additional_charge_plan.view.url);
      }
    });
    // }
  };

  updateFeeData = (selectedFeePlanData, deletable_ids) => {
    let feePlanData = [...this.state.feePlanData];
    for (let index in feePlanData) {
      if (feePlanData[index].id === selectedFeePlanData.id) {
        feePlanData[index] = selectedFeePlanData;
        break;
      }
    }
    this.setState({ feePlanData, deletable_ids });
  };

  getTitle = () => {
    if (this.state.tableUpdating || this.props.loading) {
      return <CircularProgress className="white-text" />;
    }
  };

  handleCloseSnackbar = () => {
    this.setState({ alertData: "", snackbar: false });
  };

  expandGivenRosws = (allRowsExpanded) => {
    let temprowsExpanded = allRowsExpanded.map((data) => {
      return data["index"];
    });
    this.setState({
      expandedRowsIndex: temprowsExpanded,
    });
  };

  render() {
    const {
      feePlanData,
      permissions,
      studentType,
      feeTypeList,
      snackbar,
      alertData,
      standardName,
      expandedRowsIndex,
      beneficiary_data,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "responsive",
      filter: false,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
      expandableRows: true,
      search: false,
      expandableRowsHeader: false,
      rowsExpanded: expandedRowsIndex,
      onRowExpansionChange: (
        currentRowsExpanded,
        allRowsExpanded,
        rowsExpanded
      ) => {
        this.expandGivenRosws(allRowsExpanded);
      },
      renderExpandableRow: (rowData, rowMeta) => {
        return (
          <FeeAdditionalPlanDetail
            selectedFeePlan={feePlanData[rowMeta["rowIndex"]]}
            dataIndex={rowMeta["dataIndex"]}
            updateFeeData={this.updateFeeData}
            beneficiary_data={beneficiary_data}
            feeTypeList={feeTypeList}
          />
        );
      },
    };
    const disabled = !permissions.includes("create") ? true : false;
    return (
      <Box>
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={6} xs={12} className="header-align">
              <Box className="heading">
                {Actions.fee_additional_charge_plan.create.label}
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className="header-align end-flex-prop">
                <Button
                  variant="contained"
                  component={Link}
                  to={
                    Actions.fee_additional_charge_plan.view.url +
                    "?studentType=" +
                    studentType
                  }
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" /> View{" "}
                  {Actions.fee_additional_charge_plan.create.label}
                </Button>
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className="year-std-box" mr={2}>
                <Box className="academic-std-head">
                  {" "}
                  <FormattedMessage {...commonMessage.standard} />{" "}
                </Box>
                <Box className="aca-std-white-background">{standardName}</Box>
              </Box>
            </Grid>
          </Grid>
          <Box mt={4}>
            <AllMUIDataTable
              data={feePlanData}
              key={feePlanData}
              title={this.getTitle()}
              columns={this.columns}
              options={options}
              onTableChange={this.changePage}
            />
          </Box>
          {!disabled && (
            <Box className="submt-button-float-bottom" mt={3}>
              <Button
                variant="contained"
                color="primary"
                className="submit"
                disabled={false} //{submitDisable}
                onClick={this.submitFeeTems}
              >
                submit
              </Button>
            </Box>
          )}
        </Paper>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar}
          autoHideDuration={10000}
          onClose={this.handleCloseSnackbar}
        >
          <Alert onClose={this.handleCloseSnackbar} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
}

export default withRouter(CreateTermAdditionalCharge);
