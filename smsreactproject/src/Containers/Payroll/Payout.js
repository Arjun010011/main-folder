import React, { Component } from 'react';
import {
    Paper, TableContainer, Table, TableHead, TableCell, TableRow, TableBody, Grid, Box,
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import { GET_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import LoadingGif from 'Components/LoadingGif';
import './styles.scss';
import { getFinancialYear, SetFinancialYear, numberWithCommasWithoutSymbol } from 'Includes/functions';
import classNames from 'classnames';
import { Dropdown } from 'Components/DropDown';
import { roundOffDecimal } from 'Constants';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';

class Payout extends Component {
    constructor() {
        super()
        this.state = {
            yearList: [],
            loading: true,
            salaryDetails: {},
            dataUpdating: false
        }
    }


    componentDidMount() {
        this.getFinancialYear();
    }


    getFinancialYear = () => {
        getRequest(GET_URL.getfinancialyear.api, {}, this.props).then((response) => {
            if (response && response.status === 200) {
                const yearList = response.data.data;
                let year = getFinancialYear();
                year = year ? parseInt(year) : 0;
                this.setState({
                    yearList,
                    year,
                    loading: year !== 0
                }, () => {
                    if (year) {
                        this.getPayout();
                    }
                });
            }
        });
    }


    getPayout = () => {
        this.setState({ dataUpdating: true });
        const { year } = this.state;
        let url = GET_URL.salaryemployeeyearplan.api;
        let params = { financial_year: year };
        getRequest(url, params).then(response => {
            if (response) {
                if (response.status === 200) {
                    let salaryDetails = response.data.data;
                    this.setState({
                        salaryDetails,
                        loading: false,
                        dataUpdating: false
                    });
                }
            }
        })
    }

    onChangeYear = (e) => {
        let { value } = e.target;
        if (value) {
            this.setState({
                year: value
            }, () => {
                this.getPayout();
            });
            SetFinancialYear(value);
        }
    }

    render() {
        let { loading, yearList, year, salaryDetails, dataUpdating } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                <FormattedMessage {...messages.payout} />
                            </Box>
                            <Box className='sub-heading'>
                                <FormattedMessage {...messages.payoutComponentSubHeading} />
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container spacing={2} className={classNames('header-align')}>
                        <Grid item lg={3} md={4} xs={6}>
                            <Dropdown
                                data={yearList}
                                name='year'
                                value={year}
                                required={true}
                                hideSelect={true}
                                onChange={this.onChangeYear}
                                label={<FormattedMessage {...commonMessages.financialYear} />}
                            />
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                        <Grid item md={12} xs={12} className={classNames('header-align')}>
                            {year !== 0 && !dataUpdating &&
                                <Box>
                                    <Box>
                                        <Box className='salary-plan-earning-view-sub-heading'>
                                            <FormattedMessage {...messages.earnings} />
                                        </Box>
                                        <TableContainer>
                                            <Table size='small' aria-label='simple table' className='salary-plan-row-margin'>
                                                <TableHead>
                                                    <TableRow className='salary-plan-table-header'>
                                                        <TableCell className='salary-plan-header-label'>
                                                            <FormattedMessage {...messages.componentName} />
                                                        </TableCell>
                                                        <TableCell className='salary-plan-header-label'>
                                                            <FormattedMessage {...commonMessages.amount} />
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {salaryDetails?.earnings?.length > 0 && salaryDetails.earnings.map((data, index) => {
                                                        return (
                                                            <TableRow key={index} className='salary-plan-table-data-row'>
                                                                <TableCell className='salary-plan-header-left' component='th' scope='row'>
                                                                    {data.salary_component_name}
                                                                </TableCell>
                                                                <TableCell className='salary-plan-header-value' component='th' scope='row'>
                                                                    {numberWithCommasWithoutSymbol(data.amount)}
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                    <TableRow className='salary-plan-total-table-data-row'>
                                                        <TableCell className='salary-plan-header-left' component='th' scope='row'>
                                                            <FormattedMessage {...messages.grossEarnings} />
                                                        </TableCell>
                                                        <TableCell className='salary-plan-amount' component='th' scope='row'>
                                                            {numberWithCommasWithoutSymbol(salaryDetails?.total_gross_earnings)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                    <Box>
                                        <Box className='salary-plan-deduction-view-sub-heading'>
                                            <FormattedMessage {...messages.deductions} />
                                        </Box>
                                        <TableContainer>
                                            <Table size='small' aria-label='simple table' className='salary-plan-row-margin'>
                                                <TableHead>
                                                    <TableRow className='salary-plan-table-header'>
                                                        <TableCell className='salary-plan-header-label'>
                                                            <FormattedMessage {...messages.componentName} />
                                                        </TableCell>
                                                        <TableCell className='salary-plan-header-label'>
                                                            <FormattedMessage {...commonMessages.amount} />
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {salaryDetails?.deductions?.length > 0 && salaryDetails.deductions.map((data, index) => {
                                                        return (
                                                            <TableRow key={index} className='salary-plan-table-data-row'>
                                                                <TableCell className='salary-plan-header-left' component='th' scope='row'>
                                                                    {data.salary_component_name}
                                                                </TableCell>
                                                                <TableCell className='salary-plan-header-value' component='th' scope='row'>
                                                                    {numberWithCommasWithoutSymbol(data.amount)}
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                    <TableRow className='salary-plan-total-table-data-row'>
                                                        <TableCell className='salary-plan-header-left' component='th' scope='row'>
                                                            <FormattedMessage {...messages.grossDeductions} />
                                                        </TableCell>
                                                        <TableCell className='salary-plan-amount' component='th' scope='row'>
                                                            {numberWithCommasWithoutSymbol(salaryDetails?.total_gross_deductions)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                    <Box>
                                        <Box className='salary-plan-deduction-view-sub-heading'>
                                            <FormattedMessage {...commonMessages.total} />
                                        </Box>
                                        <TableContainer>
                                            <Table size='small' aria-label='simple table' className='salary-plan-row-margin'>
                                                <TableHead>
                                                    <TableRow className='salary-plan-table-header'>
                                                        <TableCell className='salary-plan-header-label'>
                                                            <FormattedMessage {...messages.componentName} />
                                                        </TableCell>
                                                        <TableCell className='salary-plan-header-label'>
                                                            <FormattedMessage {...commonMessages.amount} />
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    <TableRow className='salary-plan-total-table-data-row'>
                                                        <TableCell className='salary-plan-header-left' component='th' scope='row'>
                                                            <FormattedMessage {...messages.netPay} />
                                                        </TableCell>
                                                        <TableCell className='salary-plan-amount' component='th' scope='row'>
                                                            {numberWithCommasWithoutSymbol(salaryDetails?.total_net_pay)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                </Box>
                            }
                            {dataUpdating && <LoadingGif />}
                            {!year && !dataUpdating &&
                                <BlankPagewithIcon data='Select the Financial year to view the Payout' />
                            }
                        </Grid>
                    </Grid>
                </Paper>
            )

        }

    }
}

export default withRouter(Payout)