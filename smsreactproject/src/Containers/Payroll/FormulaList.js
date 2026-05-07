import React, { Component } from 'react'
import { Paper, Box, Button, Grid, Tooltip } from '@material-ui/core';
import { withRouter, Link } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import LoadingGif from 'Components/LoadingGif';
import { Actions } from 'Constants/permissions';
import { options } from 'Constants';
import { updatePermissions, isUserHasPermission } from 'Includes/functions';
import ActionColumn from 'Components/ActionColumnNew';
import { formulaNameRegex } from 'Constants/regularExpression';
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';

const fieldDetails = [
    {
        label: 'Formula Name', regex: formulaNameRegex,
        name: 'name', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text',
        autoFocus: true, maxLength: '100',
        gridClassName: 'margin-vertical-10',
    },
    {
        label: 'Description', regex: null,
        name: 'description', md: 12, className: 'width-100', required: false,
        id: 'outlined-description', default: '', rows: null, type: 'text',
        autoFocus: false, maxLength: '250',
        gridClassName: 'margin-vertical-10',
    },
    {
        label: 'Is Default', regex: null,
        name: 'is_default', md: 12, className: 'width-100', required: false,
        id: 'formula_default', default: false, type: 'dropDown',
        list: [{ id: true, name: 'Yes' }, { id: false, name: 'No' }],
        gridClassName: 'margin-vertical-10',
    },
]

class FormulaList extends Component {

    constructor() {
        super();
        this.permission = updatePermissions('payroll_formulalist', ['update', 'delete']);
        this.state = {
            formulas: [],
            loading: true,
            tableLoading: false,
            addFormulaPermission: isUserHasPermission('payroll_formulalist', 'create'),
            columns: [
                {
                    name: 'id',
                    label: 'id',
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: 'name',
                    label: 'Name',
                    options: {
                        filter: true,
                        sort: true
                    }
                },
                {
                    name: 'description',
                    label: 'Description',
                    options: {
                        filter: false,
                        sort: false,
                        display: true,
                        customBodyRender: (value) => {
                            return value || <span style={{ color: '#999' }}>—</span>
                        }
                    }
                },
                {
                    name: 'is_default',
                    label: 'Default',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (v) => v
                            ? <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>Yes</span>
                            : 'No'
                    }
                },
                {
                    name: 'Actions',
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.permission.length > 0,
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <div>
                                    <ActionColumn
                                        id={tableMeta.rowData[0]}
                                        fieldValues={[tableMeta.rowData[1], tableMeta.rowData[2] || '', tableMeta.rowData[3]]}
                                        label={<FormattedMessage {...messages.editFormulaName} />}
                                        fieldDetails={fieldDetails}
                                        baseClassName='action-basic-detail-width'
                                        updateUrl={PUT_URL.salaryformula.api}
                                        updatePostFormat={this.updatePostFormat}
                                        updateType={this.updateType}
                                        deleteUrl={DEL_URL.salaryformula.api}
                                        deleteType={this.deleteType}
                                        enabledActions={this.permission}
                                    />
                                </div>
                            );
                        }
                    }
                }
            ],
        }
    }

    componentDidMount() {
        this.getFormulaList();
    }

    updatePostFormat = (newData) => {
        return {
            name: newData.name,
            description: newData.description || '',
            is_default: newData.is_default || false,
        }
    }

    updateType = (newData, id) => {
        let formulas = this.state.formulas;
        for (const data of formulas) {
            if (data.id === id) {
                data.name = newData.name;
                data.is_default = newData.is_default || false;
                if (newData.description !== undefined) data.description = newData.description;
                break;
            }
        }
        this.setState({ formulas: [...formulas] });
        return true;
    }

    deleteType = async (id) => {
        let formulas = this.state.formulas;
        let index = formulas.findIndex(data => data.id === id);
        formulas.splice(index, 1);
        this.setState({ formulas: [...formulas] });
    }

    getFormulaList = () => {
        this.setState({ tableLoading: true, formulas: [] });
        getRequest(GET_URL.salaryformula.api, { is_active: true }, this.props).then(response => {
            if (response && response.status === 200) {
                let formulas = response.data.data || response.data;
                this.setState({
                    formulas: Array.isArray(formulas) ? formulas : [],
                    loading: false,
                    tableLoading: false
                });
            }
        });
    }

    render() {
        let { loading, formulas, columns, tableLoading, addFormulaPermission } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        let option = {
            ...options,
            textLabels: {
                body: {
                    noMatch: tableLoading ? 'Loading...' : 'Sorry, there is no matching data to display',
                },
            }
        }
        return (
            <>
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                <FormattedMessage {...messages.salaryFormula} />
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <Box className='header-align end-flex-prop'>
                                {addFormulaPermission && (
                                    <Button
                                        variant='contained'
                                        component={Link}
                                        to={Actions.payroll_formulalist.create.url}
                                        className='editbutton-view'
                                    >
                                        <AddCircleOutlineOutlinedIcon className='visibility-icon' />{' '}
                                        <FormattedMessage {...messages.salaryFormula} />
                                    </Button>
                                )}
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3} className='flex-justify-center'>
                        <Grid item md={12} xs={12}>
                            <Box mt={2} width="100%">
                                <Paper>
                                    <AllMUIDataTable
                                        data={formulas}
                                        columns={columns}
                                        options={option}
                                    />
                                </Paper>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </>
        )
    }
}

export default withRouter(FormulaList)
