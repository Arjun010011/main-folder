import React, { Component } from 'react'
import { Paper, Box, CircularProgress, Grid, Button, TextField, MenuItem } from '@material-ui/core';
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';

import { Dropdown } from 'Components/DropDown';
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import AddSection from './Components/AddSection';
import ModifyPrevStandard from 'Containers/BasicDetails/Components/ModifyPrevStandard';
import { getAcademicYear, SetAcademicYear, isUserHasPermission, getLocalStorageDetails } from 'Includes/functions';
import { getRequest, deleteRequest, putRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, PUT_URL, POST_URL } from 'Includes/urls';
import loadingBar from 'images/loading.gif';
import { Actions } from 'Constants/permissions';
import ActionColumn from 'Components/ActionColumnNew';
import Card from 'Components/Card';
import { numberRegex } from 'Constants/regularExpression'
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages'

const SUCCESS_MSG_PROPS = { position: 'top-end', icon: 'success', showConfirmButton: false, timer: 2500 };

const fieldDetails = [
    {
        label: <FormattedMessage {...commonMessages.maxStrength} values={{ value: '' }} />, regex: numberRegex, name: 'strength', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: true, maxLength: '3', minValue: '1'
    },
]

const columnsHeader = [
    { name: 'section__name', label: <FormattedMessage {...commonMessages.section} />, className: 'width-45' },
    { name: 'strength', label: <FormattedMessage {...commonMessages.maxStrength} values={{ value: '' }} />, className: 'width-45' },
    { name: 'enabledActions', label: '', className: 'width-10' }
]


class StrengthCards extends Component {
    constructor() {
        super()
        this.state = {
            closeMenu: true,
            yearList: [],
            year: '',
            blank: true,
            strengthData: [],
            pageLoading: true,
            loading: true,
            updateData: '',
            prevStandardExist: false,
            infoMessage: 'Select Academic Year',
            // Copy mode state
            copyMode: false,
            copySourceYear: '',
            copyTargetYear: '',
            copySourceStandard: '',
            copySourceStandardList: [],
            copySourceStrengthData: [],
            copySubmitDisabled: false,
        }
    }

    onChange = async (e) => {
        let name = e.target.name;
        let value = e.target.value;
        if (value !== 0 && value !== this.state.year) {
            this.setState({
                [name]: value,
                loading: true,
                prevStandardExist: false
            })
            SetAcademicYear(value)
            this.getStandardSectionStrength(value)
        }
    }

    async componentDidMount() {
        this.updatePermission();
        this.getYearList();
        if (getAcademicYear()) {
            let year = getAcademicYear()
            if (year !== 0) {
                this.getStandardSectionStrength(year)
            }
        }
        else {
            this.setState({
                pageLoading: false,
                loading: false
            })
        }
    }

