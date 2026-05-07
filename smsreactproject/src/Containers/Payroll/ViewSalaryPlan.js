import React, { Component } from 'react'
import { Paper, Box, Button, Grid } from '@material-ui/core';
import classNames from 'classnames'
import { withRouter } from 'react-router-dom';
import CheckCircleOutlinedIcon from '@material-ui/icons/CheckCircleOutlined';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'
import { dateFormat, getFinancialYear, SetFinancialYear, getFullName } from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { options } from 'Constants';
import { Dropdown } from 'Components/DropDown';
import './styles.scss'
import { Actions } from 'Constants/permissions';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';
import { cloneDeep } from 'lodash';

class ViewSalaryPlan extends Component {
    constructor() {
        super()
        this.state = {
            staffList: [],
            yearList: [],
            tableLoading: false,
            loading: true,
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
                    name: "salary_is_approved",
                    label: "salaryIsApproved",
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "date_left_status",
                    label: "date_left_status",
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
                            let displayValue = tableMeta.rowData[4] ? <FormattedMessage {...messages.viewPlan} /> : <FormattedMessage {...messages.planNow} />;
                            return (
                                <div className='action-cloumn-width'>
                                    {!tableMeta.rowData[5] &&
                                        <Button
                                            className='add-modify-button'
                                            disabled={tableMeta.rowData[5]}
                                            onClick={() => this.salaryPlan(tableMeta.rowData[3], tableMeta.rowData[4])}
                                        >
                                            {displayValue}
                                        </Button>
                                    }
                                </div>
                            );
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
                            return (<div className="status-cloumn-width">
                                {tableMeta.rowData[5] &&
                                    <Box mr={2} pl={1} component="span">
                                        <Button
                                            className='withdraw-transaction'
                                            variant="outlined"
                                            onClick={(e) => e.stopPropagation()
                                            }><FormattedMessage {...messages.left} />
                                        </Button>
                                    </Box>
                                }
                                {!tableMeta.rowData[5] && tableMeta.rowData[4] &&
                                    <Box mr={2} pl={1} component="span">
                                        <Button
                                            className='approved-button'
                                            variant="outlined"
                                            onClick={(e) => e.stopPropagation()
                                            }><FormattedMessage {...commonMessages.approved} />
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
        if (pagination_types['salary_plan']) {
            pagination_temp['page'] = pagination_types['salary_plan']['page']
            pagination_temp['rowsPerPage'] = pagination_types['salary_plan']['rowsPerPage']
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
                    yearList, year,
                    loading: year?true:false
                },
                    () => {
                        if (year) {
                            this.getStaffList();
                        }
                    }
                );
            }
        });
    }

    onChange = async (e) => {
        let { value } = e.target;
        if (value) {
            this.setState({ 'year': value },
                () => {
                    this.getStaffList();
                });
            SetFinancialYear(value);
        }
    }


    getStaffList = () => {
        this.setState({ tableLoading: true, staffList: [] });
        let { year } = this.state;
        const params = { salary_is_approved_status: "1", financial_year: year, employee_status: "F" };
        getRequest(GET_URL.staff.api, params).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffList: response.data.data,
                    tableLoading: false,
                    loading: false
                });
            }
        })
    }

    salaryPlan = (id, salaryIsApproved) => {
        let { year, yearList } = this.state;
        let index = yearList.find(data => data.id === year);
        this.props.history.push({
            pathname: Actions.payroll_salaryplan.create.url,
            state: {
                year: year,
                yearName: index.name,
                id: id,
                salaryIsApproved: salaryIsApproved
            }
        });
    }

    onTableChange = (tableState) => {
        let newOptions = { ...this.state.optionsLocal }
        newOptions['searchText'] = tableState['searchText']
        newOptions['page'] = tableState['page']
        newOptions['rowsPerPage'] = tableState['rowsPerPage']
        const pagination_types = JSON.parse(localStorage.getItem('pagination_types')) ? JSON.parse(localStorage.getItem('pagination_types')) : {}
        let temp = { salary_plan: newOptions }
        let temp_new = { ...pagination_types, ...temp }
        localStorage.setItem("pagination_types", JSON.stringify(temp_new))
        this.setState({
            optionsLocal: { ...newOptions }
        })
    }

    render() {
        let { loading, staffList, tableLoading, year, yearList, optionsLocal } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                <FormattedMessage {...messages.salaryPlan} />
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
                                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                                        <Grid item md={12} xs={12}>
                                            <Paper>
                                                <AllMUIDataTable
                                                    data={staffList}
                                                    columns={this.state.columns}
                                                    options={optionsLocal}
                                                    onTableChange={this.onTableChange}
                                                />
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>
                            }
                            {!year &&
                                <BlankPagewithIcon data='Select the Financial year to view the Staffs List' />
                            }
                        </Grid>
                    </Grid>
                </Paper>
            )
        }
    }
}

export default withRouter(ViewSalaryPlan)