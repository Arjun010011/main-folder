
import React, { Component } from 'react'
import { Grid, FormControl, CircularProgress, InputLabel, MenuItem, Select, ListItemText, Checkbox, Box, createTheme, MuiThemeProvider } from '@material-ui/core';
import MUIDataTable from "mui-datatables";
import originalMoment from "moment";
import { extendMoment } from "moment-range";

import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'
import { LEAVEOPTIONS } from 'Constants';
import LeaveTable from 'Containers/LeaveManagement/components/LeaveTable';

const moment = extendMoment(originalMoment);


const months = moment.monthsShort()
const monthsFullName = moment.months()

export default class LeaveStatus extends Component {
    constructor(props) {
        super(props)

        this.state = {
            staff: [],
            months: months,
            fromArray: [],
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
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<Box>
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

                            )
                        }
                    }
                },
            ]
        }
    }
    async componentDidMount() {
        this.setState({ loading: true })
        const url = GET_URL.applyleave.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staff: response.data.data,
                    options: LEAVEOPTIONS,
                    loading: false
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

    getMonths = (date) => {
        let dateTemp = date.split('-')
        dateTemp[1] = monthsFullName[dateTemp[1].replace(/^0+/, '') - 1]
        if (date === 2) {

        }
        else {
            let { fromArray } = this.state

            let result = fromArray.some((data) => {
                if (data === dateTemp[1]) {
                    return true
                }
            })
            if (!result) {
                this.setState({
                    fromArray: fromArray.push(dateTemp[1])
                })
            }
            return dateTemp[1]
        }
    }

    render() {
        const { loading, staff, columns, options } = this.state
        return (
            <div className='leave-apply-table-margin'>
                <Box className={loading ? 'text-center' : 'display-none'}>
                    <CircularProgress className='loading' />
                </Box>
                <Grid container className={loading ? 'display-none' : ''}>
                    <Grid item md={12}>
                        <LeaveTable
                            key={staff}
                            title={loading ? <CircularProgress /> : ``}
                            data={staff}
                            columns={columns}
                            options={options}
                        />
                    </Grid>
                </Grid>
            </div>
        )
    }
}