    getYearList = () => {
        const url = GET_URL.getacademicyear.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data,
                })
            }
        })
    }

    getStandardSectionStrength = (year) => {
        const url = GET_URL.strength.api
        const params = { academic_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let strength = response.data.data
                this.updateStrength(strength, year);
            }
        })
    }

    updateStrength = (strength, year) => {
        let { prevStandardExist } = this.state
        strength.map((data) => {
            if (data.prev_standard !== null) {
                prevStandardExist = true
            }
            return (
                data.section.map((sectionData) => {
                    return (
                        sectionData.enabledActions =
                        <ActionColumn
                            id={sectionData.id}
                            fieldValues={[sectionData.strength]}
                            label={<FormattedMessage {...messages.editStrengthFor} values={{ standard_name: data.standard__name, section_name: sectionData.section__name }} />}
                            fieldDetails={fieldDetails}
                            updatePostFormat={this.updatePostFormat}
                            updateUrl={PUT_URL.strength.api}
                            updateType={this.updateSection}
                            deleteUrl={DEL_URL.strength.api}
                            deleteType={this.deleteSection}
                            isMultipleDelete={true}
                            baseClassName='action-basic-detail-width'
                            enabledActions={this.state.enabledActions}
                        />
                    )
                })
            )

        })
        this.setState({
            strengthData: strength,
            year: year,
            blank: strength.length === 0 ? true : false,
            infoMessage: strength.length === 0 ? <FormattedMessage {...messages.thereIsNoStandardAddStandard} /> : '',
            loading: false,
            pageLoading: false,
            closeMenu: '',
            prevStandardExist,
        })
    }

    closeMenuAction = (status) => {
        this.setState({
            closeMenu: status,
            errorContent: '',
        }, () => {
            this.updateStrength(this.state.strengthData, this.state.year)
        })
    }

    updatePermission = () => {
        const hasEditPermission = isUserHasPermission('standard_strength', 'update')
        const hasDeletePermission = isUserHasPermission('standard_strength', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('standard_strength');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('standard_strength');
        }
        this.setState({
            enabledActions: enabledActions,
            permissions,
            columns: this.state.columns
        })
    }

    updateNewSection = (standardId, newData, total) => {
        newData.enabledActions =
            <ActionColumn
                id={newData.id}
                closeMenu={this.state.closeMenu}
                updateData={this.state.updateData}
                fieldValues={[newData.strength]}
                label={`Please Update ${newData.section__name} Strength`}
                fieldDetails={fieldDetails}
                updateUrl={PUT_URL.strength.api}
                updateType={this.updateSection}
                updatePostFormat={this.updatePostFormat}
                deleteUrl={DEL_URL.strength.api}
                deleteType={this.deleteSection}
                isMultipleDelete={true}
                baseClassName='action-basic-detail-width'
                enabledActions={this.state.enabledActions}
            />
        let strength = this.state.strengthData
        strength.some((standardData, sindex) => {
            if (standardData.standard === standardId) {
                return strength[sindex].section = strength[sindex].section.concat(newData)
            }
        })
        this.updateTotalStrength(standardId)
        this.setState({
            strength,
            strengthData: strength
        })
    }

    updatePostFormat = (newData, id) => {
        let strengthDataTemp = this.state.strengthData
        let temp = {}
        strengthDataTemp.map((strengthData) => {
            return strengthData.section.map((sectionData) => {
                if (sectionData.id === id) {
                    temp.id = sectionData.id
                    temp.section = sectionData.section
                    temp.standard = sectionData.standard
                    temp.strength = newData.strength
                }
            })
        })
        return temp
    }

    updateSection = (newData, id) => {
        this.setState({ updateData: true })
        let standardTemp
        let { strengthData, year } = this.state
        strengthData.map((strengthDataTemp, standardIndex) => {
            return strengthDataTemp.section.map((sectionData, sectionIndex) => {
                if (sectionData.id === id) {
                    standardTemp = sectionData.standard
                    return strengthData[standardIndex]['section'][sectionIndex].strength = newData.strength
                }
            })
        })
        this.setState({
            strengthData
        }, () => {
            this.updateStrength(strengthData, year)
            this.updateTotalStrength(standardTemp)
        })
        return true
    }

    deleteSection = async (id) => {
        let strengthDataTemp = this.state.strengthData
        let standardId
        strengthDataTemp.map((strengthData, standardIndex) => {
            return strengthData.section.map((sectionData, sectionIndex) => {
                if (id === sectionData.id) {
                    strengthDataTemp[standardIndex]['section'].splice(sectionIndex, 1)
                    if (strengthDataTemp[standardIndex]['section'].length === 0) {
                        strengthDataTemp.splice(standardIndex, 1);
                    }
                    standardId = sectionData.standard
                }
            })
        })
        this.updateTotalStrength(standardId)
        this.setState({
            strengthData: [...strengthDataTemp]
        })
    }

    deleteStandard = (standardId) => {
        let strengthDataTemp = this.state.strengthData
        let id = []
        strengthDataTemp.map((strengthData) => {
            if (strengthData.standard === standardId) {
                return strengthData.section.map((sectionData) => {
                    return id.push(sectionData.id)
                })
            }
        })
        const del_url = DEL_URL.strength.api
        const data = { data: id }
        const url = del_url + 1 + '/';
        deleteRequest(url, data, this.props).then(response => {
            if (response && response.status === 200) {
                id.map((dataID) => {
                    return strengthDataTemp.map((strengthData, index) => {
                        if (strengthData.standard === standardId) {
                            return strengthDataTemp.splice(index, 1)
                        }
                    })
                })
                this.setState({
                    strengthData: [...strengthDataTemp],
                    blank: strengthDataTemp.length === 0 ? true : false,
                    infoMessage: strengthDataTemp.length === 0 ? <FormattedMessage {...messages.thereIsNoStandardAddStandard} /> : '',
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
    }

    updateTotalStrength = (standardId) => {
        let totalStrength = 0
        let strengthDataTemp = this.state.strengthData
        strengthDataTemp.map((strengthData, standardIndex) => {
            if (strengthData.standard === standardId) {
                if (standardId === strengthData.standard) {
                    return strengthData.section.map((sectionData) => {
                        totalStrength = parseInt(totalStrength) + parseInt(sectionData.strength)
                        strengthDataTemp[standardIndex]['strength__sum'] = totalStrength
                    })
                }
            }
        })
    }

    // ---- Copy Mode Methods ----
    toggleCopyMode = () => {
        this.setState(prev => ({
            copyMode: !prev.copyMode,
            copySourceYear: '',
            copyTargetYear: '',
            copySourceStandard: '',
            copySourceStandardList: [],
            copySourceStrengthData: [],
        }));
    }

    onCopySourceYearChange = (e) => {
        const value = e.target.value;
        this.setState({
            copySourceYear: value,
            copySourceStandard: '',
            copySourceStandardList: [],
            copySourceStrengthData: [],
        });
        // Fetch standards for this source year
        const url = GET_URL.strength.api;
        const params = { academic_year: value };
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const data = response.data.data;
                const standardList = data.map(d => ({ id: d.standard, name: d.standard__name }));
                this.setState({
                    copySourceStandardList: standardList,
                    copySourceStrengthData: data,
                });
            }
        });
    }

    onCopyTargetYearChange = (e) => {
        this.setState({ copyTargetYear: e.target.value });
    }

    onCopySourceStandardChange = (e) => {
        this.setState({ copySourceStandard: e.target.value });
    }

    copyAllStandards = () => {
        const { copySourceYear, copyTargetYear, yearList } = this.state;
        if (!copySourceYear || !copyTargetYear) return;
        const sourceYearName = yearList.find(y => y.id === parseInt(copySourceYear))?.name || copySourceYear;
        const targetYearName = yearList.find(y => y.id === parseInt(copyTargetYear))?.name || copyTargetYear;

        Swal.fire({
            title: 'Copy All Standards?',
            text: `This will copy ALL standards (with sections & strengths) from ${sourceYearName} to ${targetYearName}. Already existing standard-section combos will be skipped.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Copy All',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.value) {
                this.setState({ copySubmitDisabled: true });
                const payload = {
                    academic_year: copyTargetYear,
                    copy_from_academic_year: copySourceYear,
                };
                postRequest(POST_URL.strengthfrompreviousyear.api, payload, this.props).then(
                    (response) => {
                        if (response && response.status === 200) {
                            // Refresh the current view
                            if (this.state.year) {
                                this.getStandardSectionStrength(this.state.year);
                            }
                            this.setState({ copyMode: false });
                            Swal.fire({
                                ...SUCCESS_MSG_PROPS,
                                title: response.data.Reason || 'Standards copied successfully',
                            });
                        }
                        this.setState({ copySubmitDisabled: false });
                    }
                );
            }
        });
    }

    copySingleStandard = () => {
        const { copySourceYear, copyTargetYear, copySourceStandard, yearList, copySourceStandardList } = this.state;
        if (!copySourceYear || !copyTargetYear || !copySourceStandard) return;
        const standardName = copySourceStandardList.find(s => s.id === parseInt(copySourceStandard))?.name || copySourceStandard;
        const targetYearName = yearList.find(y => y.id === parseInt(copyTargetYear))?.name || copyTargetYear;

        Swal.fire({
            title: 'Copy Standard?',
            text: `This will copy "${standardName}" with its sections & strengths to ${targetYearName}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Copy',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.value) {
                this.setState({ copySubmitDisabled: true });
                const payload = {
                    academic_year: copyTargetYear,
                    copy_from_academic_year: copySourceYear,
                    standard_ids: [parseInt(copySourceStandard)],
                };
                postRequest(POST_URL.strengthfrompreviousyear.api, payload, this.props).then(
                    (response) => {
                        if (response && response.status === 200) {
                            if (this.state.year) {
                                this.getStandardSectionStrength(this.state.year);
                            }
                            this.setState({ copyMode: false });
                            Swal.fire({
                                ...SUCCESS_MSG_PROPS,
                                title: response.data.Reason || 'Standard copied successfully',
                            });
                        }
                        this.setState({ copySubmitDisabled: false });
                    }
                );
            }
        });
    }

    render() {
        const { year, yearList, strengthData, pageLoading, loading, infoMessage } = this.state
        return (
            <>
                {pageLoading &&
                    <Box display='flex'>
                        <img src={loadingBar} className='loading' alt='loading' />
                    </Box>
                }{
                    !pageLoading &&

                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={6} xs={12} className='header-align'>
                                <Box className='heading'>
                                    <FormattedMessage {...messages.classStrengthLabel} />
                                </Box>
                            </Grid>
                            {year &&
                                <Grid item md={6} xs={12} >
                                    <Box className='header-align end-flex-prop' style={{ gap: 8 }}>
                                        {getLocalStorageDetails('user', 'object').is_superuser && (
                                            <Button
                                                variant="outlined"
                                                color={this.state.copyMode ? 'secondary' : 'primary'}
                                                onClick={this.toggleCopyMode}
                                                className='editbutton-view'
                                            >
                                                <FileCopyOutlinedIcon className='visibility-icon' />
                                                {this.state.copyMode ? 'Cancel Copy' : 'Copy Standard'}
                                            </Button>
                                        )}
                                        {isUserHasPermission('standard_strength', 'create') && <Button
                                            variant="contained"
                                            component={Link} to={Actions.standard_strength.create.url}
                                            className='editbutton-view'
                                        ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.standard_strength.create.label}</Button>}
                                    </Box>
                                </Grid>
                            }
                        </Grid>
                        <Box className='header-align m-bt-15px'>
                            {!pageLoading &&
                                <Dropdown
                                    data={yearList}
                                    name='year'
                                    value={year}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.academicYear} />}
                                    hideSelect={true}
                                    fullWidth
                                />
                            }
                        </Box>

                        {/* Copy Mode UI */}
                        {this.state.copyMode && (
                            <Box mt={2} mb={2} p={2} style={{ background: '#f5f5f5', borderRadius: 8 }}>
                                <Box display="flex" flexWrap="wrap" alignItems="center" style={{ gap: 16 }}>
                                    <TextField
                                        select
                                        label="Source Academic Year"
                                        value={this.state.copySourceYear}
                                        onChange={this.onCopySourceYearChange}
                                        variant="outlined"
                                        size="small"
                                        style={{ minWidth: 200 }}
                                    >
                                        {yearList.map((y) => (
                                            <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                                        ))}
                                    </TextField>

                                    <TextField
                                        select
                                        label="Target Academic Year"
                                        value={this.state.copyTargetYear}
                                        onChange={this.onCopyTargetYearChange}
                                        variant="outlined"
                                        size="small"
                                        style={{ minWidth: 200 }}
                                        disabled={!this.state.copySourceYear}
                                    >
                                        {yearList.filter(y => y.id !== parseInt(this.state.copySourceYear)).map((y) => (
                                            <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                                        ))}
                                    </TextField>

                                    <TextField
                                        select
                                        label="Source Standard (Optional)"
                                        value={this.state.copySourceStandard}
                                        onChange={this.onCopySourceStandardChange}
                                        variant="outlined"
                                        size="small"
                                        style={{ minWidth: 200 }}
                                        disabled={!this.state.copySourceYear}
                                    >
                                        <MenuItem value=""><em>All Standards</em></MenuItem>
                                        {this.state.copySourceStandardList.map((s) => (
                                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                        ))}
                                    </TextField>

                                    {this.state.copySourceYear && this.state.copyTargetYear && !this.state.copySourceStandard && (
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            disabled={this.state.copySubmitDisabled}
                                            onClick={this.copyAllStandards}
                                        >
                                            Copy All Standards
                                        </Button>
                                    )}

                                    {this.state.copySourceYear && this.state.copyTargetYear && this.state.copySourceStandard && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            disabled={this.state.copySubmitDisabled}
                                            onClick={this.copySingleStandard}
                                        >
                                            Copy Selected
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        )}

                        {loading &&
                            <Box display='flex'>
                                <CircularProgress className='loading' />
                            </Box>
                        }

                        {
                            (this.state.blank === true && !loading) &&
                            <BlankPagewithIcon data={infoMessage} />
                        }
                        {
                            (this.state.blank === false && !loading) &&
                            <Box>
                                <Box className='strength-card-position'>
                                    {strengthData.map((strengthData, index) => {
                                        return (
                                            <Card
                                                key={`card-${index}`}
                                                header={strengthData.standard__name}
                                                subHeader={<FormattedMessage {...commonMessages.maxStrength} values={{ value: strengthData.strength__sum }} />}
                                                columnsHeader={columnsHeader}
                                                columnsData={strengthData.section}
                                                action={
                                                    (isUserHasPermission('standard_strength', 'create') || isUserHasPermission('standard_strength', 'delete')) ?
                                                        <AddSection
                                                            year={year}
                                                            baseClassName='action-basic-detail-width'
                                                            strengthData={strengthData}
                                                            updateSectionData={this.updateNewSection}
                                                            deleteStandard={this.deleteStandard}
                                                            loading={pageLoading}
                                                        />
                                                        : ''
                                                }
                                            />
                                        )
                                    })
                                    }
                                </Box>

                            </Box>
                        }
                    </Paper>
                }
            </>
        )

    }
}


export default (StrengthCards);

