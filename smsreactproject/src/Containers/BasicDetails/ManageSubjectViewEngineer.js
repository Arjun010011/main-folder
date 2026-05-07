import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import { Dropdown } from 'Components/DropDown';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest,deleteRequest } from 'Includes/api/apicall';
import { GET_URL,DEL_URL } from 'Includes/urls';
import { nameWithQuoteRegex, nameAndNumberAndHyphenRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getSettingValue } from 'Includes/functions';
import { options } from 'Constants';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import { cloneDeep } from 'lodash';
import ManageSubjectsAction from 'Containers/BasicDetails/ManageSubjectsAction'
import Swal from 'sweetalert2'

const fieldDetails_base = [
    { selectLabel: 'Select Branch', name: 'branch', md: 12, className: 'width-100', required: true,
      id: 'outlined-textarea', default: '', type: 'multiselect', allSelected: 'All branches are selected',
      gridClassName: "margin-vertical-20", list: [] },
    { label: 'Part Type', regex: null, name: 'subject_part_type', md: 12, className: 'width-100', required: true,
      id: 'outlined-textarea', default: '', type: 'dropDown', gridClassName: "margin-vertical-20", list: [] },
    { label: 'Name', regex: nameWithQuoteRegex, autoFocus: true, name: 'name', md: 12, className: 'width-100', required: true,
      id: 'outlined-textarea', default: '', type: 'text', maxLength: 30, gridClassName: "margin-vertical-20" },
    { label: 'Code', regex: nameAndNumberAndHyphenRegex, name: 'subject_code', md: 12, className: 'width-100',
      id: 'outlined-textarea', default: '', type: 'text', maxLength: 30, gridClassName: "margin-vertical-20" },
    { label: <FormattedMessage {...commonMessages.isLanguage} />, name: 'is_language', md: 12, className: 'width-100',
      id: 'outlined-textarea', default: '', type: 'checkbox', gridClassName: "margin-vertical-20",
      hide: parseInt(getSettingValue('number_of_language')) === 0 }
]

class ManageSubjectView extends Component {
    constructor() {
        super()
        let show_engineer = true
        try {
            show_engineer = isFormDefinitionEnabled("certificate_configuration", "show_engineer", 1) === false
        } catch (e) {
            show_engineer = !!parseInt(getSettingValue('show_engineer') || 0)
        }

        // this.permission = updatePermissions(permKey, ['edit', 'delete']);
        this.permission = ['edit', 'delete'];
        this.branch_list = (localStorage.getItem("branches") && localStorage.getItem("branches") !== 'undefined')
            ? JSON.parse(localStorage.getItem("branches")) : [];

        this.state = {
            show_engineer,
            subjectList: [],
            loading: true,
            tableUpdating: false,
            isBranchExist: false,
            optionsLocal: {},
            fieldDetails: [],
            standardListLoaded: false,
            columns: this.getColumns(show_engineer),
            subjectSubjectCategoryList:[],
            selectedSubjectCategory:''
        }
    }

    getColumns = (show_engineer) => {
        const baseCols = [
            { name: "id", label: "id", options: { display: false } },
            { name: "subject_part_type", label: "Part", options: { display: false } },
            {
                name: "subject_name",
                label: (
                    <Box display="flex" alignItems="center" gap={1}>
                        <i className="material-icons" style={{ fontSize: 18, color: "#1976d2" }}>book</i>
                        <FormattedMessage {...commonMessages.subjectName} />
                    </Box>
                ),
                options: {
                    customBodyRender: (value, tableMeta) => (
                        <Box display="flex" alignItems="center">
                            <Box>{value}</Box>
                            {tableMeta.rowData[5] === true && (
                                <Tooltip title="Language">
                                    <Box className="subject-list-is-language" ml={1} />
                                </Tooltip>
                            )}
                        </Box>
                    )
                }
            },
            {
                name: "subject_data",
                label: (
                    <Box display="flex" alignItems="center" gap={1}>
                        <i className="material-icons" style={{ fontSize: 18, color: "#388e3c" }}>sell</i>
                        Code
                    </Box>
                ),
                options: {
                    customBodyRender: (value) => value?.subject_code || "-"
                }
            },
            {
                name: "subject_branch",
                label: "Branch Name",
                options: {
                    customBodyRender: (value) => {
                        const names = Array.isArray(value)
                            ? value.map(b => b?.branch_name).filter(Boolean).join(", ")
                            : (value?.branch_name || "");
                        return (
                            <Tooltip title={names}>
                                <span>{names || "-"}</span>
                            </Tooltip>
                        )
                    }
                }
            },
            {
                name: "is_lab",
                label: (
                    <Box display="flex" alignItems="center" gap={1}>
                        <i className="material-icons" style={{ fontSize: 18, color: "#f57c00" }}>science</i>
                        Lab
                    </Box>
                ),
                options: {
                    customBodyRender: (value) => (
                        <Box
                            px={1}
                            py={0.2}
                            borderRadius="8px"
                            bgcolor={value ? "#e8f5e9" : "#ffebee"}
                            color={value ? "#2e7d32" : "#c62828"}
                            fontSize="0.8rem"
                            fontWeight="500"
                            display="inline-block"
                        >
                            {value ? "Yes" : "No"}
                        </Box>
                    )
                }
            },
            { name: "subject", label: "subject", options: { display: false } },
            // {
            //     name: 'Actions',
            //     label: (
            //         <Box display="flex" alignItems="center" gap={1}>
            //             <i className="material-icons" style={{ fontSize: 18, color: "#444" }}>settings</i>
            //             <FormattedMessage {...commonMessages.actions} />
            //         </Box>
            //     ),
            //     options: {
            //         customBodyRender: (value, tableMeta) => {
            //             const id = tableMeta.rowData[0]
            //             const row = this.state.subjectList.find(r => r.id === id) || {}
            //             return (
            //                 <ActionColumn
            //                     id={id}
            //                     fieldValues={[]}
            //                     label={<FormattedMessage {...messages.editSubject} />}
            //                     fieldDetails={this.state.fieldDetails}
            //                     updatePostFormat={this.updatePostFormat}
            //                     updateType={this.updateType}
            //                     deleteType={this.deleteType}
            //                     baseClassName='action-basic-detail-width'
            //                     enabledActions={this.permission}
            //                     getData={this.getPartTypeList}
            //                     isGetData={true}
            //                 />
            //             )
            //         }
            //     }
            // }
            {
                name: "Action",
                label: <FormattedMessage {...commonMessages.actions} />,
                options: {
                    display: this.permission.length > 0,
                    filter: false,
                    sort: false,
                    viewColumns: false,
                    download: false,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (<div>
                            <ManageSubjectsAction
                                id={tableMeta.rowData[6]}
                                index={tableMeta.rowIndex}
                                deleteStudent={this.deleteSubject}
                                editExtraParams={{
                                    subject_id:tableMeta.rowData[6]
                                }}
                                editURL={Actions.subjects.update.url}
                                viewURL={Actions.subjects.view.url}
                                enabledActions={this.permission}
                                replaceEditToView={true}
                                isFinalized={tableMeta.rowData[6]}
                                access={tableMeta.rowData[7]}
                                creator={tableMeta.rowData[8]}
                                // user={}
                            />
                        </div>
                        );
                    }
                }
            }
        ]

