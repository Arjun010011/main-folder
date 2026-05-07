import React, { Component } from 'react';
import get from '../../Components/actions/API_request/Get';
import classNames from 'classnames';
import {
    Paper, Box, Typography, Grid,
    MenuItem,
    Select, InputLabel, FormControl, Button,
    FormHelperText, TableContainer, Table,
} from '@material-ui/core';
import backgroundSchoolView from 'images/backgroundSchoolView.png';
import moment from 'moment';
import Tooltip from '@material-ui/core/Tooltip';
import { withStyles } from '@material-ui/core/styles';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { withRouter } from 'react-router-dom';
import { getUrlParam, isUserHasPermission } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import { Link } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';

const Styles = theme => ({
    container: {
        minHeight: '90vh',
        padding: '1rem',
        background: 'rgb(245, 246, 248)',
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url(${backgroundSchoolView})`,
        backgroundSize: '105%',
        marginBottom: '40px'
    },
    paperTitle: {
        fontWeight: '500',
        fontSize: '1.7rem',
    },
    paperCaption: {
        color: '#bdbdbd',
    },
    daysHolder: {
        display: 'flex',
        marginTop: '25px',
    },
    timetableHolder: {
        paddingBottom: '30px'
    },
    timetableElement: {
        background: '#1665D8',
        width: '188px',
        maxWidth: '188px',
        minWidth: '188px',
        padding: '0.75rem',
        color: '#FFFFFF',
        textAlign: 'center',
        fontSize: '20px',
        marginRight: '2rem',
    },
    periodsHolder: {
        display: 'flex',
        marginTop: '10px',
    },
    periodTimingHolder: {
        width: '188px',
        maxWidth: '188px',
        minWidth: '188px',
        padding: '0.75rem',
        textAlign: 'center',
        fontSize: '16px',
        marginRight: '2rem',
        marginTop: 'auto',
        marginBottom: 'auto',
    },
    periodSubjectElements: {
        width: '188px',
        maxWidth: '188px',
        minWidth: '188px',
        padding: '0.75rem',
        textAlign: 'center',
        fontSize: '20px',
        marginRight: '2rem',
        background: 'white',
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.15)',
    }
});


class ViewTimetable extends Component {

    constructor(props) {
        super(props);
        this.state = {
            days: [],
            timetableData: [],
            timetableDataForDisplay: {},
        }
    }

    componentDidMount = async () => {
        let currentSelectedList = getUrlParam();
        let daysData = [];
        let days = [];
        await getRequest(GET_URL.days.api).then((response) => {
            if (response && response.status === 200) {
                daysData = response.data.data;
            }
            days = daysData.map((record) => {
                let day = {};
                day['id'] = record.id;
                day['name'] = record.name;
                return day;
            });
        })
        // Get available periods if present
        let periodParams = {
            date_range: currentSelectedList.timetable_id,
        }
        let periods = await getRequest(GET_URL.periods.api, periodParams);
        let periodList = periods.data.data.map((record) => {
            let period = {};
            period['id'] = record.id;
            period['name'] = record.name;
            period['start_time'] = record.start_time;
            period['end_time'] = record.end_time;
            period['is_selected'] = false;
            return period;
        });

        // Get timetable data if already present
        let timetableParams = {
            date_range: currentSelectedList.timetable_id,
            standard_section: currentSelectedList.standard_section_id,
        }
        let timetableResp = await getRequest(GET_URL.assigntimetable.api, timetableParams);
        let timetableDataForDisplay = {};

        for (let i = 0; i < days.length; i++) {
            for (let j = 0; j < timetableResp.data.data.length; j++) {
                if (days[i].id == timetableResp.data.data[j].day) {
                    let tempObj = {};
                    tempObj['period_name'] = timetableResp.data.data[j].period_name;
                    tempObj['start_time'] = timetableResp.data.data[j].period_start_time;
                    tempObj['end_time'] = timetableResp.data.data[j].period_end_time;
                    tempObj['subject_name'] = timetableResp.data.data[j].subject_name;
                    tempObj['teacher_name'] = timetableResp.data.data[j].full_name;
                    let key = `${moment(tempObj.start_time, "hh:mm a").format("hh:mm a")} - ${moment(tempObj.end_time, "hh:mm a").format("hh:mm a")} // ${tempObj.period_name}`
                    timetableDataForDisplay[key] = [];
                    timetableDataForDisplay[key].push(tempObj);
                }
            }
        }

        this.setState({ days, timetableData: timetableResp.data.data, timetableDataForDisplay });
    }


    render() {

        let { days, timetableDataForDisplay } = this.state;
        let { classes } = this.props;

        return (

            <Paper className='paper-background'>
                <Box>
                    <Grid container >
                        <Grid item md={6} xs={12} sm={12} >
                            <Grid item md={6} xs={12} sm={12} className='header-align'>
                                <Box className='heading'>
                                    View Time Table
                                </Box>
                                <Box className='sub-heading'>
                                    Here you can view the timetable for respective Standards
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('timetable_view', 'create') && <Button
                                    variant="contained"
                                    component={Link} to={Actions.assign_timetable.view.url}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' />
                                    {Actions.timetable_view.view.label}
                                </Button>}
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
                <Box className={classes.timetableHolder} overflow={'auto'}>
                    <div className={classes.daysHolder}>
                        <div className={classes.timetableElement} id={'initial-offset'} style={{ 'background': 'transparent' }}>
                        </div>
                        {
                            days && days.length ? (
                                days.map((day) => {
                                    return (
                                        <div className={classes.timetableElement} id={day.id}>
                                            {day.name}
                                        </div>
                                    )
                                })
                            ) : []
                        }
                    </div>
                    {
                        Object.keys(timetableDataForDisplay).length !== 0 ? (
                            Object.keys(timetableDataForDisplay).map((key, index) => {
                                let elements = [];
                                elements.push(<div className={classes.periodTimingHolder} id={key}>
                                    <Typography variant="subtitle2" gutterBottom>{key.split('//')[1]}</Typography>
                                    <Typography variant="subtitle2" gutterBottom>{key.split('//')[0]}</Typography>
                                </div>);
                                timetableDataForDisplay[key].map(period => {
                                    elements.push(
                                        <div className={classes.periodSubjectElements} id={period.subject_name}>
                                            <Tooltip title={period.subject_name} aria-label="text"><Typography variant="subtitle2" gutterBottom style={{ "padding": "5px", "text-align": "left", "background": "#E2FBEC", "color": "#18A453", "border-radius": "3px", 'max-width': '9rem', 'width': '9rem', 'text-overflow': 'ellipsis', 'padding-left': '12px', 'overflow': 'hidden', 'white-space': 'nowrap' }}>
                                                {period.subject_name}
                                            </Typography></Tooltip>
                                            <Tooltip title={period.teacher_name} aria-label="text"><Typography variant="subtitle2" gutterBottom style={{ "padding": "5px", "text-align": "left", "background": "#FDE6E6", "color": "#EB0000", "border-radius": "3px", 'max-width': '9rem', 'width': '9rem', 'text-overflow': 'ellipsis', 'margin-top': '10px', 'padding-left': '12px', 'overflow': 'hidden', 'white-space': 'nowrap' }}>
                                                {period.teacher_name}
                                            </Typography></Tooltip>
                                        </div>
                                    )
                                });
                                return <div className={classes.periodsHolder}>{elements}</div>
                            })
                        ) : []
                    }
                </Box>
            </Paper>
        )
    }
}

export default withRouter(withStyles(Styles)(ViewTimetable));