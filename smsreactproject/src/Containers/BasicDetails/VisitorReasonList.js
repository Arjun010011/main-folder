import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import {  withRouter } from 'react-router-dom';
import classNames from 'classnames';

import { Dropdown } from 'Components/DropDown';
import ActionColumn from 'Components/ActionColumnNew';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getSettingValue, updatePermissions, getKeyValueMap, getUrlParam } from 'Includes/functions';
import { options } from 'Constants';
import messages from './messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const fieldDetails = [
    {
        label: 'Reason Name', regex: nameAndNumberRegex, autoFocus: true, name: 'name', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30, gridClassName: "margin-vertical-20",
    },
]
class VisitorReasonList extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('visitor_reasons', ['update', 'delete']);
        this.state = {
            reasonList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            reasonTypeList:[],
            reasonType:'',
            error:{},
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false
                    }
                },
                {
                    name: "name",
                    label: 'Reason Name',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'Actions',
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.permission.length > 0,
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={[tableMeta.rowData[1], tableMeta.rowData[2]]}
                                    label='Edit Reason Name'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.reason.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.reason.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.permission}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }

    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
        }
        return payload
    }

    componentDidMount = () => {
        let { reasonType } = getUrlParam();
        this.setState({
            reasonType
        },()=>{
            if(reasonType){
                this.getVisitorReasonList()
            }
        })
        this.getVisitorReasonTypeList()
    }

    getVisitorReasonTypeList=()=>{
        const url = GET_URL.reason.api
        const params = { is_active: true ,reason_types:1}
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data)=>{
                    if(data.label==='School Visitor'){
                        data.label=`${alias_names['school']} Visitor`
                    }
                })
                this.setState({
                    reasonTypeList:response.data.data,
                    loading: false
                })
            }
        })
    }

    getVisitorReasonList = () => {
        const{reasonType}=this.state;
        const url = GET_URL.reason.api
        const params = { is_active: true ,reason_type:reasonType}
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    reasonList:response.data.data,
                    loading: false
                })

            }
        })
    }

    updateType = (newData, id) => {
        let subject = this.state.reasonList;
        for (const data of subject) {
            if (data.id === id) {
                data.name = newData.name;
                data.is_language = newData.is_language;
                break;
            }
        }
        this.setState({
            reasonList: [...subject],
        })
        return true
    }

    deleteType = async (id) => {
        let subject = this.state.reasonList
        subject.map((data, index) => {
            if (data.id === id) {
                subject.splice(index, 1)
            }
        })
        this.setState({
            reasonList: subject
        })
    }

    onChange=(e)=>{
        let{name,value}=e.target
        this.setState({[name]:value,error:{}},()=>{
            this.getVisitorReasonList()
        })
    }

    handleAddReason=(e)=>{
        let { reasonType, reasonTypeList,error } = this.state;
        let reasonTypeInformation = {}
        if (!!reasonType) {
            let reasonTypeName = getKeyValueMap(reasonTypeList, 'id', 'label')
            reasonTypeName = reasonTypeName[reasonType]
            reasonTypeInformation = {
                reasonType: reasonType,
                reasonTypeName: reasonTypeName,
            }
            let searchParam = "?" + new URLSearchParams(reasonTypeInformation).toString()
            this.props.history.push({
                pathname: Actions.visitor_reasons.create.url,
                search: searchParam,
            });
        }
        else{
            error['reasonType']='Select Reason Type'
            this.setState({
                error
            })
        }
    }

    render() {
        const { loading, reasonList, columns, tableUpdating, reasonTypeList, reasonType, error } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Visitor Reasons
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('visitor_reasons', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddReason}
                                        // component={Link} to={Actions.visitor_reasons.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.visitor_reasons.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>

                        <Box className='header-align mv-30'>
                            <Dropdown
                                data={reasonTypeList}
                                name='reasonType'
                                value={reasonType}
                                onChange={this.onChange}
                                label={'Reason Type'}
                                hideSelect={true}
                                customName='label'
                                error={error['reasonType']}
                            />
                        </Box>

                        <Grid container className={classNames('header-align')}>
                            <Grid item md={6} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={reasonList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={reasonList}
                                        columns={columns}
                                        options={options}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(VisitorReasonList)
