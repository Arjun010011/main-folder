import React, { Component } from 'react'
import {
    Grid, FormControl, CircularProgress, InputLabel, MenuItem, Select, ListItemText, Checkbox, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle, Box, Button, TextareaAutosize, FormHelperText}
    from '@material-ui/core';
import originalMoment from "moment";
import { extendMoment } from "moment-range";
import Swal from 'sweetalert2'
import { getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls'
import { LEAVEOPTIONS } from 'Constants';
import LeaveTable from 'Containers/LeaveManagement/components/LeaveTable';

const moment = extendMoment(originalMoment);
const months = moment.monthsShort()
const monthsFullName = moment.months()


class CancelLeave extends Component {
    constructor(props) {
        super(props)

        this.state = {
            staff: [],
            months: months,
            fromArray: [],
            reason: '',
            errors: {},
            reasonOpen: false,
            cancelDisable: false,
            cancelId: '',
            loading: false,
            columns: [
                {
                    name: "leave_type_name",
                    label: "Leave Type",
                    options: {
                        filter: true,
                        sort: false,
                        search: true,
                    }
                },
                {
                    name: "fromdate",
                    label: "From",
                    options: {
                        filter: true,
                        filterType: 'custom',
                        // customFilterListOptions: { render: v => `From Month - ${v}` },
                        filterOptions: {
                            logic: (fromdate, filters, tableMeta) => {
                                if (filters.length) {
                                    let monthIndex = fromdate.split("-")[1].replace(/^0+/, '');
                                    let monthname = monthsFullName[parseInt(monthIndex) - 1];
                                    if (filters.indexOf(monthname) !== -1) {
                                        const show =
                                            (filters && fromdate) ||
                                            (filters && fromdate) ||
                                            (filters && fromdate);
                                        return !show;
                                    } else {
                                        return true;
                                    }
                                } else {
                                    return false;
                                }
                            },
                            display: (filterList, onChange, index, column) => {
                                const optionValues = monthsFullName;
                                return (
                                    <FormControl size='small'>
                                        <InputLabel htmlFor='select-multiple-chip'>
                                            From Months
                                        </InputLabel>
                                        <Select
                                            size='small'
                                            multiple
                                            value={filterList[index]}
                                            renderValue={selected => selected.join(`,  `)}
                                            onChange={event => {
                                                filterList[index] = event.target.value;
                                                onChange(
                                                    filterList[index],
                                                    index,
                                                    column,

                                                );
                                            }}
                                        >
                                            {optionValues.map(item => (
                                                <MenuItem key={item} value={item} size='small'>
                                                    <Checkbox
                                                        color='primary'
                                                        size='small'
                                                        checked={filterList[index].indexOf(item) > -1}
                                                    />
                                                    <ListItemText primary={item} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                );
                            }
                        },
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {this.dateFormat(value)}
                            </div>
                            );
                        }
                    }
                },
                {
                    name: "todate",
                    label: "To",
                    options: {
                        filter: true,
                        filterType: 'custom',
                        // customFilterListOptions: { render: v => `To Month - ${v}` },
                        filterOptions: {
                            logic: (todate, filters, tableMeta) => {
                                if (filters.length) {
                                    let monthIndex = todate.split("-")[1].replace(/^0+/, '');
                                    let monthname = monthsFullName[parseInt(monthIndex) - 1];
                                    if (filters.indexOf(monthname) !== -1) {
                                        const show =
                                            (filters && todate);
                                        return !show;
                                    } else {
                                        return true;
                                    }
                                } else {
                                    return false;
                                }
                            },
                            display: (filterList, onChange, index, column) => {
                                const optionValues = monthsFullName;
                                return (
                                    <FormControl>
                                        <InputLabel htmlFor='select-multiple-chip'>
                                            To Months
                                        </InputLabel>
                                        <Select
                                            multiple
                                            value={filterList[index]}
                                            renderValue={selected => selected.join(`,  `)}
                                            onChange={event => {
                                                filterList[index] = event.target.value;
                                                onChange(
                                                    filterList[index],
                                                    index,
                                                    column,

                                                );
                                            }}
                                        >
                                            {optionValues.map(item => (
                                                <MenuItem key={item} value={item}>
                                                    <Checkbox
                                                        color='primary'
                                                        checked={filterList[index].indexOf(item) > -1}
                                                    />
                                                    <ListItemText primary={item} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                );
                            }
                        },
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {this.dateFormat(value)}
                            </div>
                            );
                        }
                    }
                },
                {
                    name: "approval_status",
                    label: "Status",
                    options: {
                        filter: true,
                        sort: false,
                        search: true,
                        // customFilterListRender: v => {
                        //     alert(v)
                        //     return v;
                        // },
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box display='flex'>
                                    <Box>
                                        {value === 'NotApproved' &&
                                            <Box color='#FFC700'>Pending</Box>
                                        }
                                        {value === 'Approved' &&
                                            <Box color='#18A453'>Approved</Box>
                                        }
                                        {value === 'Rejected' &&
                                            <Box color='#FF0000'>Rejected</Box>
                                        }
                                        {value === 'Canceled' &&
                                            <Box color='#FF0000'>Cancelled</Box>
                                        }
                                    </Box>
                                    <Box>
                                        <Button
                                            className='cancel-leave-cancel-button'
                                            onClick={e => this.cancelLeavePopPup(e, tableMeta.rowData[4])}>Cancel</Button>
                                    </Box>
                                </Box>

                            )
                        }
                    }
                },
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    }
                },
            ]
        }
    }
    async componentDidMount() {
        this.setState({ loading: true })
        const url = GET_URL.applyleave.api
        let params = { approval_status: 'NotApproved' }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staff: response.data.data,
                    options: LEAVEOPTIONS,
                    loading: false,
                })
            }
        })
    }
    dateFormat = (date) => {
        let DateTemp = []
        DateTemp = date.split('-')
        DateTemp.reverse();
        DateTemp[1] = this.state.months[DateTemp[1].replace(/^0+/, '') - 1]
        DateTemp.splice(1, 0, '-')
        DateTemp.splice(3, 0, '-')
        return DateTemp
    }
    cancelLeavePopPup = (e, id) => {
        this.setState({
            reasonOpen: true,
            cancelId: id
        })
    }
    cancelLeaves = async () => {
        let { errors, reason, cancelId } = this.state;
        errors = {}
        this.validate(errors)
        if ((Object.keys(errors).length === 0)) {
            this.setState({ cancelDisable: true })
            let payload = {
                approval_status: 'Canceled',
                cancel_reject_reason: reason
            }
            const url = PUT_URL.applyleave.api + cancelId + '/'
            putRequest(url, payload, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.leaveSummary()
                }
                this.setState({ cancelDisable: false })
                this.handleClose();
            })
        }
        else {
            this.setState({
                errors
            })
        }
    }

    validate = (errors) => {
        let { reason } = this.state
        if (!reason) {
            errors['reason'] = "Please Enter Reason"
        }
    }
    handleClose = () => {
        this.setState({
            reasonOpen: false,
            reason: ''
        })
    }

    onChange = async (e) => {
        let { value, name, } = e.target;
        let { errors } = this.state
        delete errors.reason
        this.setState({
            [name]: value,
            errors: errors
        })
    }



    render() {
        const { reason, errors, reasonOpen, cancelDisable, loading, staff, columns, options } = this.state
        return (
            <div className='leave-apply-table-margin'>
                <Box className={loading ? 'text-center' : 'display-none'}>
                    <CircularProgress className='loading' />
                </Box>
                <Grid container className={loading ? 'display-none' : ''}>
                    <Grid item md={12}>
                        <LeaveTable
                            key={staff}
                            title={loading ? <CircularProgress /> : ""}
                            data={staff}
                            columns={columns}
                            options={options}
                        />
                    </Grid>
                </Grid>
                <Dialog open={reasonOpen} onClose={this.handleClose} aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title"></DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Please Enter Cancel Leave Reason
                        </DialogContentText>
                        <FormControl
                            fullWidth
                            error={errors.reason && (errors.reason ? true : false)}
                        >
                            <Box>Reason</Box>
                            <TextareaAutosize aria-label="minimum height"
                                className='apply-leave-text-area-auto-size-reason '
                                value={reason}
                                name='reason'
                                onChange={this.onChange}
                                required
                            />
                            {errors.reason &&
                                <FormHelperText>{errors.reason}</FormHelperText>
                            }
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button color="primary" disabled={cancelDisable} style={{ textTransform: 'capitalize' }} onClick={this.cancelLeaves}>
                            Cancel Leave
                        </Button>
                        <Button color='secondary' style={{ textTransform: "uppercase" }} onClick={this.handleClose}>
                            close
                    </Button>
                    </DialogActions>
                </Dialog>
            </div>
        )
    }
}

export default CancelLeave
