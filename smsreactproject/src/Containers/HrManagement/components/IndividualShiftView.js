import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Paper, Grid, Button, Tooltip, withStyles } from '@material-ui/core'
import Box from '@material-ui/core/Box';
import classNames from "classnames";
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import EditTwoToneIcon from '@material-ui/icons/EditTwoTone';

import loadingBar from 'images/loading.gif'
import { getRequest, } from 'Includes/api/apicall';
import { GET_URL, } from 'Includes/urls';
import { timeFormat, isUserHasPermission } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import { image_formats } from 'Containers/Expenses/Constants';



const Styles = theme => ({

    studentLabel: {
        color: '#00000',
        fontSize: '12px',
        lineHeight: '23px',
        padding: '5px',
        wordBreak: 'break-word',

    },
    studentValue: {
        color: '#00000',
        fontSize: '16px',
        lineHeight: '25px',
        padding: '5px',
        textTransform: 'capitalize',
        wordBreak: 'break-word',

    },
    studentValueEmpty: {
        padding: '5px',
        width: '40px'
    },
    header: {
        padding: '10px 25px',
    },
    innerBorder: {
        width: '2px',
        height: '80%',
        background: '#E4E7EB',
        // marginLeft: 'auto',
        marginRight: '5%',
    },
    displayFlex: {
        display: 'flex',
        padding: '20px 5px'
    },
})


class IndividualShiftView extends Component {

    constructor(props) {
        super(props)

        this.state = {
            shift_details: [],
            largeImagePreview: '',
            loading: true,
            shiftId: '',
            shift_schedules: []
        }
    }


    componentDidMount = () => {
        this.getShiftDetails();
    }

    getShiftDetails = () => {
        if (this.props.location.state) {
            const id = this.props.location.state.detail;
            const url = GET_URL.shift.api + id + '/';
            getRequest(url, {}, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({
                        shiftDetails: response.data.data,
                        pageLoading: false,
                        shiftId: id
                    }, () => {
                        this.updateExpenseView();
                    })
                }
            })
        }
        else {
            this.props.history.push(Actions.manage_shift_types.view.url)
        }
    }

    updateExpenseView = () => {
        let { shiftDetails } = this.state;
        let shift_details = []
        let shift = {
            'sub_heading': '',
            'data': [{ label: 'Shift Name', value: shiftDetails['name'] },
            { label: 'Late attempt per month', value: shiftDetails['late_attempt_per_month'] ? shiftDetails['late_attempt_per_month'] : '' },
            { label: 'deduction_days', value: shiftDetails['deduction_days'] ? shiftDetails['deduction_days'] === 1 ? 'Full Day' : 'Half Day' : '' }

            ]
        };
        shift_details.push(shift);


        let schedule = {}
        shiftDetails.shift_schedules.map((data, index) => {
            let names = []
            data.working_days.map((item, index) => {

                names.push(item['day_name']);
            });
            names = names.join(', ')
            if (shiftDetails.shift_schedules.length === 1 || shiftDetails.shift_schedules.length === 0) {
                schedule = {
                    'sub_heading': `Time set`,
                    'data': []
                }
            }
            else {
                schedule = {
                    'sub_heading': data['second_session_start_time'] ? `Time set ${index + 1}` : `Time set ${index + 1} (Half day)`,
                    'data': []
                }
            }
            if (data['second_session_start_time']) {

                schedule.data.push({ label: 'Session 1 start time', value: timeFormat(data['start_time']) }, { label: 'Session 1 end time', value: timeFormat(data['first_session_end_time']) },
                    { label: 'Session 2 start time', value: timeFormat(data['second_session_start_time']) }, { label: 'Session 2 end time', value: timeFormat(data['end_time']) },
                    { label: 'Minutes to consider as late', value: data['late_buffer_time'] ? data['late_buffer_time'] : '' },
                    { label: 'Minutes to consider as half day', value: data['buffer_time'] ? data['buffer_time'] : '' }, { label: 'Working Days', value: names })
            }
            else {
                schedule.data.push({ label: 'Session 1 start time', value: timeFormat(data['start_time']) }, { label: 'Session 1 end time', value: timeFormat(data['end_time']) },
                    { label: 'Minutes to consider as late', value: data['late_buffer_time'] ? data['late_buffer_time'] : '' },
                    { label: 'Minutes to consider as half day', value: data['buffer_time'] ? data['buffer_time'] : '' }, { label: 'Working Days', value: names })
            }
            shift_details.push(schedule)
        })


        this.setState({
            shift_details,
            loading: false
        })

    }

    handleViewImage = (image) => {
        let file_extension = `${image.slice((Math.max(0, image.lastIndexOf(".")) || Infinity) + 1)}`;
        if (image_formats.includes(file_extension)) {
            this.setState({
                largeImagePreview: image
            })
        }
        else {
            window.open(image);
        }
    }


    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    handleEdit = () => {
        let { shiftId } = this.state;
        this.props.history.push({
            pathname: Actions.manage_shift_types.update.url,
            state: { detail: shiftId }
        })
    }

    render() {
        let { shift_details, loading } = this.state;
        let { classes } = this.props;
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
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                View Details Of Shift Type
                        </Box>
                        </Grid>
                        <Grid item md={4} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('manage_shift_types', 'view') &&
                                    <Button
                                        variant="contained"
                                        component={Link} to={Actions.manage_shift_types.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.manage_shift_types.view.label}</Button>
                                }
                            </Box>
                        </Grid>
                    </Grid>
                    <Paper className='header-align expense-individual-paper-background'>
                        <Grid container className='margin-top-30'>
                            {shift_details.map((headingData, index) => {
                                return (
                                    <Grid item md={12} xs={12} sm={12} key={index} className={classes.displayFlex}>
                                        <Grid container>
                                            <Box className='form-left-heading'>{headingData.sub_heading}</Box>
                                            {headingData.data.map((data, index) => {
                                                return (
                                                    <Grid item md={6} xs={12} sm={12} key={index} className={classes.header}>
                                                        <Box className='dataLabel break-word'>{data.label}</Box>
                                                        {(!data.value && data !== false) && <Box className={classes.studentValueEmpty}><hr /></Box>}
                                                        {(data.value !== "") &&
                                                            <Box className={data.className ? data.className : 'view-expenses-data-value break-word'}>{data.value}</Box>
                                                        }
                                                    </Grid>
                                                )
                                            })
                                            }
                                        </Grid>
                                    </Grid>
                                )
                            })
                            }
                        </Grid>
                        {isUserHasPermission('manage_shift_types', 'edit') &&
                            <Tooltip title='Edit' placement='top-start'>
                                <Box className='expense-individual-view-edit'>
                                    <EditTwoToneIcon onClick={this.handleEdit} className='expense-individual-edit-icon' />
                                </Box>
                            </Tooltip>
                        }
                    </Paper>
                </Paper>
            )
        }
    }
}

export default withRouter(withStyles(Styles)(IndividualShiftView));