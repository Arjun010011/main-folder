import React, { Component } from "react";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import { Grid, Button, Paper, Box, CircularProgress, FormControlLabel, Checkbox, Typography } from "@material-ui/core/";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import AllMUIDataTable from "Components/AllMUIDataTable";

import ActionColumn from "Components/ActionColumnNew";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, POST_URL } from "Includes/urls";
import Swal from "sweetalert2";
import { DATATABLEROWSPERPAGEOPT } from "Constants";
import {
  checkLocalAcademicYear, getKeyValueInArray, SetAcademicYear, getFormatMessage,
  isUserHasPermission, updatePermissions
} from "Includes/functions";
import { amountRegex, numberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { Dropdown } from "Components/DropDown";
import { numberWithCommasWithoutSymbol } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';
import LoadingGif from "Components/LoadingGif";

const fieldDetails = [
  {
    label: "Amount",
    regex: numberRegex,
    name: "amount",
    md: 12,
    className: "width-90",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "amount",
    autoFocus: true,
  },
  {
    label: "Online Payment Amount",
    regex: numberRegex,
    name: "online_payment_amount",
    md: 12,
    className: "width-90",
    required: false,
    id: "outlined-online-amount",
    default: "",
    rows: null,
    type: "amount",
    autoFocus: false,
  },
];

class ApplicationFeeView extends Component {
  constructor(props) {
    super(props);
    this.permission = updatePermissions('application_fees', ['update']);
    this.state = {
      countryList: [],
      loading: true,
      enabledActions: [],
      permissions: [],
      closeMenu: true,
      errorContent: "",
      year: "",
      yearName: "",
      isDefaultAcademicYearForOnlineApplication: false,
      defaultYearSaving: false,
      columns: [
        {
          name: "id",
          label: "ID",
          options: {
            filter: true,
            sort: true,
            display: false,
          },
        },
        {
          name: "local_sequence",
          label: <FormattedMessage {...commonMessages.standard} />,
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value) => {
              const standardName = (value && String(value).includes("###"))
                ? String(value).split("###")[1]
                : value || "";
              return <Box>{standardName}</Box>;
            },
          },
        },
        {
          name: "amount",
          label: <FormattedMessage {...commonMessages.amount} />,
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta) => {
              return <Box>{numberWithCommasWithoutSymbol(value)}</Box>
            }
          },
        },
        {
          name: "online_payment_amount",
          options: {
            filter: true,
            sort: true,
            display: false,
          },
        },
        {
          name: "standard",
          options: {
            filter: true,
            display: false,
          },
        },
        {
          name: "is_active",
          options: {
            filter: true,
            display: false,
            download: false
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: true,
            sort: false,
            rowHover: true,
            download: false,
            customBodyRender: (value, tableMeta) => {
              const id = tableMeta.rowData[0];
              return (
                <Box>
                  <ActionColumn
                    id={id}
                    fieldValues={this.fieldValues(tableMeta.rowData[2], tableMeta.rowData[3])}
                    label="Edit Amount"
                    fieldDetails={fieldDetails}
                    updateUrl={PUT_URL.applicationplan.api}
                    updatePostFormat={(newData) =>
                      this.updatePostFormat(newData, id)
                    }
                    updateType={this.updateType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.permission}
                  />
                </Box>
              );
            },
          },
        },
        {
          name: "standard_name",
          options: {
            filter: true,
            display: false,
            download: false
          },
        },
      ]
    };
  }



  fieldValues = (...data) => {
    return data;
  };

  closeMenuAction = (status) => {
    let { tableData, columns } = this.state;
    this.setState({
      tableData: [...tableData],
      closeMenu: status,
      errorContent: "",
      columns: columns,
    });
  };

  componentDidMount = () => {
    this.getYearsList();
  };

  getYearsList = () => {
    const params = {};
    getRequest(GET_URL.getacademicyear.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const yearList = response.data.data;
          const year = checkLocalAcademicYear(yearList);
          const yearName = getKeyValueInArray(yearList, "id", year, "name");
          let loading = false;
          if (year) {
            loading = true;
          }
          this.setState({ yearList, year: year ? year : '', yearName, loading }, () => {
            if (year) {
              this.getApplicationFeesPlan();
            }
          });
        } else {
          this.setState({
            loading: false
          })
        }
      }
    );
  };

  getApplicationFeesPlan = () => {
    const params = { academic_year: this.state.year, is_active: true };
    let props = { ...this.props };
    props['return_error_message'] = true
    getRequest(GET_URL.applicationFeesPlan.api, params, props).then(
      (response) => {
        if (response && response.status === 200) {
          let tableData = response.data.data;
          tableData.map((tempData) => {
            tempData['local_sequence'] = `${tempData['sequence']}###${tempData['standard_name']}`;
            if (tempData['online_payment_amount'] === undefined && tempData['online_amount'] !== undefined) {
              tempData['online_payment_amount'] = tempData['online_amount'];
            }
          })
          this.setState({ loading: false, tableData });
        } else {
          this.setState({
            loadig: false,
          })
        }
      }
    );
  };

  updatePostFormat = (newData, id) => {
    let { tableData, year } = this.state;
    let tableRow = null;
    for (let data of tableData) {
      if (data.id === id) {
        tableRow = data;
      }
    }
    if (!('amount' in newData) || newData.amount === '') {
      return { 'error': 'Invalid Amount' }
    }
    let payload = {
      amount: newData.amount,
      is_active: tableRow.is_active,
      academic_year: year,
      standard: tableRow.standard,
    };
    if (newData.online_payment_amount !== undefined) {
      payload.online_amount = newData.online_payment_amount;
    }
    return payload;
  };

  updateType = (newData, id) => {
    let { tableData, columns } = this.state;
    for (let data of tableData) {
      if (data.id === id) {
        data.amount = newData.amount;
        if (newData.online_payment_amount !== undefined) {
          data.online_payment_amount = newData.online_payment_amount;
        }
      }
    }
    this.setState({
      tableData: [...tableData],
      tableUpdating: false,
      columns: columns,
    });
    return true;
  };

  onChange = (e) => {
    let name = e.target.name;
    let value = e.target.value;
    let yearName = '';
    if (value !== 0) {
      SetAcademicYear(value)
      this.state.yearList.some((data) => {
        if (data['id'] == value) {
          yearName = data['name'];
        }
      })
      this.setState({ [name]: value, 'yearName': yearName }, async () => {
        if (name === "year") {
          this.getApplicationFeesPlan();
        }
      });
    }
  };

  routeToAddApplicationFees = () => {
    this.props.history.push({
      pathname: Actions.application_fees.create.url,
      state: { year: this.state.year, yearName: this.state.yearName },
    });
  };

  getTitle = () => {
    if (this.state.loading) {
      return <CircularProgress className="white-text" />;
    }
    return "";
  };

  handleDefaultAcademicYearForOnlineChange = (e) => {
    this.setState({ isDefaultAcademicYearForOnlineApplication: e.target.checked });
  };

  saveDefaultAcademicYearForOnline = () => {
    const { year, isDefaultAcademicYearForOnlineApplication } = this.state;
    if (!year) return;
    this.setState({ defaultYearSaving: true });
    const params = {
      academic_year: year,
      plan: [],
      is_academic_year_online_appln: isDefaultAcademicYearForOnlineApplication ? 1 : 0,
    };
    postRequest(POST_URL.applicationplan.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason || "Saved successfully.",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    }).finally(() => {
      this.setState({ defaultYearSaving: false });
    });
  };

  render() {
    const { year, yearList, tableData, columns, loading, isDefaultAcademicYearForOnlineApplication, defaultYearSaving } = this.state;
    const options = {
      filterType: "dropdown",
      responsive: "scroll",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
      rowsPerPage: 10,
      selectableRows: "none",
      downloadOptions: {
        filename: "application_fee.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
      onDownload: (buildHead, buildBody, columns, data) => {
        const bodyData = data.map((data_value) => {
          data_value.data[0] = data_value.data[0].split('###')[1]
          return data_value;
        })
        const bodyColumn = columns.map((column_name) => {
          column_name.label = getFormatMessage(column_name.label)
          return column_name;
        })
        return "\uFEFF" + buildHead(bodyColumn) + buildBody(bodyData);
      }
    };
    if(loading){
      return <LoadingGif/>
    }
    return (
      <div>
        <Paper className={"paper-background"}>
          <Grid container>
            <Grid item md={7} xs={12} sm={12}>
              <Box className="header-align heading">Application Fee</Box>
              <Box className="sub-header-align" mt={4}>
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  onChange={this.onChange}
                  hideSelect={true}
                  label={<FormattedMessage {...commonMessages.academicYear} />}
                  // error={!year ? 'Select Academic Year' : ''}
                  helperText={!year ? 'Select Academic Year' : ''}
                />
              </Box>
              {year && (
                <Box mt={2} className="sub-header-align">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isDefaultAcademicYearForOnlineApplication}
                        onChange={this.handleDefaultAcademicYearForOnlineChange}
                        color="primary"
                      />
                    }
                    label="Is default academic year for online application"
                  />
                  <Typography variant="body2" color="textSecondary" style={{ marginTop: 4, marginLeft: 4 }}>
                    If this checkbox is enabled, online applications are automatically saved to this academic year.
                  </Typography>
                  {isDefaultAcademicYearForOnlineApplication && (
                    <Box mt={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={this.saveDefaultAcademicYearForOnline}
                        disabled={defaultYearSaving}
                      >
                        {defaultYearSaving ? "Saving..." : "OK"}
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Grid>
            <Grid item md={5} xs={12} sm={12}>
              <Box className="end-flex-prop header-align">
                {year && isUserHasPermission("application_fees", "create") && (
                  <Button
                    variant="contained"
                    onClick={() => {
                      this.routeToAddApplicationFees();
                    }}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.application_fees.create.label}
                  </Button>
                )}
              </Box>
            </Grid>
            <Grid item md={8} xs={12}>
              <AllMUIDataTable
                key={tableData}
                title={this.getTitle()}
                data={tableData}
                columns={columns}
                options={options}
              />
            </Grid>
          </Grid>
        </Paper>
      </div>
    );
  }
}

export default withRouter(ApplicationFeeView);
