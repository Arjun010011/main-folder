import React, { Component } from "react";
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import ActionColumn from "Components/ActionColumnNew";
import classNames from 'classnames';
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from 'Components/LoadingGif';
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { amountgreaterthanzero } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission, SetAcademicYear, getKeyValueInArray,
  checkLocalAcademicYear, updatePermissions, numberWithCommas
} from 'Includes/functions';
import { Dropdown } from "Components/DropDown";
import './styles.scss';
import { getUrlParam } from 'Includes/functions';
import { options } from 'Constants';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';

const fieldDetails = [
  {
    label: <FormattedMessage {...commonMessages.amount} />, regex: amountgreaterthanzero,
    name: 'amount', md: 12, className: 'width-100', id: 'outlined-textarea',
    default: '', rows: null, type: 'text', maxLength: "8", required: true
  }
]

class ViewMiscellaneousPlan extends Component {
  constructor() {
    super();
    this.permission = updatePermissions('miscellaneous_plan', ['update', 'delete']);
    this.state = {
      loading: true,
      yearList: [],
      year: 0,
      yearName: '',
      alertData: '',
      miscellaneousPlan: [],
      miscellaneousPlanPermission: isUserHasPermission('miscellaneous_plan', 'create'),
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
          name: "misc_type_name",
          label: <FormattedMessage {...messages.miscellaneousType} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "amount",
          label: <FormattedMessage {...commonMessages.amount} />,
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta) => {
              if (value > 0) {
                return numberWithCommas(value)
              } else {
                return '-'
              }
            }
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (<Box>
                <ActionColumn
                  id={tableMeta.rowData[0]}
                  fieldValues={[tableMeta.rowData[2]]}
                  label={<FormattedMessage {...messages.editMiscellaneousPlan} />}
                  fieldDetails={fieldDetails}
                  baseClassName='action-basic-detail-width'
                  updateUrl={PUT_URL.miscplan.api}
                  updatePostFormat={this.updatePostFormat}
                  updateType={this.updateType}
                  deleteUrl={DEL_URL.miscplan.api}
                  deleteType={this.deleteType}
                  enabledActions={this.permission}
                />
              </Box>
              );
            },
          }
        }
      ]
    };
  }

  componentDidMount() {
    let { year } = getUrlParam();
    this.setState({
      year: year
    }, () => {
      this.getYearsList();
    })
  }


  getYearsList = () => {
    getRequest(GET_URL.getacademicyear.api, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        const yearList = response.data.data;
        const year = checkLocalAcademicYear(yearList);
        this.setState({ yearList, year:year?year:'', loading: false, tableLoading: true }, () => {
          if (year !== 0) {
            this.getMiscellaneousPlan();
          }
        });
      }
    });
  }

  getMiscellaneousPlan = () => {
    let { miscellaneousPlan, year } = this.state
    let url = GET_URL.miscplan.api
    let params = { is_active: 1, academic_year: year }
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        miscellaneousPlan = response.data.data
        this.setState({
          miscellaneousPlan,
          tableLoading: false
        })
      }
    })
  }

  deleteType = async (id) => {
    let miscPlan = this.state.miscellaneousPlan
    let index = miscPlan.findIndex(data => data.id === id);
    miscPlan.splice(index, 1);
    this.setState({
      miscellaneousPlan: [...miscPlan]
    })
  }


  updatePostFormat = (newData) => {
    let payload = {
      amount: newData.amount
    }
    return payload
  }


  updateType = (newData, id) => {
    let miscPlan = this.state.miscellaneousPlan;
    for (const data of miscPlan) {
      if (data.id === id) {
        data.amount = newData.amount;
        break;
      }
    }
    this.setState({
      miscellaneousPlan: [...miscPlan]
    })
    return true
  }


  onChangeAcademicYear = async (e) => {
    let value = e.target.value;
    if (value !== 0) {
      SetAcademicYear(value);
      this.setState({ year: value, tableLoading: true, alertData: '' }, () => {
        this.getMiscellaneousPlan();
      })
    }
  }

  addMiscellaneousPrice = () => {
    let { year, yearList, alertData } = this.state;
    if (year) {
      const yearName = getKeyValueInArray(yearList, 'id', year, 'name');
      let searchState = { year: year, yearName: yearName }
      let searchParam = "?" + new URLSearchParams(searchState).toString()
      this.props.history.push({
        pathname: Actions.miscellaneous_plan.create.url,
        search: searchParam,
      });
    }
    else {
      alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />;
      this.setState({
        alertData,
      })
    }
  }


  render() {
    let { loading, yearList, year, columns, miscellaneousPlan, alertData, miscellaneousPlanPermission } = this.state;
    if (loading) {
      return <LoadingGif />
    } else {
      return (
        <Box>
          <Paper className={"paper-background"} style={{ background: 'transparent', boxShadow: 'none' }}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames('header-align')}>
                <Box className='heading'>
                  <FormattedMessage {...messages.miscellaneousPlan} />
                </Box>
              </Grid>

              <Grid item md={6} xs={12} >
                <Box className={classNames('header-align', 'end-flex-prop')}>
                  {year && miscellaneousPlanPermission &&
                    <Button
                      variant="contained"
                      onClick={() => this.addMiscellaneousPrice()}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.miscellaneous_plan.create.label}
                    </Button>
                  }
                </Box>
              </Grid>
            </Grid>
            <Grid container className='margin-top-20'>
              <Grid item lg={3} md={4} xs={6}>
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  hideSelect={true}
                  onChange={this.onChangeAcademicYear}
                  error={alertData}
                  label={<FormattedMessage {...commonMessages.academicYear} />}
                />
              </Grid>
            </Grid>

            <Grid container className='margin-top-20'>
              <Grid item md={8} xs={12}>
                <AllMUIDataTable
                  data={miscellaneousPlan}
                  columns={columns}
                  options={options}
                />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}

export default withRouter(ViewMiscellaneousPlan)
