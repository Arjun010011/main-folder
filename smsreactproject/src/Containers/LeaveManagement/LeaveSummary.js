import React, { Component } from 'react'
import { Paper, Grid, Box, Tooltip } from '@material-ui/core';
import DescriptionOutlinedIcon from '@material-ui/icons/DescriptionOutlined';
import originalMoment from "moment";
import { extendMoment } from "moment-range";
import InfoIcon from "@material-ui/icons/Info";

import './styles.scss';

const details = localStorage.getItem("user")!='undefined'?JSON.parse(localStorage.getItem("user")):'';

const moment = extendMoment(originalMoment);

const months = moment.monthsShort()

class LeaveSummary extends Component {


    constructor(props) {
        super(props)

        this.state = {
            months: months
        }
    }

    async componentDidMount() {
        this.props.leaveSummary()
    }

    dateFormat = (from_date, to_date) => {
        let fromDateTemp = []
        fromDateTemp = from_date.split('-')
        fromDateTemp[1] = this.state.months[fromDateTemp[1].replace(/^0+/, '') - 1]
        fromDateTemp.splice(0, 1)

        let toDateTemp = []
        toDateTemp = to_date.split('-')
        toDateTemp[1] = this.state.months[toDateTemp[1].replace(/^0+/, '') - 1]
        toDateTemp.splice(0, 1)

        if (fromDateTemp[0] === toDateTemp[0] && fromDateTemp[1] === toDateTemp[1]) {
            return fromDateTemp
        }
        else {
            toDateTemp.unshift('-')
            let DateTemp = [...fromDateTemp, ...toDateTemp]
            return DateTemp
        }
    }

    render() {
        const { leaveBalance, upcomingHolidays } = this.props
        return (
            <Paper className='leave-summary-paper'>
                <Grid container>
                    <Grid item md={12} className='leave-summary-heading'>
                        <Box paddingRight={2}><DescriptionOutlinedIcon /></Box>
                        <Box >
                            Leave Summary</Box>
                    </Grid>
                </Grid>
                <Grid container spacing={3} className='leave-summary-code-holiday' >
                    <Grid item md={7} xs={12}>
                        <Grid container className='leave-summary-label'>
                            <Grid item md={7} xs={7}>
                                Leave Type
                            </Grid>
                            <Grid item md={5} xs={5}>
                                Balance - {`${details['other_details']['financial_year']['name']}`}
                            </Grid>
                        </Grid>
                        <Grid container className='leave-summary-value'>
                            {leaveBalance &&
                                leaveBalance.map((data, index) => {
                                    return (
                                        <Grid container key={index}>
                                            <Grid item md={7} xs={7} style={{ padding: '20px' }}>
                                                {data.leave_name}
                                            </Grid>
                                            <Grid item md={5} xs={5} style={{ padding: '20px' }}>
                                                {data.leave_code === 'lop' &&
                                                    <Tooltip
                                                        title="Lop dont have counts"
                                                        placement="top-start"
                                                        arrow
                                                    >
                                                        <InfoIcon />
                                                    </Tooltip>
                                                }
                                                {data.leave_code !== 'lop' &&
                                                    data.leave_balance
                                                }

                                            </Grid>
                                        </Grid>
                                    )
                                })
                            }
                        </Grid>
                    </Grid>
                    <Grid item md={5} xs={12}>
                        <Grid container className='leave-summary-label' style={{ textAlign: 'center' }}>
                            <Grid item md={12} xs={12}>
                                Upcoming Holidays
                            </Grid>
                        </Grid>
                        <Box className='leave-summary-value' >
                            {upcomingHolidays &&
                                upcomingHolidays.map((data, index) => {
                                    return (
                                        <Grid key={index} container style={{
                                            padding: '10px',
                                            textAlign: 'center',
                                            display: 'flex', justifyContent: 'center',
                                            borderBottom: 'inset',
                                        }}>
                                            <Grid item md={12}>
                                                <Box fontWeight='500'>{data.reason}</Box>
                                            </Grid>
                                            <Grid item md={3} style={{ display: 'flex', justifyContent: 'center' }}>
                                                {this.dateFormat(data.from_date, data.to_date,).map((data) => {
                                                    return (
                                                        <Box paddingRight='5px'>{data}</Box>
                                                    )
                                                })}
                                            </Grid>
                                        </Grid>
                                    )
                                })
                            }
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        )
    }
}

export default LeaveSummary