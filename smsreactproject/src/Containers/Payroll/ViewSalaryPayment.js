import React, { Component } from 'react'
import { Paper, Box, Button, Grid, CircularProgress } from '@material-ui/core';
import classNames from 'classnames'
import { withRouter } from 'react-router-dom';
import CheckCircleOutlinedIcon from '@material-ui/icons/CheckCircleOutlined';
import moment from 'moment';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { cloneDeep } from 'lodash';
import {
    dateFormat, getFinancialYear, SetFinancialYear, getFullName, getUrlParam
} from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { Dropdown } from 'Components/DropDown';
import { Actions } from 'Constants/permissions';
import { options } from 'Constants';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';


class ViewSalaryPayment extends Component {
    constructor(props) {
        super(props);
        let { month, salaryMonth, salaryMonthName } = getUrlParam();
        this.state = {
            staffList: [],
            yearList: [],
            monthList: [],
            loading: true,
            month: month ? parseInt(month) : 0,
            tableLoading: false,
            yearName: '',
            salaryMonth: salaryMonth,
            salaryMonthName: salaryMonthName,
            optionsLocal: {},
            columns: [
                {
                    name: "full_name",
                    label: <FormattedMessage {...commonMessages.staffName} />,
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
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
                    name: "salary_is_paid",
                    label: "salary_is_paid",
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "Actions",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            let displayValue = tableMeta.rowData[7] ? <FormattedMessage {...messages.viewSalary} /> : <FormattedMessage {...messages.paySalary} />;
                            return (
                                <div className='action-cloumn-width' >
                                    <Button
                                        className='add-modify-button'
                                        onClick={() => this.salaryPayment(tableMeta.rowData[6], tableMeta.rowData[7])
                                        }
                                    >
                                        {displayValue}
                                    </Button>
                                </div>
                            )
                        }
                    }
                },
                {
                    name: "Status",
                    label: <FormattedMessage {...commonMessages.status} />,
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <div className="status-cloumn-width" >
                                    {tableMeta.rowData[7] &&
                                        <Box mr={2} pl={1} component="span" >
                                            <Button
                                                className='approved-button'
                                                variant="outlined"
                                                onClick={(e) => e.stopPropagation()
                                                }> <FormattedMessage {...commonMessages.paid} />
                                                <CheckCircleOutlinedIcon />
                                            </Button>
                                        </Box>
                                    }
                                </div>
                            );
                        }
                    }
                }

            ]
        }
    }

    componentDidMount() {
        const pagination_types = JSON.parse(localStorage.getItem('pagination_types')) ? JSON.parse(localStorage.getItem('pagination_types')) : {}
        let pagination_temp = cloneDeep(options)
        if (pagination_types['salary_payment']) {
            pagination_temp['page'] = pagination_types['salary_payment']['page']
            pagination_temp['rowsPerPage'] = pagination_types['salary_payment']['rowsPerPage']
        }
        this.setState({
            optionsLocal: pagination_temp,
        })
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
                        this.getMonthList();
                    }
                });
            }
        });
    }


    getMonthList = (lastMonth) => {
        let { yearList, year, month } = this.state;
        let yearName, startDate, endDate;
    
        yearList.some((data) => {
            if (data.id === year) {
                yearName = data.name;
                startDate = moment(data.start_date).startOf('month');
                endDate = moment(data.end_date).startOf('month');
            }
        });
    
        const currentMonthStart = moment().startOf('month');
        if (currentMonthStart.isSameOrBefore(endDate)) {
            endDate = moment().startOf('month').subtract(1, 'month');
        }
    
        let monthList = [];
        while (startDate.isSameOrBefore(endDate)) {
            const monthItem = {
                id: startDate.month() + 1, 
                year: startDate.year(),
                name: startDate.format('MMM - YYYY'),
            };
            monthList.push(monthItem);
            startDate.add(1, 'month');
        }
    
        if (!month || lastMonth) {
            if (monthList.length > 0) {
                const lastMonthItem = monthList[monthList.length - 1];
                this.setState({
                    monthList,
                    month: lastMonthItem.id,
                    yearName,
                    salaryMonth: `${lastMonthItem.year}-${lastMonthItem.id}`,
                    salaryMonthName: lastMonthItem.name
                }, () => {
                    this.getStaffList();
                });
                return;
            }
        }
    
        this.setState({
            monthList,
            yearName
        }, () => {
            this.getStaffList();
        });
    };

    onChange = async (e) => {
        let { value, name } = e.target;
        if (value) {
            this.setState({
                [name]: value
            },
                () => {
                    if (name === 'year') {
                        this.getMonthList(true);
                        SetFinancialYear(value);
                    }
                    else {
                        this.onChangeMonth(value);
                    }
                }
            );
        }
    }

    onChangeMonth = (month) => {
        let { monthList } = this.state;
        let year, salaryMonthName;
        monthList.some((data) => {
            if (data.id === month) {
                year = data.year;
                salaryMonthName = data.name;
            }
        });
        this.setState({
            month: month,
            salaryMonth: year + '-' + month,
            salaryMonthName: salaryMonthName
        },
            () => {
                this.getStaffList();
            });
    }


    getStaffList = () => {
        this.setState({ tableLoading: true, staffList: [] });
        let { year, salaryMonth } = this.state;
        const params = {
            salary_is_approved: "1", salary_is_paid_status: "1",
            salary_month: salaryMonth,
            financial_year: year,
            employee_status: "F"
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

    salaryPayment = (id, salaryIsPaid) => {
        let { year, yearName, salaryMonth, salaryMonthName, month } = this.state;
        this.props.history.push({
            pathname: Actions.payroll_salarypayment.create.url,
            state: {
                salaryIsPaid: salaryIsPaid,
                year: year,
                yearName: yearName,
                id: id,
                salaryMonth: salaryMonth,
                salaryMonthName: salaryMonthName,
                month: month
            }
        });
    }

    getBlankPageMessage = () => {
        let { year, monthList } = this.state;
        let message = '';
        if (!year) {
            message = 'Select the Financial year to view the Staff List.';
        }
        else if (monthList.length === 0) {
            message = 'Financial year is not yet started.';
        }
        return message;
    };

    handleDownloadAll = () => {
        const { salaryMonth, year } = this.state;
        const param = { salary_is_approved: "1", salary_month: salaryMonth, financial_year: year, employee_status: 'F' }
        let prop = { ...this.props }
        prop.responseType = 'blob';
        this.setState({ isDownloading: true })
        getRequest(GET_URL.downloadstaffsalary.api, param, prop).then((response) => {
            if (response && response.status === 200) {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Staff Salary - [${salaryMonth}].xlsx`);
                document.body.appendChild(link);
                link.click();
            }
            this.setState({ isDownloading: false })
        })
    }

    onTableChange = (tableState) => {
        let newOptions = { ...this.state.optionsLocal }
        newOptions['searchText'] = tableState['searchText']
        newOptions['page'] = tableState['page']
        newOptions['rowsPerPage'] = tableState['rowsPerPage']
        const pagination_types = JSON.parse(localStorage.getItem('pagination_types')) ? JSON.parse(localStorage.getItem('pagination_types')) : {}
        let temp = { salary_payment: newOptions }
        let temp_new = { ...pagination_types, ...temp }
        localStorage.setItem("pagination_types", JSON.stringify(temp_new))
        this.setState({
            optionsLocal: { ...newOptions }
        })
    }

    render() {
        let { loading, staffList, columns, optionsLocal, tableLoading, month, year, yearList, monthList, isDownloading } = this.state;

        if (loading) {
            return <LoadingGif />
        }
        else {
            let option = {
                ...optionsLocal,
                textLabels: {
                    body: {
                        noMatch: tableLoading ? 'Loading...' : 'Sorry, there is no matching data to display',
                    },
                }
            }
            return (
                <Paper className={classNames('paper-background')} >
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                <FormattedMessage {...messages.salaryPayment} />
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
                        <Grid item lg={3} md={4} xs={6}>
                            <Dropdown
                                data={monthList}
                                name='month'
                                value={month}
                                required={true}
                                hideSelect={true}
                                onChange={this.onChange}
                                label={<FormattedMessage {...commonMessages.month} />}
                            />
                        </Grid>
                        {month !== 0 &&
                            <Grid item md={6} xs={12}>
                                <div className='text-align-end'>
                                    <Button className='custom-button' disabled={isDownloading} onClick={this.handleDownloadAll}>
                                        Download All Staff Salary
                                        {isDownloading &&
                                            <CircularProgress />
                                        }
                                    </Button>
                                </div>
                            </Grid>
                        }
                    </Grid>
                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                        <Grid item md={12} xs={12} className={classNames('header-align')}>
                            {monthList.length > 0 &&
                                <Box>
                                    <Grid container className={classNames('flex-justify-center', 'header-align')} >
                                        <Grid item md={12} xs={12} >
                                            <Paper>
                                                <AllMUIDataTable
                                                    data={staffList}
                                                    columns={columns}
                                                    options={option}
                                                    onTableChange={this.onTableChange}
                                                />
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>
                            }
                            {
                                (!year || monthList.length === 0) &&
                                <BlankPagewithIcon data={this.getBlankPageMessage()} />
                            }
                        </Grid>
                    </Grid>
                </Paper>
            )
        }
    }
}

export default withRouter(ViewSalaryPayment)