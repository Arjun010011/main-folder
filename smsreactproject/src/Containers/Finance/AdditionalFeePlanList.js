import React, { Component } from "react";
import { Paper, Box, Grid, Tooltip, Button, CircularProgress } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";
import { cloneDeep } from 'lodash';

import {
  DATATABLEROWSPERPAGEOPT, MODE_OF_PAYMENTS,
} from "Constants";
import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, POST_URL } from "Includes/urls";
import { nameWithQuoteRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, updatePermissions } from "Includes/functions";
import InfoIcon from "@material-ui/icons/Info";

const fieldDetailsGlobal = [
  {
    label: "Name",
    regex: nameWithQuoteRegex,
    name: "name",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "100",
  },
  {
    label: "Fee Type",
    name: 'additional_charge_type',
    md: 12,
    className: 'width-100',
    required: true,
    default: '',
    type: 'dropDownWithSearch',
    list: [],
  },
  {
    label: "Is Percentage",
    name: 'is_percentage',
    md: 12,
    className: '',
    required: true,
    allowDuplicates: true,
    id: 'outlined-textarea',
    rows: null, type: 'checkbox',
    gridClassName: "margin-vertical-20",
  },
  {
    label: "Fees",
    regex: null,
    name: "fees",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "100",
  },
  {
    label: 'Payment Mode',
    name: 'apply_on_payment_mode',
    md: 12,
    className: 'width-100',
    required: true,
    type: 'multiselect',
    list: MODE_OF_PAYMENTS
  },
];

class AdditionalFeePlanList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions('additional_fee_plan', ['update', 'delete']);
    this.state = {
      financeTypeList: [],
      loading: true,
      selectedToDelete: [],
      standardMap: {},
      closeMenu: true,
      enabledActions: [],
      additionalTypeList: [],
      fieldDetails: null,
      errorContent: "",
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "name",
          label: "Name",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "additional_charge_type_name",
          label: "Additional Charge Type",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "additional_charge_type",
          label: "Additional Charge Type",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "is_percentage",
          label: "Is Percentage",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
            customBodyRender: (value) => {
              return <>
                {value ? 'Yes' : 'No'}
              </>
            }
          },
        },
        {
          name: "fees",
          label: "Fees",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "apply_on_payment_mode",
          label: "Payment Mode",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "Actions",
          label: "Actions",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <>
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={this.temp(tableMeta.rowData[1], tableMeta.rowData[3], tableMeta.rowData[4], tableMeta.rowData[5], tableMeta.rowData[6])}
                    label="Edit Additional Fee Type"
                    fieldDetails={this.state.fieldDetails}
                    updatePostFormat={(newData) =>
                      this.updatePostFormat(newData, tableMeta.rowData[0])
                    }
                    updateType={this.updateType}
                    postUrl={POST_URL.additionalcharge.api}
                    deleteType={this.deleteType}
                    deleteUrl={DEL_URL.additionalcharge.api}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.permission}
                    closeMenu={this.state.closeMenu}
                    errorContent={this.state.errorContent}
                    closeMenuAction={this.closeMenuAction}
                  />
                </div>
              </>
            },
          },
        },
      ]
    };
  }

  options = {
    filterType: "dropdown",
    responsive: "scroll",
    filter: false,
    download: false,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
    rowsPerPage: 10,
    selectableRows: "none",
    // rowHover:true
  };

  getRowFromArray = (paymentModes) => {
    let return_list = []
    MODE_OF_PAYMENTS.map((data) => {
      if (paymentModes.includes(data['id'])) {
        return_list.push(data)
      }
    })
    return return_list
  }

  getAdjustmentFromArray = (type) => {
    let { additionalTypeList } = this.state;
    let return_data = {}
    additionalTypeList.map((data) => {
      if (type === data['id']) {
        return_data=data
      }
    })
    return return_data
  }

  temp(name, type, is_percentage, fees, paymentMode) {
    let temp = [];
    temp.push(name);
    temp.push(this.getAdjustmentFromArray(type));
    temp.push(is_percentage);
    temp.push(fees);
    temp.push(this.getRowFromArray(paymentMode.split(",")))
    return temp;
  }

  closeMenuAction = (status) => {
    let { financeTypeList, columns } = this.state;
    this.setState({
      financeTypeList: [...financeTypeList],
      closeMenu: status,
      errorContent: "",
      columns: columns,
    });
  };

  getPaymentIds=(paymentList)=>{
    let return_data=[]
    paymentList.map((payData)=>{
      MODE_OF_PAYMENTS.map((data)=>{
        if(data['id']==payData['id']){
          return_data.push(data['id'])
        }
      })
    })
    return return_data.join(',')
  }

  updatePostFormat = (newData, id) => {
    let payload = {
      data_list: [
        {
          id: id,
          name: newData.name,
          additional_charge_type: newData.additional_charge_type.id,
          fees: parseFloat(newData.fees),
          is_percentage: newData.is_percentage,
          apply_on_payment_mode: this.getPaymentIds(newData.apply_on_payment_mode)
        }
      ]
    };
    return payload;
  };

  updateType = (newData, id) => {
    this.getFinanceTypeList();
    return true;
  };

  componentDidMount() {
    this.getAdditionalFeeTypes()
    this.getFinanceTypeList();
  }

  getAdditionalFeeTypes = () => {
    const url = GET_URL.additionalchargetype.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let fieldDetails = cloneDeep(fieldDetailsGlobal)
        fieldDetails[1]['list'] = response.data.data
        this.setState({
          fieldDetails,
          additionalTypeList: response.data.data
        });
      }
    });
  };

  getFinanceTypeList = () => {
    const url = GET_URL.additionalcharge.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          financeTypeList: response.data.data,
          loading: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    let standard = [...this.state.financeTypeList];
    let { financeTypeList } = this.state
    for (const index in financeTypeList) {
      if (financeTypeList[index].id === id) {
        standard.splice(index, 1);
        break;
      }
    }
    this.setState({
      financeTypeList: standard,
    });
  };

  getTitle = () => {
    if (this.state.loading) {
      return <CircularProgress className="white-text" />;
    }
    return "";
  };

  render() {
    const { loading, financeTypeList, columns } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={"paper-background"}>
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <Box className="header-align heading">Additional Fee Plan</Box>
              </Grid>
              <Grid item md={5} xs={12} sm={12}>
                <Box className="end-flex-prop header-align">
                  {isUserHasPermission("additional_fee_plan", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.additional_fee_plan.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.additional_fee_plan.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container className="header-align">
              <Grid item lg={10} md={10} xs={12}>
                <AllMUIDataTable
                  title={this.getTitle()}
                  data={financeTypeList}
                  columns={columns}
                  options={this.options}
                  hideTextTransform={true}
                />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}
export default AdditionalFeePlanList;
