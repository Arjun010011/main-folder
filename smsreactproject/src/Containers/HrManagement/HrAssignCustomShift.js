import React, { Component } from 'react'
import {
    Paper, Box, CircularProgress, Grid, Button, TextField,
    Checkbox, List, ListItem, ListItemIcon, ListItemText, InputAdornment, Typography
} from '@material-ui/core';
import Swal from 'sweetalert2'
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import classNames from 'classnames'
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import SearchIcon from '@material-ui/icons/Search';
import InfiniteScroll from 'react-infinite-scroller'

import { Link, withRouter } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import loadingBar from 'images/loading.gif'
import { Actions } from 'Constants/permissions';
import { minDate, maxDate } from 'Constants';
import { dateFormat } from 'Includes/functions';
import './styles.scss'

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class HrAssignCustomShift extends Component {
    fetchLock = false

    state = {
        loading: true,
        tableLoading: false,
        fromDate: null,
        toDate: null,
        errors: {},
        staffList: [],
        totalStaffCount: 0,
        selectedStaff: {},
        allSelected: false,
        selectAllLoading: false,
        staffPageNo: 1,
        staffHasMore: true,
        staffSearch: '',
        isFetchingMore: false,
        submitDisable: false,
        customTimeStart: '',
        customTimeEnd: '',
        customBufferTime: '',
        customLateBufferTime: '',
        open: false,
        alertData: '',
    }

    componentDidMount = () => {
        this.loadStaff(true)
    }

    loadStaff = (isInitial = false) => {
        if (isInitial) {
            this.setState({ loading: true, staffList: [], staffPageNo: 1, staffHasMore: true })
        } else {
            this.setState({ tableLoading: true, staffList: [], staffPageNo: 1, staffHasMore: true })
        }
        const { staffSearch } = this.state
        const params = { is_active: true, limit: 10, pageno: 1, pagination: true }
        if (staffSearch) {
            params.search = staffSearch
        }
        getRequest(GET_URL.staff.api, params, this.props).then(response => {
            if (response && response.status === 200) {
                const resData = response.data || {}
                const list = resData.data || []
                this.setState({
                    staffList: Array.isArray(list) ? list : [],
                    totalStaffCount: resData.count || (Array.isArray(list) ? list.length : 0),
                    staffHasMore: !!resData.next_page,
                    staffPageNo: 1,
                    loading: false,
                    tableLoading: false,
                    allSelected: false,
                    selectedStaff: {},
                })
            } else {
                this.setState({ loading: false, tableLoading: false })
            }
        })
    }

    loadMoreStaff = () => {
        const { staffHasMore, isFetchingMore, staffPageNo, staffSearch } = this.state
        if (!staffHasMore || isFetchingMore || this.fetchLock) return

        this.fetchLock = true
        const nextPage = staffPageNo + 1
        this.setState({ isFetchingMore: true })

        const params = { is_active: true, limit: 10, pageno: nextPage, pagination: true }
        if (staffSearch) {
            params.search = staffSearch
        }
        getRequest(GET_URL.staff.api, params, this.props).then(response => {
            this.fetchLock = false
            if (response && response.status === 200) {
                const resData = response.data || {}
                const newList = resData.data || []

                if (!newList.length) {
                    this.setState({ isFetchingMore: false, staffHasMore: false })
                    return
                }

                this.setState(prev => ({
                    staffList: [...prev.staffList, ...newList],
                    staffPageNo: nextPage,
                    staffHasMore: !!resData.next_page,
                    isFetchingMore: false,
                }))
            } else {
                this.fetchLock = false
                this.setState({ isFetchingMore: false, staffHasMore: false })
            }
        }).catch(() => {
            this.fetchLock = false
            this.setState({ isFetchingMore: false, staffHasMore: false })
        })
    }

    onSearchChange = (e) => {
        this.setState({ staffSearch: e.target.value })
    }

    onSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            this.loadStaff()
        }
    }

    toggleStaffSelection = (staff) => {
        this.setState(prev => {
            const selected = { ...prev.selectedStaff }
            if (selected[staff.id]) {
                delete selected[staff.id]
            } else {
                selected[staff.id] = staff
            }
            const errors = { ...prev.errors }
            delete errors['staffNotSelected']
            return { selectedStaff: selected, errors, open: false }
        })
    }

    toggleSelectAll = () => {
        const { allSelected, staffSearch } = this.state
        if (allSelected) {
            // Deselect all
            this.setState({ selectedStaff: {}, allSelected: false })
        } else {
            // Fetch ALL staff (no pagination) and select them
            this.setState({ selectAllLoading: true })
            const params = { is_active: true }
            if (staffSearch) {
                params.search = staffSearch
            }
            getRequest(GET_URL.staff.api, params, this.props).then(response => {
                if (response && response.status === 200) {
                    const allStaff = response.data.data || []
                    const selected = {}
                    allStaff.forEach(s => { selected[s.id] = s })
                    this.setState({
                        selectedStaff: selected,
                        allSelected: true,
                        selectAllLoading: false,
                    })
                } else {
                    this.setState({ selectAllLoading: false })
                }
            }).catch(() => this.setState({ selectAllLoading: false }))
        }
    }

    onChangeCustomTime = (e) => {
        const { name, value } = e.target
        let { errors } = this.state
        delete errors[name]
        this.setState({ [name]: value, errors })
    }

    onChangeBufferTime = (e) => {
        const { name, value } = e.target
        let { errors } = this.state
        if (value === '' || /^\d+$/.test(value)) {
            delete errors[name]
            this.setState({ [name]: value, errors })
        }
    }

    onChangeDates = (e, date_name) => {
        let { errors } = this.state
        delete errors[date_name]
        this.setState({ [date_name]: e, errors })
    }

    formatTimeForApi = (timeValue) => {
        if (!timeValue) return null
        return `${timeValue}:00`
    }

    submit = async () => {
        let {
            selectedStaff, fromDate, toDate, errors,
            customTimeStart, customTimeEnd,
            customBufferTime, customLateBufferTime
        } = this.state;
        this.validate(errors)
        if ((Object.keys(errors).length === 0)) {
            this.setState({ submitDisable: true })
            let from = dateFormat(fromDate, 'YYYY-MM-DD')
            let to = dateFormat(toDate, 'YYYY-MM-DD')
            let ids = Object.keys(selectedStaff).map(id => parseInt(id))

            let postData = {
                "fromdate": from,
                "todate": to,
                'staffids': ids,
                'priority': 10,
                'custom_time_start': this.formatTimeForApi(customTimeStart),
                'custom_time_end': this.formatTimeForApi(customTimeEnd),
            }
            if (customBufferTime !== '') {
                postData['custom_buffer_time'] = parseInt(customBufferTime)
            }
            if (customLateBufferTime !== '') {
                postData['custom_late_buffer_time'] = parseInt(customLateBufferTime)
            }

            let url = POST_URL.assignshift.api
            postRequest(url, postData, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.assign_custom_shift.view.url);
                }
                this.setState({ submitDisable: false })
            })
        }
        else {
            this.setState({ errors })
        }
    }

    validate = (errors) => {
        const { fromDate, toDate, selectedStaff, customTimeStart, customTimeEnd, customBufferTime, customLateBufferTime } = this.state
        if (!fromDate) {
            errors['fromDate'] = 'Select From Date'
        }
        if (!toDate) {
            errors['toDate'] = 'Select To Date'
        }
        if (!customTimeStart || customTimeStart === '') {
            errors['customTimeStart'] = 'Custom Start Time is required'
        }
        if (!customTimeEnd || customTimeEnd === '') {
            errors['customTimeEnd'] = 'Custom End Time is required'
        }
        if (customBufferTime && customLateBufferTime) {
            if (parseInt(customLateBufferTime) >= parseInt(customBufferTime)) {
                errors['customLateBufferTime'] = 'Late buffer should be less than buffer time'
            }
        }
        if (Object.keys(selectedStaff).length === 0) {
            errors['staffNotSelected'] = 'Staff not selected'
            this.setState({
                open: true,
                alertData: 'Select at least One Staff'
            })
        }
    }

    handleClose = () => {
        this.setState({ open: false })
    }

    render() {
        const {
            loading, alertData, open, staffList, selectedStaff, staffSearch,
            errors, fromDate, toDate, isFetchingMore, staffHasMore,
            customTimeStart, customTimeEnd,
            customBufferTime, customLateBufferTime,
            totalStaffCount, allSelected, selectAllLoading, tableLoading
        } = this.state

        const selectedCount = Object.keys(selectedStaff).length

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Assign Custom / Temporary Shift
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    <Button
                                        variant='contained'
                                        component={Link} to={Actions.assign_custom_shift.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.assign_custom_shift.view.label}</Button>
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className='staff-list-assigned-shift'>Note : This page is for assigning temporary / event-specific shifts with custom timings. Single-day assignments are allowed.</Box>
                        <Grid container spacing={3}>
                            <Grid item md={8} xs={12}>
                                <Paper className='paper-plain-background header-align'>
                                    <Grid item container spacing={2}>
                                        <Grid item md={5} xs={12} className='margin-top-30'>
                                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                <KeyboardDatePicker
                                                    autoOk
                                                    variant='inline'
                                                    inputVariant='outlined'
                                                    label='From Date'
                                                    fullWidth
                                                    name='fromDate'
                                                    minDate={minDate}
                                                    maxDate={Boolean(toDate) ? toDate : maxDate}
                                                    InputLabelProps={{ shrink: fromDate ? true : false }}
                                                    format='dd-MM-yyyy'
                                                    value={fromDate}
                                                    onChange={(e) => this.onChangeDates(e, 'fromDate')}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                    helperText={errors.fromDate || 'Valid Format DD-MM-YYYY'}
                                                    error={Boolean(errors.fromDate)}
                                                />
                                            </MuiPickersUtilsProvider>
                                        </Grid>
                                        <Grid item md={5} xs={12} className='margin-top-30'>
                                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                <KeyboardDatePicker
                                                    autoOk
                                                    variant='inline'
                                                    inputVariant='outlined'
                                                    label='To Date'
                                                    fullWidth
                                                    name='toDate'
                                                    minDate={fromDate || minDate}
                                                    maxDate={maxDate}
                                                    format='dd-MM-yyyy'
                                                    value={toDate}
                                                    disabled={!fromDate}
                                                    InputLabelProps={{ shrink: toDate ? true : false }}
                                                    onChange={(e) => this.onChangeDates(e, 'toDate')}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                    helperText={errors.toDate || 'Valid Format DD-MM-YYYY'}
                                                    error={Boolean(errors.toDate)}
                                                />
                                            </MuiPickersUtilsProvider>
                                        </Grid>
                                    </Grid>

                                    {/* Staff List with InfiniteScroll */}
                                    <Box style={{ marginTop: 16 }}>
                                        <TextField
                                            fullWidth
                                            variant='outlined'
                                            size='small'
                                            placeholder='Search staff by name...'
                                            value={staffSearch}
                                            onChange={this.onSearchChange}
                                            onKeyPress={this.onSearchKeyPress}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position='end'>
                                                        <SearchIcon
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => this.loadStaff()}
                                                        />
                                                    </InputAdornment>
                                                )
                                            }}
                                        />
                                    </Box>

                                    {/* Select All + Count */}
                                    <Box display='flex' alignItems='center' justifyContent='space-between'
                                        style={{ padding: '8px 16px', borderBottom: '1px solid #e0e0e0', marginTop: 8 }}>
                                        <Box display='flex' alignItems='center'>
                                            <Checkbox
                                                checked={allSelected}
                                                indeterminate={selectedCount > 0 && !allSelected}
                                                onChange={this.toggleSelectAll}
                                                color='primary'
                                                disabled={selectAllLoading}
                                            />
                                            {selectAllLoading ? (
                                                <Box display='flex' alignItems='center'>
                                                    <CircularProgress size={16} style={{ marginRight: 8 }} />
                                                    <Typography variant='body2'>Loading all staff...</Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant='body2' style={{ fontWeight: 500 }}>
                                                    Select All ({totalStaffCount})
                                                </Typography>
                                            )}
                                        </Box>
                                        {selectedCount > 0 && (
                                            <Typography variant='body2' color='primary' style={{ fontWeight: 600 }}>
                                                {selectedCount} selected
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Scrollable Staff List */}
                                    <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}>
                                        {tableLoading ? (
                                            <Box display='flex' justifyContent='center' alignItems='center' style={{ minHeight: 200 }}>
                                                <CircularProgress />
                                            </Box>
                                        ) : (
                                            <InfiniteScroll
                                                pageStart={0}
                                                loadMore={this.loadMoreStaff}
                                                hasMore={staffHasMore && !isFetchingMore}
                                                useWindow={false}
                                                threshold={100}
                                            >
                                                <List dense disablePadding>
                                                    {staffList.map((staff) => (
                                                        <ListItem
                                                            key={staff.id}
                                                            button
                                                            onClick={() => this.toggleStaffSelection(staff)}
                                                            style={{
                                                                backgroundColor: selectedStaff[staff.id] ? '#e3f2fd' : 'transparent',
                                                                borderBottom: '1px solid #f5f5f5'
                                                            }}
                                                        >
                                                            <ListItemIcon style={{ minWidth: 36 }}>
                                                                <Checkbox
                                                                    checked={!!selectedStaff[staff.id]}
                                                                    color='primary'
                                                                    disableRipple
                                                                />
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary={staff.full_name}
                                                                secondary={staff.mobile_num || ''}
                                                            />
                                                        </ListItem>
                                                    ))}
                                                </List>
                                                {isFetchingMore && (
                                                    <Box display='flex' justifyContent='center' py={2}>
                                                        <CircularProgress size={24} />
                                                    </Box>
                                                )}
                                            </InfiniteScroll>
                                        )}
                                    </div>
                                </Paper>
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <Paper className='paper-plain-background header-align staff-assigned-shift-paper p-b-20px'>

                                    {/* Custom Time Start */}
                                    <Grid item md={12} xs={12} className='p-t-20px'>
                                        <TextField
                                            variant='outlined'
                                            label='Custom Start Time *'
                                            fullWidth
                                            type='time'
                                            name='customTimeStart'
                                            value={customTimeStart}
                                            onChange={this.onChangeCustomTime}
                                            InputLabelProps={{ shrink: true }}
                                            helperText={errors.customTimeStart || 'Event start time (24h format)'}
                                            error={Boolean(errors.customTimeStart)}
                                        />
                                    </Grid>

                                    {/* Custom Time End */}
                                    <Grid item md={12} xs={12} className='p-t-20px'>
                                        <TextField
                                            variant='outlined'
                                            label='Custom End Time *'
                                            fullWidth
                                            type='time'
                                            name='customTimeEnd'
                                            value={customTimeEnd}
                                            onChange={this.onChangeCustomTime}
                                            InputLabelProps={{ shrink: true }}
                                            helperText={errors.customTimeEnd || 'Event end time (24h format)'}
                                            error={Boolean(errors.customTimeEnd)}
                                        />
                                    </Grid>

                                    {/* Custom Buffer Time */}
                                    <Grid item md={12} xs={12} className='p-t-20px'>
                                        <TextField
                                            variant='outlined'
                                            label='Buffer Time (minutes)'
                                            fullWidth
                                            name='customBufferTime'
                                            value={customBufferTime}
                                            onChange={this.onChangeBufferTime}
                                            helperText={errors.customBufferTime || 'Optional: Buffer time in minutes'}
                                            error={Boolean(errors.customBufferTime)}
                                            type='number'
                                            inputProps={{ min: 0 }}
                                        />
                                    </Grid>

                                    {/* Custom Late Buffer Time */}
                                    <Grid item md={12} xs={12} className='p-t-20px'>
                                        <TextField
                                            variant='outlined'
                                            label='Late Buffer Time (minutes)'
                                            fullWidth
                                            name='customLateBufferTime'
                                            value={customLateBufferTime}
                                            onChange={this.onChangeBufferTime}
                                            helperText={errors.customLateBufferTime || 'Optional: Must be less than buffer time'}
                                            error={Boolean(errors.customLateBufferTime)}
                                            type='number'
                                            inputProps={{ min: 0 }}
                                        />
                                    </Grid>

                                    <Box className='staff-assigned-shift-table'>
                                        <Box className='staff-list-assigned-shift'>
                                            Staff selected for custom shift ({selectedCount})
                                        </Box>
                                        {Object.values(selectedStaff).map((staff) => (
                                            <Box key={staff.id}>
                                                <Box className='selected-assigned-staff'>
                                                    {staff.full_name}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                    <Box className='assign-shift-submit-position'>
                                        <Button variant="contained"
                                            className='submit'
                                            onClick={this.submit}
                                            disabled={this.state.submitDisable}
                                        >
                                            Assign Custom Shift
                                        </Button>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>

                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Box>
            )
        }
    }
}

export default withRouter(HrAssignCustomShift)
