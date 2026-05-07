import React, { Component } from 'react'
import { Paper, Box, Grid, Button } from '@material-ui/core';
import { Link, withRouter } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import moment from 'moment'
import { GET_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import GetAppRoundedIcon from '@material-ui/icons/GetAppRounded';
import axios from 'axios'
import fileDownload from 'js-file-download'
import LoadingGif from 'Components/LoadingGif';
import { Actions } from 'Constants/permissions';
import classNames from 'classnames';
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';
import { Dropdown } from 'Components/DropDown';
import { dateFormat, getFullName, numberWithCommasWithoutSymbol } from 'Includes/functions';

const staff_details = localStorage.getItem("user") != 'undefined' ? JSON.parse(localStorage.getItem("user")) : '';


class MyPayslip extends Component {
    constructor(props) {
        super(props)
        this.state = {
            monthList: [],
            loading: true,
            staff_id: '',
            month: 0,
            payslipDetails: {},
            dataUpdating: false
        }
    }

    componentDidMount() {
        if (staff_details?.staff?.id) {
            this.setState({
                staff_id: staff_details['staff']['id']
            }, () => {
                this.getSalaryDetails();
            })
        }
        else {
            this.props.history.push('/dashboard')
        }
    }



    getSalaryDetails = () => {
        let { staff_id, month } = this.state;
        const url = GET_URL.salaryemployeemonthplan.api + staff_id + '/'
        getRequest(url).then(response => {
            if (response && response.status === 200) {
                let monthList = response.data.data;
                if (monthList.length > 0) {
                    month = monthList.at(-1).id;
                }
                this.setState({
                    monthList: monthList,
                    month: month,
                    loading: month !== 0
                },
                    () => {
                        if (month) {
                            this.payslip();
                        }
                    })
            }
        })
    }

    payslip = () => {
        this.setState({ dataUpdating: true });
        const { staff_id, month } = this.state;
        let params = { staff: staff_id, salary_month: month };
        getRequest(GET_URL.salaryemployeemonthplan.api, params).then(response => {
            if (response && response.status === 200) {
                let payslipDetails = response.data;
                let moreComp = payslipDetails.data.earnings.length >= payslipDetails.data.deductions.length;
                this.setState({
                    payslipDetails: payslipDetails,
                    loading: false,
                    moreComp: moreComp,
                    dataUpdating: false
                });
            }
        }
        );
    }

    onChangeMonth = async (e) => {
        let { month } = this.state;
        let { value } = e.target;
        if (month != value) {
            this.setState({
                month: value
            }, () => {
                this.payslip();
            })
        }
    }


    handleDownload = () => {
        let { staff_id, month } = this.state;
        let prop = { responseType: 'blob' };
        getRequest(GET_URL.payslip.api + staff_id + '/', { salary_month: month }, prop).then(response => {
            if (response && response.status === 200) {
                let Data = new Blob([response.data], { type: 'application/pdf' })
                axios.get(URL.createObjectURL(Data), {
                    responseType: 'blob',
                })
                    .then((res) => {
                        fileDownload(res.data, 'payslip.pdf')
                    })
            }
        })
    }


    render() {
        let { monthList, payslipDetails, moreComp, month, loading, dataUpdating } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        return (

            <div>
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                <FormattedMessage {...messages.mypayslip} />
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container spacing={2} className='header-align'>
                        <Grid item lg={3} md={4} xs={6}>
                            <Dropdown
                                data={monthList}
                                name='month'
                                value={month}
                                onChange={this.onChangeMonth}
                                hideSelect={true}
                                required={true}
                                label={<FormattedMessage {...commonMessages.month} />}
                            />
                        </Grid>
                    </Grid>

                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                        <Grid item md={12} xs={12} className={classNames('header-align')}>
                            {Object.keys(payslipDetails).length !== 0 && !dataUpdating &&
                                <>
                                    <Box>
                                        <div>
                                            <table style={{ width: "100%" }}>
                                                <tr bgcolor="#55B6E7">
                                                    <th colSpan="4" className="payslipheading">
                                                        <font>
                                                            {payslipDetails.institute.name}
                                                        </font>
                                                    </th>
                                                </tr>
                                                <tr>
                                                    <th colSpan="4" className="payslipheading">
                                                        <FormattedMessage {...messages.payslipFor} /> {moment(month).format('MMMM YYYY')}
                                                    </th>
                                                </tr>

                                                <tr bgcolor="#C9D7DE">
                                                    <th className="label-text-align">Personnel No.</th>
                                                    <td className="label-text-align"></td>
                                                    <th className="label-text-align"><FormattedMessage {...commonMessages.name} /></th>
                                                    <td className="label-text-align">{getFullName(payslipDetails.staff_details.first_name, payslipDetails.staff_details.middle_name, payslipDetails.staff_details.last_name)}</td>
                                                </tr>

                                                <tr bgcolor="#C9D7DE">
                                                    <th className="label-text-align">Bank</th>
                                                    <td className="label-text-align">{payslipDetails.account_detail.bank_name}</td>
                                                    <th className="label-text-align">Bank A/c No.</th>
                                                    <td className="label-text-align">{payslipDetails.account_detail.account_num}</td>
                                                </tr>
                                                <tr bgcolor="#C9D7DE">
                                                    <th className="label-text-align">DOJ</th>
                                                    <td className="label-text-align">{dateFormat(payslipDetails.staff_details.date_joined, 'DD-MM-YYYY')}</td>
                                                    <th className="label-text-align">LOP Days</th>
                                                    <td className="label-text-align">{payslipDetails.staff_details.lop_days}</td>
                                                </tr>
                                                <tr bgcolor="#C9D7DE">
                                                    <th className="label-text-align">Location</th>
                                                    <td className="label-text-align">{payslipDetails.institute.city}</td>
                                                    <th className="label-text-align">Worked Days</th>
                                                    <td className="label-text-align">{payslipDetails.staff_details.days}</td>
                                                </tr>
                                                <tr bgcolor="#C9D7DE">
                                                    <th className="label-text-align">PF No.</th>
                                                    <td className="label-text-align">{payslipDetails.account_detail.pf_num}</td>
                                                    <th className="label-text-align"></th>
                                                    <td className="label-text-align"></td>
                                                </tr>
                                            </table>
                                            <br />
                                            <table style={{ width: "100%" }}>
                                                <tr className="payslipheading">
                                                    <th className="label-text-align"><FormattedMessage {...messages.earnings} /></th>
                                                    <th className="amount-text-align"><FormattedMessage {...commonMessages.amount} /></th>
                                                    <th className="label-text-align"><FormattedMessage {...messages.deductions} /></th>
                                                    <th className="amount-text-align"><FormattedMessage {...commonMessages.amount} /></th>
                                                </tr>
                                                {moreComp ? payslipDetails.data.earnings.map((data, index) =>
                                                    <tr key={index} bgcolor="#CBE7F5" >
                                                        <td className="label-text-align">
                                                            {data.salary_component_name}
                                                        </td>
                                                        <td className="amount-text-align">
                                                            {numberWithCommasWithoutSymbol(data.amount)}
                                                        </td>
                                                        {payslipDetails.data.deductions[index] ?
                                                            <>
                                                                <td className="label-text-align">
                                                                    {payslipDetails.data.deductions[index].salary_component_name}
                                                                </td>
                                                                <td className="amount-text-align">
                                                                    {numberWithCommasWithoutSymbol(payslipDetails.data.deductions[index].amount)}
                                                                </td>
                                                            </>
                                                            :
                                                            <>
                                                                <td>
                                                                </td>
                                                                <td>
                                                                </td>
                                                            </>
                                                        }
                                                    </tr>
                                                )
                                                    :
                                                    payslipDetails.data.deductions.map((data, index) =>
                                                        <tr key={index} bgcolor="#CBE7F5" >
                                                            {payslipDetails.data.earnings[index] ?
                                                                <>
                                                                    <td className="label-text-align">
                                                                        {payslipDetails.data.earnings[index].salary_component_name}
                                                                    </td>
                                                                    <td className="amount-text-align">
                                                                        {numberWithCommasWithoutSymbol(payslipDetails.data.earnings[index].amount)}
                                                                    </td>

                                                                </>
                                                                :
                                                                <>
                                                                    <td>
                                                                    </td>
                                                                    <td>
                                                                    </td>
                                                                </>
                                                            }
                                                            <td className="label-text-align">
                                                                {data.salary_component_name}
                                                            </td>
                                                            <td className="amount-text-align" >
                                                                {numberWithCommasWithoutSymbol(data.amount)}
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                                <tr bgcolor="#CBE7F5">
                                                    <th className="label-text-align"><FormattedMessage {...messages.grossEarnings} /></th>
                                                    <th className="amount-text-align">{numberWithCommasWithoutSymbol(payslipDetails.data.gross_earnings)}</th>
                                                    <th className="label-text-align"><FormattedMessage {...messages.grossDeductions} /></th>
                                                    <th className="amount-text-align">{numberWithCommasWithoutSymbol(payslipDetails.data.gross_deductions)}</th>
                                                </tr>
                                                <tr bgcolor="#CBE7F5">
                                                    <th colSpan="2" className="payslipamount"><FormattedMessage {...messages.netPay} /></th>
                                                    <th colSpan="2" className="label-text-align">{numberWithCommasWithoutSymbol(payslipDetails.data.net_pay)}</th>
                                                </tr>
                                            </table>
                                        </div>

                                    </Box>

                                    <Box display='flex' justifyContent='flex-end' marginTop='60px'>
                                        <Button variant='contained' color="secondary"
                                            className='submit'
                                            onClick={() => this.handleDownload()}>
                                            <GetAppRoundedIcon />
                                            <FormattedMessage {...commonMessages.download} />
                                        </Button>
                                    </Box>
                                </>
                            }
                            {dataUpdating && <LoadingGif />}
                            {Object.keys(payslipDetails).length === 0 && !dataUpdating &&
                                <BlankPagewithIcon data={'Payslip(s) are not found for the staff'} />
                            }
                        </Grid>
                    </Grid>
                </Paper>
            </div >
        )
    }
}

export default withRouter(MyPayslip)
