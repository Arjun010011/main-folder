import React, { Component } from 'react'
import { Paper, Box, Button, Grid, Tooltip } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import LoadingGif from 'Components/LoadingGif';
import { Actions } from 'Constants/permissions';
import { options } from 'Constants';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { updatePermissions, isUserHasPermission } from 'Includes/functions';
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';
import ActionColumn from 'Components/ActionColumnNew';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { Link } from "react-router-dom";
import InfoIcon from "@material-ui/icons/Info";


const fieldDetails = [
    {
        label: <FormattedMessage {...messages.componentName} />, regex: nameAndNumberRegex,
        name: 'name', md: 6, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text',
        autoFocus: true, maxLength: '25'
    },
    {
        label: 'Codename', regex: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
        name: 'codename', md: 6, className: 'width-100', required: false,
        id: 'outlined-codename', default: '', rows: null, type: 'text',
        autoFocus: false, maxLength: '25'
    },
]

class ViewSalaryComponent extends Component {


    constructor() {
        super();
        this.permission = updatePermissions('payroll_salarycomponent', ['update', 'delete']);
        this.state = {
            componentList: [],
            selectedToggle: 0,
            loading: true,
            tableLoading: false,
            addComponentPermission: isUserHasPermission('payroll_salarycomponent', 'create'),
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
                    label: <FormattedMessage {...messages.componentName} />,
                    options: {
                        filter: true,
                        sort: true
                    }
                },
                {
                    name: 'is_deduction',
                    label: <FormattedMessage {...messages.componentType} />,
                    options: {
                        filter: false,
                        sort: false,
                        display: true,
                        customBodyRender: (value) => {
                            let color, name;
                            if (value) {
                                color = '#e92020';
                                name = <FormattedMessage {...messages.deductions} />;
                            }
                            else {
                                color = '#007EFF';
                                name = <FormattedMessage {...messages.earnings} />;
                            }
                            return (
                                <Box>
                                    <Box style={{ textTransform: 'capitalize', color: color, fontSize: '18px' }}>{name}</Box>
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: 'codename',
                    label: 'Codename',
                    options: {
                        filter: true,
                        sort: true,
                        display: true,
                        customBodyRender: (value) => {
                            return value ? (
                                <Box style={{
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    backgroundColor: '#f5f5f5',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    display: 'inline-block'
                                }}>{value}</Box>
                            ) : <span style={{ color: '#999' }}>—</span>
                        }
                    }
                },
                {
                    name: "Actions",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.permission.length > 0,
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            if (tableMeta.rowData[3]) {
                                return (
                                    <Tooltip
                                        title="Default components can't be edited/deleted"
                                        placement="top-start"
                                        arrow
                                    >
                                        <InfoIcon />
                                    </Tooltip>
                                );
                            }
                            else {
                                return (<div>
                                    <ActionColumn
                                        id={tableMeta.rowData[0]}
                                        fieldValues={[tableMeta.rowData[1], tableMeta.rowData[3] || '']}
                                        label={<FormattedMessage {...messages.editComponentName} />}
                                        fieldDetails={fieldDetails}
                                        baseClassName='action-basic-detail-width'
                                        updateUrl={PUT_URL.salarycomponent.api}
                                        updatePostFormat={this.updatePostFormat}
                                        updateType={this.updateType}
                                        deleteUrl={DEL_URL.salarycomponent.api}
                                        deleteType={this.deleteType}
                                        enabledActions={this.permission}
                                    />
                                </div>
                                );
                            }
                        }
                    }
                }
            ],
        }
    }


    componentDidMount() {
        this.getSalaryComponentList();
    }


    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
            codename: newData.codename || undefined,
        }
        return payload
    }

    updateType = (newData, id) => {
        let salaryComponent = this.state.componentList;
        for (const data of salaryComponent) {
            if (data.id === id) {
                data.name = newData.name;
                if (newData.codename !== undefined) data.codename = newData.codename;
                break;
            }
        }
        this.setState({
            componentList: [...salaryComponent]
        })
        return true
    }

    deleteType = async (id) => {
        let componentList = this.state.componentList
        let index = componentList.findIndex(data => data.id === id);
        componentList.splice(index, 1);
        this.setState({
            componentList: [...componentList]
        });
    }


    getSalaryComponentList = () => {
        this.setState({ tableLoading: true, componentList: [] });
        let params = { is_active: true, is_deduction: this.state.selectedToggle };
        getRequest(GET_URL.salarycomponent.api, params, this.props).then(response => {
            if (response && response.status === 200) {
                let componentList = response.data.data;
                this.setState({
                    componentList,
                    loading: false,
                    tableLoading: false
                })
            }
        })
    }


    changeToggle = (event, value) => {
        if (value !== null) {
            this.setState({
                selectedToggle: value
            }, () => {
                this.getSalaryComponentList();
            });
        }
    }


    render() {
        let { loading, componentList, selectedToggle, columns, tableLoading, addComponentPermission } = this.state;
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
                                <FormattedMessage {...messages.salaryComponent} />
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {addComponentPermission && (
                                    <Button
                                        variant="contained"
                                        component={Link}
                                        to={Actions.payroll_salarycomponent.create.url}
                                        className='editbutton-view'
                                    >
                                        <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                                        <FormattedMessage {...messages.salaryComponent} />
                                    </Button>
                                )}
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container >
                        <Grid item md={12} xs={12} className='end-flex-prop toggle-padding margin'>
                            <ToggleButtonGroup size="small" value={selectedToggle} exclusive onChange={this.changeToggle}>
                                <ToggleButton key={1} value={0}>
                                    <FormattedMessage {...messages.earnings} />
                                </ToggleButton>,
                                <ToggleButton key={2} value={1}>
                                    <FormattedMessage {...messages.deductions} />
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                    <Grid container spacing={3} className='flex-justify-center'>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    data={componentList}
                                    columns={columns}
                                    options={option}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
            </>
        )
    }
}

export default withRouter(ViewSalaryComponent)
