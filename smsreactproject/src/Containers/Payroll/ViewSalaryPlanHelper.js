import React, { Component } from 'react'
import {
    Paper, Box, Grid, Table, TableContainer,
    TableHead, TableCell, TableRow, TableBody, Button
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import CreateIcon from '@material-ui/icons/Create';
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { GET_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import LoadingGif from 'Components/LoadingGif';
import './styles.scss';
import classNames from 'classnames';
import { Dropdown } from 'Components/DropDown';
import {
    getFinancialYear, SetFinancialYear, isUserHasPermission,
    getKeyValueInArray, numberWithCommas
} from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';


class ViewSalaryPlanHelper extends Component {
    constructor() {
        super();
        let year = getFinancialYear();
        this.state = {
            componentList: [],
            earnings: [],
            deductions: [],
            year: year === null ? '' : parseInt(year),
            alertData: '',
            loading: true,
            dataUpdating: false,
            addPlanPermission: isUserHasPermission('payroll_salaryplanhelper', 'create')
        }
    }

    componentDidMount = () => {
        this.getFinancialYearDetails();

    }

    getSalaryComponentList = () => {
        let { year } = this.state;
        if (year!=='') {
            this.setState({ dataUpdating: true });
            const url = GET_URL.salaryplan.api;
            const param = { financial_year: year }
            getRequest(url, param, this.props).then(response => {
                if (response && response.status === 200) {
                    let componentList = response.data.data;
                    let earnings = [];
                    let deductions = [];
                    componentList.map((data) => {
                        if (data.percentage_of_component_id === null) {
                            data.percentage_component_name = "Fixed Pay";
                        }
                        if (data.is_deduction) {
                            deductions.push(data);
                        }
                        else {
                            earnings.push(data);
                        }
                    })
                    this.setState({
                        componentList,
                        earnings,
                        deductions,
                        dataUpdating: false,
                        loading: false
                    })
                }
            });
        }
        else {
            this.setState({
                loading: false
            });
        }
    }



    getFinancialYearDetails = () => {
        const url = GET_URL.getfinancialyear.api;
        getRequest(url, { is_active: true }, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data
                }, () => {
                    this.getSalaryComponentList();
                })
            }
        })
    }


    onChange = (e) => {
        let { value, year } = e.target;
        if (value !== year) {
            this.setState({
                year: value,
                alertData: ''
            }, () => {
                this.getSalaryComponentList();
            })
            SetFinancialYear(value);
        }
    }

    editSalaryPlanHelper = () => {
        let { year, yearList, alertData } = this.state;
        if (year) {
            const yearName = getKeyValueInArray(yearList, 'id', year, 'name');
            let searchState = { year: year, yearName: yearName };
            let searchParam = "?" + new URLSearchParams(searchState).toString();
            this.props.history.push({
                pathname: Actions.payroll_salaryplanhelper.create.url,
                search: searchParam,
            });
        }
        else {
            alertData = <FormattedMessage {...commonMessages.selectFinancialYear} />;
            this.setState({
                alertData,
            })
        }
    }

    render() {
        const { loading, alertData, earnings, deductions, yearList, year,
            componentList, dataUpdating, addPlanPermission } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        return (
            <div>
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                <FormattedMessage {...messages.salaryPlanHelper} />
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {addPlanPermission && (
                                    <Button
                                        variant="contained"
                                        onClick={() => this.editSalaryPlanHelper()}
                                        className='editbutton-view'
                                    >
                                        {earnings.length === 0 && deductions.length === 0 ?
                                            <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                                            :
                                            <CreateIcon className='visibility-icon' />}
                                        {/* <AddCircleOutlineOutlinedIcon className="visibility-icon" /> */}
                                        {" "}
                                        <FormattedMessage {...messages.salaryPlanHelper} />
                                    </Button>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container spacing={2} className='header-align'>
                        <Grid item lg={3} md={4} xs={6}>
                            <Dropdown
                                data={yearList}
                                name='year'
                                value={year}
                                required={true}
                                hideSelect={true}
                                onChange={(e) => this.onChange(e)}
                                error={alertData}
                                label={<FormattedMessage {...commonMessages.financialYear} />}
                            />
                        </Grid>
                    </Grid>
                    <Grid container className='header-align'>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            {componentList.length > 0 && !dataUpdating &&
                                <Box>
                                    <Box className='Salary-component-heading'>
                                        <FormattedMessage {...messages.earnings} />
                                    </Box>
                                    <Box>
                                        <TableContainer>
                                            <Table size='small' aria-label='simple table' className='salaryplan-table-margin'>
                                                <TableHead>
                                                    <TableRow className='salary-plan-table-header'>
                                                        <TableCell className='salary-plan-header-label'><FormattedMessage {...messages.componentName} /></TableCell>
                                                        <TableCell className='salary-plan-header-label'><FormattedMessage {...commonMessages.rate} /></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {earnings.map((data, index) => {
                                                        return <TableRow key={index} className='salary-plan-table-data-row'>
                                                            <TableCell className='salaryplan-header-value' component='th' scope='row'>
                                                                {data.salary_component_name}
                                                            </TableCell>
                                                            <TableCell className='salaryplan-header-value' component='th' scope='row'>
                                                                {data.is_amount ? numberWithCommas(data.amount) : data.rate + '%  (of  ' + data.percentage_component_name + ')'}</TableCell>
                                                        </TableRow>
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                    <Box className='Salary-component-heading'>
                                        <FormattedMessage {...messages.deductions} />
                                    </Box>
                                    <Box>
                                        <TableContainer>
                                            <Table size='small' aria-label='simple table' className='salaryplan-table-margin'>
                                                <TableHead>
                                                    <TableRow className='salary-plan-table-header'>
                                                        <TableCell className='salary-plan-header-label'><FormattedMessage {...messages.componentName} /></TableCell>
                                                        <TableCell className='salary-plan-header-label'><FormattedMessage {...commonMessages.rate} /></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {deductions.map((data, index) => {
                                                        return <TableRow key={index} className='salary-plan-table-data-row'>
                                                            <TableCell className='salaryplan-header-value' component='th' scope='row'>
                                                                {data.salary_component_name}
                                                            </TableCell>
                                                            <TableCell className='salaryplan-header-value' component='th' scope='row'>
                                                                {data.is_amount ? numberWithCommas(data.amount) : data.rate + '%  (of  ' + data.percentage_component_name + ')'}</TableCell>
                                                        </TableRow>
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                </Box>
                            }
                            {dataUpdating && <LoadingGif />}
                            {!year &&
                                <BlankPagewithIcon data={'Select the Financial year to view the Salary Plan Helper'} />
                            }
                            {componentList.length === 0 && !dataUpdating && !!year &&
                                <BlankPagewithIcon data={'Salary Plan Helper is not exist(s) for this Financial Year'} />
                            }
                        </Grid>
                    </Grid>
                </Paper>
            </div>
        )
    }
}
export default withRouter(ViewSalaryPlanHelper)