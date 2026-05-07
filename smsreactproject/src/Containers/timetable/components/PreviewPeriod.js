import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
    Button, Box, Dialog, Slide, Grid, AppBar, Toolbar, Typography, IconButton, FormControlLabel, Paper, Table, TableCell, TableContainer, TableHead,
    TableBody, TableRow, Switch
} from '@material-ui/core';
import Swal from 'sweetalert2';
import _ from 'lodash';

import CloseIcon from '@material-ui/icons/Close';
import { timeFormat } from 'Includes/functions';

const { forwardRef, useRef, useImperativeHandle } = React;


const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
    appBar: {
        position: 'relative',
        backgroundColor: '#4680FF'
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
    },
}));


const PreviewPeriod = forwardRef((props, ref) => {

    const { workingDays, period_list, selected } = props
    const [open, setOpen] = React.useState(false);
    const [is_week_wise, set_is_week_wise] = React.useState(false);
    const [work_period, set_work_period] = React.useState({});
    const [work_week_days, set_work_week_days] = React.useState({});
    const [period_list_names, set_period_list_names] = React.useState([]);

    const classes = useStyles();
    const handleOpenReview = () => {
        handlePeriodData()
    }

    const handlePeriodData = () => {
        let work_period = {}
        period_list.map((periodList, index) => {
            periodList.periods.map((period) => {
                workingDays.map((childWork, cIndex) => {
                    if (childWork.hasOwnProperty('is_enable') && childWork.is_enable == index && childWork.is_student_working_day) {
                        if (work_period[period.name]) {
                            work_period[period.name][childWork.id] = period
                        }
                        else {
                            work_period[period.name] = { [childWork.id]: period }
                        }
                    }
                })
            })
        })
        set_work_period(work_period)
        setOpen(true)
    }

    const handleWeekDaysData = () => {
        let work_week_days = {}
        let period_list_names = []
        workingDays.map((childWork, cIndex) => {
            period_list.map((periodList, index) => {
                periodList.periods.map((period) => {
                    if (childWork.hasOwnProperty('is_enable') && childWork.is_enable == index && childWork.is_student_working_day) {
                        if (work_week_days[childWork.name]) {
                            work_week_days[childWork.name][period.name] = period
                        }
                        else {
                            work_week_days[childWork.name] = { [period.name]: period }
                        }
                        let found = false
                        period_list_names.map((period_name, pindex) => {
                            if (period_name == period.name) {
                                found = true
                            }
                        })
                        if (!found) {
                            period_list_names.push(period.name)
                        }
                    }
                })
            })
        })
        set_period_list_names(period_list_names)
        set_work_week_days(work_week_days)
    }

    const handleClose = () => {
        setOpen(false)
    }

    useEffect(() => {
        if (is_week_wise) {
            handleWeekDaysData()
        }
    }, [is_week_wise]);
    return (
        <div>
            <Button variant="contained"
                className='previous-but'
                onClick={handleOpenReview}
            >
                Review Period
            </Button>

            <Dialog fullScreen open={open} onClose={handleClose} >
                <AppBar className={classes.appBar} style={{ position: 'fixed' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" className={classes.title}>
                            Review period timing for week
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box className='header-align' display='flex'>
                    <Box className='header-align'>
                        <FormControlLabel
                            className='margin-left-0'
                            control={<Switch checked={is_week_wise}
                                name={is_week_wise}
                                value={is_week_wise}
                                color="primary"
                                onChange={() => set_is_week_wise(!is_week_wise)} />}
                            label={is_week_wise}
                        />
                    </Box>
                    <Box className='header-align display-flex preview-period-plan-standard-name'>
                        {Array.prototype.map.call(selected, function (item) { return item.label }).join(", ")}
                    </Box>
                </Box>
                {!is_week_wise &&
                    <TableContainer className='mark-enter-bg header-align '>
                        <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell> </TableCell>
                                    {workingDays.map((data) => {
                                        return (
                                            <>
                                                {data.is_student_working_day &&
                                                    <TableCell> {data.name}</TableCell>
                                                }
                                            </>
                                        )
                                    })}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(work_period).map((parent, pIndex) => {
                                    return <TableRow>
                                        <TableCell>{parent}</TableCell>
                                        {workingDays.map((data) => {
                                            return (
                                                <>
                                                    {work_period[parent][data.id] && data.is_student_working_day &&
                                                        <TableCell>
                                                            {`${timeFormat(work_period[parent][data.id].start_time, 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(work_period[parent][data.id].end_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                        </TableCell>
                                                    }
                                                    {!work_period[parent][data.id] && data.is_student_working_day &&
                                                        <TableCell> </TableCell>
                                                    }
                                                </>
                                            )
                                        })}
                                    </TableRow>
                                })
                                }
                            </TableBody>
                        </Table>
                    </TableContainer>
                }
                {is_week_wise &&
                    <TableContainer className='mark-enter-bg header-align '>
                        <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell> </TableCell>
                                    {period_list_names.map((data) => {
                                        return (
                                            <>
                                                <TableCell> {data}</TableCell>
                                            </>
                                        )
                                    })}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(work_week_days).map((parent, pIndex) => {
                                    return <TableRow>
                                        <TableCell>{parent}</TableCell>
                                        {period_list_names.map((data) => {
                                            return (
                                                <>
                                                    {work_week_days[parent][data] &&
                                                        <TableCell>
                                                            {`${timeFormat(work_week_days[parent][data]['start_time'], 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(work_week_days[parent][data]['end_time'], 'hh:mm:ss', 'hh:mm A')} `}
                                                        </TableCell>
                                                    }
                                                    {!work_week_days[parent][data] &&
                                                        <TableCell> </TableCell>
                                                    }
                                                </>
                                            )
                                        })}
                                    </TableRow>
                                })
                                }
                            </TableBody>
                        </Table>
                    </TableContainer>
                }
            </Dialog>
        </div>
    );

});

export default PreviewPeriod