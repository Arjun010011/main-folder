import React, { useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import {
    Button, Box, Dialog, Slide, Tooltip, AppBar, Toolbar, Typography, IconButton,
    Paper, Table, TableCell, TableContainer, TableHead, TableBody, TableRow, CircularProgress
} from '@material-ui/core';
import { timeFormat } from 'Includes/functions';
import Snackbar from '@material-ui/core/Snackbar';
import CloseIcon from '@material-ui/icons/Close';

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { Alert } from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';

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

const StaffTimeTableView = forwardRef((props, ref) => {


    const { week_day_list, staffTimeTable, selectedStaff, staffTimeTableLoading } = props;
    const [open, setOpen] = React.useState(false);
    const [fieldError, setFieldError] = React.useState({});
    const [openSnackBar, setOpenSnackBar] = React.useState(false);

    const [errorContent, setErrorContent] = React.useState('');
    const [timing_map, set_timing_map] = React.useState('');
    const [day_timing_map, set_day_timing_map] = React.useState({});



    const classes = useStyles();

    const handleClose = () => {
        setOpen(false)
    }

    const handleCloseSnackBar = () => {
        setOpenSnackBar(false)
    }


    useImperativeHandle(ref, () => ({
        handleOpenDialog() {
            setOpen(true)
        },
        handleOpen() {
            let timing_map = {}
            let day_timing_map = {}
            staffTimeTable.staffData.map((staff) => {
                staff.day_list.map((day) => {
                    timing_map[`${day.period_start_time}-${day.period_end_time}`] = day
                    day_timing_map[`${day.period_start_time}-${day.period_end_time}-${day.day}`] = day
                })
            })
            timing_map = Object.entries(timing_map).sort().reduce((o, [k, v]) => (o[k] = v, o), {})
            set_timing_map(timing_map)
            set_day_timing_map(day_timing_map)
            setOpen(true)
        }
    }))

    return (
        <div>
            <Dialog fullScreen open={open} onClose={handleClose} >
                <AppBar className={classes.appBar} style={{ position: 'fixed' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" className={classes.title}>

                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box className='student-route-table-popup margin-top'>
                    {staffTimeTableLoading ?
                        <LoadingGif />
                        :
                        <Box className='paper-plain-background  p-t-20px m-t-20px p-b-20px p-l-10px'>
                            <Box className='heading'>
                                {selectedStaff && `${selectedStaff.staff_name} Time Table`}
                            </Box>
                            {staffTimeTable.staffData.length === 0 ?
                                <BlankPagewithIcon data="Staff is not assigned any time table" />
                                :
                                <TableContainer className=' header-align p-t-20px'>
                                    <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell className='add-period-time-table-side-heading'>
                                                </TableCell>
                                                {week_day_list.map((data, index) => {
                                                    return (
                                                        <>
                                                            {data.is_student_working_day &&
                                                                <TableCell className='add-period-time-table-cell-heading'>
                                                                    {data.name}
                                                                </TableCell>
                                                            }
                                                        </>
                                                    )
                                                })}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {Object.keys(timing_map).map((timing) => {
                                                return <TableRow>
                                                    <TableCell className={'add-period-time-table-side-heading'}>
                                                        {`${timeFormat(timing_map[timing].period_start_time, 'hh:mm:ss', 'hh:mm A')}`}
                                                    </TableCell>
                                                    {
                                                        week_day_list.map((weekDay) => {
                                                            return (day_timing_map.hasOwnProperty(`${timing_map[timing]['period_start_time']}-${timing_map[timing]['period_end_time']}-${weekDay.id}`)) ?
                                                                <TableCell className={'staff-view-time-table-cell'}>
                                                                    <Box style={{ height: 'inherit' }} >
                                                                        <Box className={'create-time-table-time-check'}>
                                                                            <Box className='time-table-timing-box'>
                                                                                {`${timeFormat(day_timing_map[`${timing_map[timing]['period_start_time']}-${timing_map[timing]['period_end_time']}-${weekDay.id}`]['period_start_time'], 'hh:mm:ss', 'hh:mm A')} - ${timeFormat(day_timing_map[`${timing_map[timing]['period_start_time']}-${timing_map[timing]['period_end_time']}-${weekDay.id}`]['period_end_time'], 'hh:mm:ss', 'hh:mm A')}`}
                                                                            </Box>
                                                                        </Box>
                                                                        <Box className='create-time-table-subject-label'>
                                                                            {`${day_timing_map[`${timing_map[timing]['period_start_time']}-${timing_map[timing]['period_end_time']}-${weekDay.id}`]['standard_name']} (${day_timing_map[`${timing_map[timing]['period_start_time']}-${timing_map[timing]['period_end_time']}-${weekDay.id}`]['section_name']})`}
                                                                        </Box>
                                                                        <Box className='create-time-table-staff-label'>
                                                                            {day_timing_map[`${timing_map[timing]['period_start_time']}-${timing_map[timing]['period_end_time']}-${weekDay.id}`]['subject_name']}
                                                                        </Box>
                                                                    </Box>
                                                                </TableCell> :
                                                                <TableCell className={'staff-view-time-table-cell'}>

                                                                </TableCell>
                                                        })
                                                    }
                                                </TableRow>
                                            })
                                            }
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            }
                        </Box >
                    }
                </Box>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={2000} onClose={handleCloseSnackBar}>
                    <Alert onClose={handleCloseSnackBar} severity="error">
                        {errorContent}
                    </Alert>
                </Snackbar>
            </Dialog>
        </div>
    );
});


export default StaffTimeTableView