        return baseCols
    }

    componentDidMount = () => {
        this.getList()
        this.getSubjectCategoryList();
        let fieldTemp = this.branch_list.length > 0
            ? cloneDeep(fieldDetails_base)
            : cloneDeep(fieldDetails_base).slice(1)
        this.setState({
            fieldDetails: fieldTemp,
            branch_list: this.branch_list,
            isBranchExist: this.branch_list.length > 0,
            optionsLocal: { ...options }
        })
    }

    getSubjectCategoryList = async () => {
        const url = GET_URL.subjectcategory.api;
        const param = { is_active: true };
        const resp = await getRequest(url, param, this.props);
        if (resp?.status === 200) {
            const subjectSubjectCategoryList = (resp.data?.data).map((d) => ({
                id: d.id,
                name: d.name,
            }))
            this.setState({subjectSubjectCategoryList});
        }
    };

    deleteSubject = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { subjectList, columns } = this.state
        const del_url = DEL_URL.subject.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                subjectList.splice(index, 1)
                this.setState({
                    subjectList,
                    columns: [...columns]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
        this.setState({ tableUpdating: false })
    }

    onchangeSubjectCategory = (e) => {
        const { value } = e.target;
        if (value !== 0) {
            this.setState(
                { selectedSubjectCategory: value, open: false },
                () => this.getList()   // run after state updates
            );
        }
    };

    getList = () => {
        const {selectedSubjectCategory} = this.state
        console.log(selectedSubjectCategory,'selectedSubjectCategory')
        let params = {}
        const url = this.state.show_engineer ? GET_URL.subjectdetails.api : GET_URL.subject.api
        if (this.state.show_engineer){
            params={is_active:true,subject_category_id:selectedSubjectCategory}
        }
        else{
            params={is_active:true}
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({ subjectList: response.data.data, loading: false })
            }
        })
    }

    updatePostFormat = (newData) => newData
    updateType = () => { this.getList(); return true }
    deleteType = (id) => this.setState({ subjectList: this.state.subjectList.filter(s => s.id !== id) })
    onTableChange = (tableState) => this.setState({ optionsLocal: { ...this.state.optionsLocal, searchText: tableState.searchText } })

    render() {
        const { loading, subjectList, columns, tableUpdating, optionsLocal, subjectSubjectCategoryList, selectedSubjectCategory } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            ) 
        }
        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box display="flex" alignItems="center" gap={1} fontSize="1.3rem" fontWeight="600">
                                <i className="material-icons" style={{ fontSize: 22, color: "#1976d2" }}>menu_book</i>
                                <FormattedMessage {...commonMessages.subjects} />
                            </Box>
                        </Grid>
                        <Grid item md={12} xs={12} className='p-t-20px'>
                            <Dropdown
                                data={subjectSubjectCategoryList}
                                name='selectedSubjectCategory'
                                value={selectedSubjectCategory}
                                onChange={this.onchangeSubjectCategory}
                                label='Subject Category'
                                hideSelect
                            />
                        </Grid>
                        <Grid item md={12} xs={12}>
                            <Box display="flex" justifyContent="flex-end" alignItems="center">
                                {isUserHasPermission('subjects', 'create') && (
                                <Button
                                    variant="contained"
                                    component={Link}
                                    to={Actions.subjects.create.url}
                                    className="editbutton-view"
                                >
                                    <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                                    Create Subject
                                </Button>
                                )}
                            </Box>
                            </Grid>
                    </Grid>
                    <Grid container className={classNames('header-align')}>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    key="subjects"
                                    title={tableUpdating ? <CircularProgress size={24} /> : ""}
                                    data={subjectList}
                                    columns={columns}
                                    options={optionsLocal}
                                    onTableChange={this.onTableChange}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        )
    }
}
export default ManageSubjectView
