import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import classNames from 'classnames';
import _ from 'lodash';

import loadingBar from 'images/loading.gif';
import {
    Paper, Box, Grid, Button, CircularProgress, Table, TableCell, TableContainer, TableHead,
    TableBody, TableRow
} from '@material-ui/core';
import { getRequest } from 'Includes/api/apicall';
import { Actions } from 'Constants/permissions';
import { timeFormat, isUserHasPermission} from 'Includes/functions';
import './styles.scss';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { GET_URL } from 'Includes/urls';


class IndividualPeriodView extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            fieldError: { entire_paper_error: {} },
            workingDays: [],
            period_list: { periods: [] },
            openSnackbar: false,
            alertData: '',
            isHalfDay: false,
            deletableIds: [],
            loading: true,
            isEdit: false,
            number_of_periods: '',
            is_period_entered: false,
            is_all_weekdays_selected: false,
            minDateValue: '',
            maxDateValue: '',
            plan_name: '',
            options: [],
            selected: [],
            period_wise: { columns: [], data: {}, new_data: [] },
            day_wise: {},
            is_week_wise: false,
            period_list_names: [],
            isBreakPeriod: false,
            delete_period_list: [],
            delete_period_ids: [],
            yearName: '',
            yearList: [],
            year: '',
            error: {},
            blankPage: false,
            planId: '',
            loadingPeriod: false,
            standard_list: []
        }
        this.dateRange = React.createRef();
    }

    componentDidMount = () => {
        if (this.props.location.pathname === Actions.period_plan_individual.view.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                let id = this.props.location.state.detail
                this.getPeriodPlanDetails(id);
            }
            else {
                this.props.history.push(Actions.period_plan.view.url);
            }
        }
    }

    getStandardList = () => {
        let { year, standardList, options, isEdit } = this.state;
        const url = GET_URL.getstandard.api
        const params = { is_active: true, academic_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                standardList = response.data.data
                standardList.map((data) => {
                    let optionformat = {
                        label: data.name,
                        value: data.name,
                        id: data.id
                    }
                    options.push(optionformat)
                })
                this.setState({
                    standardList: response.data.data,
                    selectedYear: year,
                    loading: false,
                    options,
                    selected: options
                }, () => {
                    if (isEdit)
                        this.updateShiftDetails()
                })
            }
        })
    }


    getPeriodPlanDetails = (id) => {
        const url = GET_URL.period.api + id + '/'
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    periodPlanDetails: response.data.data,
                    year: response.data.data.academic_year,
                    yearName: response.data.data.academic_year_value,
                    standard_list: response.data.data.standard_list,
                    planId: id,
                    isEdit: true,
                }, () => {
                    this.getWorkingDays()
                })
            }
        })
    }

    updateShiftDetails = () => {
        let { periodPlanDetails, period_wise, workingDays, plan_name, selected } = this.state;
        let tempObject = {}
        let period_key = { work_day_list: {} }
        plan_name = periodPlanDetails['name']
        periodPlanDetails.period_period_plan.map((field, index) => {
            tempObject = {}
            tempObject['id'] = field['id']
            tempObject['period_plan'] = field['period_plan']
            tempObject['name'] = field['name']
            tempObject['is_break_enable'] = field['is_break']
            tempObject['work_day_list'] = {}
            field.perioddaymapping_period.map((work_day) => {
                period_wise.columns.map((child_work_day) => {
                    if (child_work_day.id === work_day.day) {
                        tempObject['work_day_list'][work_day.day] = {}
                        work_day['isEdited'] = true
                        tempObject['work_day_list'][work_day.day] = _.cloneDeep(work_day)
                    }
                })
            })
            period_wise.new_data.push(tempObject)
        })

        period_wise.new_data.map((period) => {
            period_key['work_day_list'] = {}
            period_wise.columns.map((childWork) => {
                if (childWork.is_student_working_day && !period['work_day_list'][childWork.id]) {
                    period['work_day_list'][childWork.id] = {}
                    period['work_day_list'][childWork.id]['start_time'] = ''
                    period['work_day_list'][childWork.id]['end_time'] = ''
                    period['work_day_list'][childWork.id]['name'] = childWork.name
                    period['work_day_list'][childWork.id]['isEdited'] = true
                }
            })
        })
        selected = []

        periodPlanDetails.standard_list.map((data) => {
            let optionformat = {
                label: data.name,
                value: data.name,
                id: data.id
            }
            selected.push(optionformat)
        })

        this.setState({
            period_wise,
            loading: false,
            workingDays,
            is_period_entered: true,
            plan_name,
            selected,
            year: periodPlanDetails.academic_year,
            loadingPeriod: false

        })
    }

    getWorkingDays = () => {
        let { period_wise, isEdit } = this.state;
        const url = GET_URL.days.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                period_wise.columns = response.data.data
                this.setState({
                    period_wise
                }, () => {
                    if (isEdit) {
                        this.getStandardList()
                    }
                })
            }
        })
    }

    handleViewPeriodButton = () => {
        this.props.history.push(Actions.period_plan.view.url);
    }

    render() {
        const { loading, fieldError, isBreakPeriod, yearList, plan_name, year, standard_list, alertData, blankPage,
            number_of_periods, is_period_entered, period_wise, is_week_wise, yearName, error, loadingPeriod } = this.state;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={6} xs={12} className='header-align'>
                            <Box className='heading'>
                                Period Plan
                            </Box>
                        </Grid>
                        {!blankPage && !loadingPeriod &&
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('period_plan', 'view') && <Button
                                        variant="contained"
                                        onClick={this.handleViewPeriodButton}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.period_plan.view.label}</Button>}
                                </Box>
                            </Grid>
                        }
                    </Grid>
                    <Box className="year-std-box mr-40">
                        <Box className="academic-std-head "> Academic Year</Box>
                        <Box className="aca-std-white-background">{yearName}</Box>
                        <Box className="academic-std-head "> Period Plan</Box>
                        <Box className="aca-std-white-background">{plan_name}</Box>
                    </Box>
                    <Box className="year-std-box mr-40">
                        <Box className="academic-std-head "> Standard(s)</Box>
                        {standard_list.map((standard) => {
                            return <Box display='flex'>
                                <Box className="aca-std-white-background">{standard.name}</Box>
                            </Box>
                        })}
                    </Box>
                    {blankPage &&
                        <Box className='m-t-20px'>
                            <BlankPagewithIcon data='Period plan is not set for selected year' />
                        </Box>
                    }
                    {loadingPeriod && !blankPage &&
                        <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box ><CircularProgress /></Box>
                        </Box>
                    }
                    {!blankPage && !loadingPeriod &&
                        <Paper className='paper-plain-background  p-t-20px m-t-20px p-b-20px'>
                            {is_period_entered && !is_week_wise &&
                                <>
                                    <TableContainer className=' header-align p-t-20px'>
                                        <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell className='add-period-time-table-side-heading'>
                                                        Period Name
                                                    </TableCell>
                                                    {period_wise.columns.map((data, index) => {
                                                        return (
                                                            <>
                                                                {data.is_student_working_day &&
                                                                    <TableCell className='inidividual-period-time-table-cell-heading'>
                                                                        {data.name}
                                                                    </TableCell>
                                                                }
                                                            </>
                                                        )
                                                    })}
                                                    <TableCell className='border-none'>
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {period_wise.new_data.map((parent, index) => {
                                                    return <TableRow>
                                                        <TableCell className={parent.is_break_enable ? 'add-period-time-table-side-heading-hover selected-break-time' : 'add-period-time-table-side-heading-hover'}
                                                        >
                                                            <Box style={{ height: 'inherit' }}>
                                                                <Box className='inidividual-period-view'>
                                                                    {parent.name}
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                        {
                                                            period_wise.columns.map((data) => {
                                                                return (
                                                                    <>
                                                                        {parent.work_day_list[data.id] && data.is_student_working_day && !isBreakPeriod &&
                                                                            <TableCell className={parent.is_break_enable ? 'selected-break-time inidividual-period-time-table-cell' : parent.work_day_list[data.id].is_enable ? 'selected-time-period inidividual-period-time-table-cell' : 'inidividual-period-time-table-cell'}

                                                                            >
                                                                                <Box style={{ height: 'inherit' }} className={fieldError[`start_time${index}${data.id}`] ? 'red-text' : ''}>
                                                                                    <Box className='inidividual-period-view'>
                                                                                        {parent.work_day_list[data.id].start_time && parent.work_day_list[data.id].end_time && `${timeFormat(parent.work_day_list[data.id].start_time, 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(parent.work_day_list[data.id].end_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                                                    </Box>
                                                                                </Box>
                                                                            </TableCell>
                                                                        }
                                                                        {parent.work_day_list[data.id] && data.is_student_working_day && isBreakPeriod &&
                                                                            <TableCell className={parent.is_break_enable ? 'selected-break-time inidividual-period-time-table-cell' : parent.work_day_list[data.id].is_enable ? 'selected-time-period inidividual-period-time-table-cell' : 'inidividual-period-time-table-cell'}>
                                                                                <Box className='inidividual-period-view'>
                                                                                    {parent.work_day_list[data.id].start_time && parent.work_day_list[data.id].end_time && `${timeFormat(parent.work_day_list[data.id].start_time, 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(parent.work_day_list[data.id].end_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                                                </Box>
                                                                            </TableCell>
                                                                        }
                                                                    </>
                                                                )
                                                            })
                                                        }
                                                    </TableRow>
                                                })
                                                }
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            }
                        </Paper >
                    }
                </Paper>
            )
        }
    }
}


export default withRouter(IndividualPeriodView)
