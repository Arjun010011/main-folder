import React, { Component } from 'react'
import { Paper, Box, Button, Grid } from '@material-ui/core';
import classNames from 'classnames'
import { withRouter } from 'react-router-dom';
import moment from 'moment';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { cloneDeep } from 'lodash';
import {
    dateFormat, getFinancialYear, SetFinancialYear, getFullName, getUrlParam,
    numberWithCommasWithoutSymbol
} from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { Dropdown } from 'Components/DropDown';
import { Actions } from 'Constants/permissions';
import { options } from 'Constants';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';


class ViewSalaryIncrement extends Component {
    constructor(props) {
        super(props);
        this.state = {
            staffList: [],
            yearList: [],
            loading: true,
            tableLoading: false,
            year: 0,
            yearName: '',
            optionsLocal: {},
            columns: [
                {
                    name: "staff_name",
                    label: <FormattedMessage {...commonMessages.staffName} />,
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "effective_date",
                    label: "Effective Date",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value) => {
                            return value ? dateFormat(value, 'DD-MM-YYYY') : '—';
                        },
                    }
                },
                {
                    name: "increment_type",
                    label: "Type",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "calculation_mode",
                    label: "Calculation",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "amount",
                    label: "Amount/Percent",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta) => {
                            const calcMode = tableMeta.rowData[3];
                            const percentage = tableMeta.rowData[7];

                            if (calcMode === 'PERCENTAGE') {
                                return percentage ? `${percentage} %` : '—';
                            }

                            return value ? `₹ ${numberWithCommasWithoutSymbol(value)}` : '—';
                        }
                    }
                },
                {
                    name: "old_gross",
                    label: "Old Gross Salary",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value) => {
                            return value ? `₹ ${numberWithCommasWithoutSymbol(value)}` : '—';
                        }
                    }
                },
                {
                    name: "new_gross",
                    label: "New Gross Salary",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value) => {
                            return value ? `₹ ${numberWithCommasWithoutSymbol(value)}` : '—';
                        }
                    }
                },
                {
                    name: "percentage",
                    label: "percentage",
                    options: { display: false }
                },
                {
                    name: "staff",
                    label: "staff",
                    options: { display: false }
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
                    name: "applied",
                    label: "Status",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value) => {
                            return (
                                <span style={{
                                    padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                    backgroundColor: value ? '#e8f5e9' : '#fff3e0',
                                    color: value ? '#2e7d32' : '#e65100',
                                    border: `1px solid ${value ? '#c8e6c9' : '#ffe0b2'}`
                                }}>
                                    {value ? 'Applied' : 'Pending'}
                                </span>
                            );
                        }
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
                                <div className='action-cloumn-width'>
                                    <Button
                                        className='add-modify-button'
                                        onClick={() => this.applyIncrement(
                                            tableMeta.rowData[9] // staff ID
                                        )}
                                    >
                                        <FormattedMessage {...messages.applyIncrement} />
                                    </Button>
                                </div>
                            )
                        }
                    }
                },
            ]
        }
    }

    componentDidMount() {
        const pagination_types = JSON.parse(localStorage.getItem('pagination_types')) ? JSON.parse(localStorage.getItem('pagination_types')) : {}
        let pagination_temp = cloneDeep(options)
        if (pagination_types['salary_increment']) {
            pagination_temp['page'] = pagination_types['salary_increment']['page']
            pagination_temp['rowsPerPage'] = pagination_types['salary_increment']['rowsPerPage']
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
                        this.getStaffList();
                    }
                });
            }
        });
    }

    onChange = async (e) => {
        let { value, name } = e.target;
        if (value) {
            this.setState({
                [name]: value
            }, () => {
                if (name === 'year') {
                    SetFinancialYear(value);
                    this.getStaffList();
                }
            });
        }
    }

    getStaffList = () => {
        this.setState({ tableLoading: true, staffList: [] });
        let { year, optionsLocal } = this.state;
        const params = {
            limit: optionsLocal.rowsPerPage || 10,
            pageno: (optionsLocal.page || 0) + 1
        };
        getRequest(GET_URL.salaryincrement.api, params).then(response => {
            if (response && response.status === 200) {
                let optionsData = { ...this.state.optionsLocal };
                optionsData.count = response.data.data.count;
                this.setState({
                    staffList: response.data.data.data_list,
                    optionsLocal: optionsData,
                    tableLoading: false
                });
            }
        }).catch(() => {
            this.setState({ tableLoading: false });
        });
    }

    applyIncrement = (id) => {
        let { year, yearName } = this.state;

        // Find yearName from yearList
        const { yearList } = this.state;
        yearList.some((data) => {
            if (data.id === year) {
                yearName = data.name;
            }
        });

        this.props.history.push({
            pathname: Actions.payroll_salaryincrement.create.url,
            state: {
                year: year,
                yearName: yearName,
                id: id,
            }
        });
    }

    getBlankPageMessage = () => {
        let { year } = this.state;
        if (!year) {
            return 'Select the Financial year to view the Staff List.';
        }
        return '';
    };

    onTableChange = (tableState) => {
        let newOptions = { ...this.state.optionsLocal }
        newOptions['searchText'] = tableState['searchText']
        newOptions['page'] = tableState['page']
        newOptions['rowsPerPage'] = tableState['rowsPerPage']
        const pagination_types = JSON.parse(localStorage.getItem('pagination_types')) ? JSON.parse(localStorage.getItem('pagination_types')) : {}
        let temp = { salary_increment: newOptions }
        let temp_new = { ...pagination_types, ...temp }
        localStorage.setItem("pagination_types", JSON.stringify(temp_new))
        this.setState({
            optionsLocal: { ...newOptions }
        })
    }

    render() {
        let { loading, staffList, columns, optionsLocal, tableLoading, year, yearList } = this.state;

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
                                <FormattedMessage {...messages.salaryIncrement} />
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant='contained'
                                    className='add-modify-button'
                                    onClick={() => this.props.history.push({
                                        pathname: Actions.payroll_salaryincrement.create.url,
                                    })}
                                >
                                    <FormattedMessage {...messages.applyIncrement} />
                                </Button>
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
                            {year > 0 &&
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
                                !year &&
                                <BlankPagewithIcon data={this.getBlankPageMessage()} />
                            }
                        </Grid>
                    </Grid>
                </Paper>
            )
        }
    }
}

export default withRouter(ViewSalaryIncrement)
