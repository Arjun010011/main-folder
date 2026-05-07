import React, { Component } from 'react'
import { Paper, Box, Button, Grid } from '@material-ui/core';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'
import { getFullName, dateFormat, getFinancialYear, SetFinancialYear, getUrlParam } from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { Dropdown } from 'Components/DropDown';
import { Actions } from 'Constants/permissions';
import { LEAVEOPTIONS } from 'Constants';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';

class ViewPayslip extends Component {
    constructor() {
        super()
        let { year } = getUrlParam();
        this.state = {
            staffList: [],
            yearList: [],
            loading: true,
            year: year ? parseInt(year) : 0,
            tableLoading: false,
            columns: [
                {
                    name: "name",
                    label: <FormattedMessage {...commonMessages.staffName} />,
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta) => {
                            return (<div className='mui-table-custom-value-left-align'>
                                {getFullName(tableMeta.rowData[1], tableMeta.rowData[2], tableMeta.rowData[3])}
                            </div>)
                        }
                    }
                },
                {
                    name: "first_name",
                    label: "First Name",
                    options: {
                        filter: true,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "middle_name",
                    label: "Middle Name",
                    options: {
                        filter: true,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "last_name",
                    label: "Last Name",
                    options: {
                        filter: true,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "employee_id",
                    label: <FormattedMessage {...commonMessages.employeeID} />,
                    options: {
                        filter: true,
                        sort: true
                    }
                },
                {
                    name: "date_joined",
                    label: <FormattedMessage {...commonMessages.joiningDate} />,
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value) => {
                            return dateFormat(value, 'DD-MM-YYYY');
                        },
                    }
                },
                {
                    name: "id",
                    label: "ID",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                    }
                },
                {
                    name: "Actions",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <div>
                                    <Button
                                        className='add-modify-button'
                                        onClick={() => this.payslip(tableMeta.rowData[6])}
                                    >
                                        <FormattedMessage {...messages.payslip} />
                                    </Button>
                                </div>
                            );
                        }
                    }
                }
            ]
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
                    loading: false
                }, () => {
                    if (year) {
                        this.getStaffList();
                    }
                });
            }
        });
    }


    onChange = async (e) => {
        let { value } = e.target;
        if (value) {
            this.setState({
                year: value
            },
                () => {
                    this.getStaffList();
                    SetFinancialYear(value);
                }
            );
        }
    }

    getStaffList = () => {
        this.setState({ tableLoading: true, staffList: [] });
        let { year } = this.state;
        const params = {
            salary_is_approved: "1", salary_is_paid_status: "1",
            financial_year: year, employee_status: "F"
        };
        getRequest(GET_URL.staff.api, params).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffList: response.data.data,
                    tableLoading: false
                });
            }
        })
    }

    payslip = (staff_id) => {
        let searchState = {
            year: this.state.year,
            staff_id: staff_id
        }
        let searchParam = "?" + new URLSearchParams(searchState).toString();
        this.props.history.push({
            pathname: Actions.payroll_payslip.view.url,
            search: searchParam,
          });
    }


    render() {
        let { loading, staffList, tableLoading, year, yearList } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        else {
            let option = {
                ...LEAVEOPTIONS,
                textLabels: {
                    body: {
                        noMatch: tableLoading ? 'Loading...' : 'Sorry, there is no matching data to display',
                    },
                }
            }
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                <FormattedMessage {...messages.payslip} />
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
                                onChange={this.onChange}
                                label={<FormattedMessage {...commonMessages.financialYear} />}
                            />
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                        <Grid item md={12} xs={12} className={classNames('header-align')}>
                            {year !== 0 &&
                                <Box>
                                    <Grid container className={classNames('flex-justify-center', 'header-align')} >
                                        <Grid item md={12} xs={12} >
                                            <Paper>
                                                <AllMUIDataTable
                                                    data={staffList}
                                                    columns={this.state.columns}
                                                    options={option}
                                                />
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>
                            }
                            {!year &&
                                <BlankPagewithIcon data='Select the Financial year to view the Staff List' />
                            }
                        </Grid>
                    </Grid>
                </Paper>
            )
        }
    }
}

export default withRouter(ViewPayslip)