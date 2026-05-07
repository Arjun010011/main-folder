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
    label: "Batch Name", regex: '',
    name: 'name', md: 12, className: 'width-100', id: 'outlined-textarea',
    default: '', rows: null, type: 'text', maxLength: "20", required: true
  },
  {
    label: "Batch Code", regex: '',
    name: 'code', md: 12, className: 'width-100', id: 'outlined-textarea',
    default: '', rows: null, type: 'text', maxLength: "8", required: true
  },
  {
    label: "id",
    name: 'id', display:false, required: false
  }
]

class ViewAttendanceBatch extends Component {
  constructor() {
    super();
    // this.permission = updatePermissions('attendance_batch', ['update', 'delete']);
    this.permission = ['update', 'delete'];
    this.state = {
      loading: true,
      yearList: [],
      year: 0,
      yearName: '',
      alertData: '',
      attendanceBatch: [],
      attendanceBatchPermission: isUserHasPermission('attendance_batch', 'create'),
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
          label: "Batch Name",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "code",
          label: "Batch Code",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            // display: this.permission.length > 0,
            display:true,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (<Box>
                <ActionColumn
                  id={tableMeta.rowData[0]}
                  fieldValues={[tableMeta.rowData[1],tableMeta.rowData[2],tableMeta.rowData[0]]}
                  label="Edit Batch Detail"
                  fieldDetails={fieldDetails}
                  baseClassName='action-basic-detail-width'
                  updateUrl={PUT_URL.attendancebatch.api}
                  updatePostFormat={this.updatePostFormat}
                  deleteUrl={DEL_URL.attendancebatch.api}
                  deleteType={this.deleteType}
                  enabledActions={this.permission}
                  newEditData={{
                      'redirectToUrl': Actions.attendance_batch.update.url,
                      'params': {
                          id:tableMeta.rowData[0],
                      }
                  }}
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
            this.getattendanceBatch();
          }
        });
      }
    });
  }

  getattendanceBatch = () => {
    let { attendanceBatch, year } = this.state
    let url = GET_URL.attendancebatch.api
    let params = { is_active: 1, academic_year: year }
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        attendanceBatch = response.data.data
        this.setState({
          attendanceBatch,
          tableLoading: false
        })
      }
    })
  }

  deleteType = async (id) => {
    let batch = this.state.attendanceBatch
    let index = batch.findIndex(data => data.id === id);
    batch.splice(index, 1);
    this.setState({
      attendanceBatch: [...batch]
    })
  }


  updatePostFormat = (newData) => {
    console.log(newData,'newbaljdjj')
    let { year } = this.state
    let payload = {
      academic_year:year,
      name:newData.name,
      code:newData.code,
      id:newData.id
    }
    return payload
  }


  updateType = (newData, id) => {
    let miscPlan = this.state.attendanceBatch;
    for (const data of miscPlan) {
      if (data.id === id) {
        data.amount = newData.amount;
        break;
      }
    }
    this.setState({
      attendanceBatch: [...miscPlan]
    })
    return true
  }


  onChangeAcademicYear = async (e) => {
    let value = e.target.value;
    if (value !== 0) {
      SetAcademicYear(value);
      this.setState({ year: value, tableLoading: true, alertData: '' }, () => {
        this.getattendanceBatch();
      })
    }
  }

  addAttendanceBatch = () => {
    let { year, yearList, alertData } = this.state;
    if (year) {
      const yearName = getKeyValueInArray(yearList, 'id', year, 'name');
      let searchState = { year: year, yearName: yearName }
      let searchParam = "?" + new URLSearchParams(searchState).toString()
      this.props.history.push({
        pathname: Actions.attendance_batch.create.url,
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
    let { loading, yearList, year, columns, attendanceBatch, alertData, attendanceBatchPermission } = this.state;
    if (loading) {
      return <LoadingGif />
    } else {
      return (
        <Box>
          <Paper className={"paper-background"} style={{ background: 'transparent', boxShadow: 'none' }}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames('header-align')}>
                <Box className='heading'>
                  Attendance Batch
                </Box>
              </Grid>

              <Grid item md={6} xs={12} >
                <Box className={classNames('header-align', 'end-flex-prop')}>
                  {year &&
                    <Button
                      variant="contained"
                      onClick={() => this.addAttendanceBatch()}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.attendance_batch.create.label}
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
                  data={attendanceBatch}
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

export default withRouter(ViewAttendanceBatch)
