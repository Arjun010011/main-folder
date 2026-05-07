import React, { Component } from 'react'
import { Grid, CircularProgress, Box, TextField } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';

import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import { getKeyValueMap } from 'Includes/functions';
import './styles.scss';
export default class index extends Component {
    constructor(props) {
        super(props)

        this.state = {
            fieldErrors: {},
            datalist: {},
            religion: {},
            student: {},
            studentLoading: { religion: false, category: false, caste: false },
            showDropDown: [],
            loading: true
        }
    }

    componentDidMount = () => {
        this.setDefaultValues();
    }

    setDefaultValues = () => {
        let { student, fieldErrors } = this.state
        const { studentDetails } = this.props
        studentDetails.map((fields) => {
            student[fields.name] = fields.default;
            fieldErrors[fields.name] = '';
        })
        this.setState({ student, fieldErrors });
        this.getNationalityList();
    }

    getNationalityList = async () => {
        let datalist = { ...this.state.datalist };
        const url = GET_URL.nationality.api;
        const params = { is_active: true };
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                datalist['nationality'] = response.data.data;
                const showDropDown = ['nationality'];
                this.setState({
                    datalist,
                    showDropDown,
                    loading: false
                }, () => {
                    if (this.props.isEditForm) {
                        this.props.studentDetails.forEach((data) => {
                            this.handleDropDown(data.name, data.default, 'isEdit')
                        });
                    }
                    else {
                        this.props.updateList(datalist)
                    }
                })
            }
        })
    }

    handleChange = (e, field) => {
        let { fieldErrors, student } = this.state
        let value = e.target.value;
        let name = e.target.name;
        fieldErrors[field.name] = '';
        student[name] = value
        this.setState({
            student,
            fieldErrors
        })
    }
    onBlurValidation = (e, field) => {
        let { fieldErrors, student } = this.state
        let value = e.target.value;
        let name = e.target.name;
        fieldErrors[name] = '';
        if (field.required && (value === '' || value === null || value === 0)) {
            fieldErrors[name] = ` ${field.label} is Mandatory`;
        }
        else if (field.regex && !field.regex.value.test(value) && value !== '') {
            fieldErrors[name] = field.regex.errorText;
        }
        this.setState({
            fieldErrors
        }, () => {
            student[name] = value
            this.props.updateParentReligion(student)
        })
    }

    updateErrors = (fieldErrors) => {
        this.setState({
            fieldErrors: fieldErrors
        })
    }

    handleDropDown = (name, value, field) => {
        let getList
        let url
        let showDropDown = []
        let { fieldErrors, datalist, studentLoading, student } = this.state
        if (value !== 0 || !field.required) {
            fieldErrors[name] = '';
            student[name] = value
            this.setState({
                student
            })
            if (value === 0) {
                if (name === 'nationality') {
                    showDropDown = ['nationality']
                    datalist['religion'] = []
                    datalist['category'] = []
                    datalist['caste'] = []
                    student['nationality'] = ''
                    student['religion'] = ''
                    student['category'] = ''
                    student['caste'] = ''
                }
                else if (name === 'caste') {
                    showDropDown = ['nationality', 'religion', 'category', 'caste']
                    student['caste'] = ''
                    return
                }
                else if (name === 'religion') {
                    showDropDown = ['nationality', 'religion']
                    datalist['category'] = []
                    datalist['caste'] = []
                    student['religion'] = ''
                    student['category'] = ''
                    student['caste'] = ''
                }
                else if (name === 'category') {
                    showDropDown = ['nationality', 'religion', 'category']
                    datalist['caste'] = []
                    student['category'] = ''
                    student['caste'] = ''
                }
                this.setState({
                    student,
                    datalist,
                    showDropDown
                })
                this.updateAddressNames();
                this.props.updateParentReligion(student)
                return
            }
            if (name === 'nationality') {
                showDropDown = ['nationality', 'religion']
                url = GET_URL.religion.api
                getList = 'religion'
                datalist['religion'] = []
                datalist['category'] = []
                datalist['caste'] = []
                student['religion'] = ''
                student['category'] = ''
                student['caste'] = ''
            }
            else if (name === 'caste') {
                this.updateAddressNames();
                this.props.updateParentReligion(student)
                showDropDown = ['nationality', 'religion', 'category', 'caste']
                return
            }
            else if (name === 'religion') {
                showDropDown = ['nationality', 'religion', 'category']
                url = GET_URL.category.api
                getList = 'category'
                datalist['category'] = []
                datalist['caste'] = []
                student['category'] = ''
                student['caste'] = ''
            }
            else if (name === 'category') {
                showDropDown = ['nationality', 'religion', 'category', 'caste']
                url = GET_URL.caste.api
                getList = 'caste'
                datalist['caste'] = []
                student['caste'] = ''

            }
            else {
                return
            }
            studentLoading[getList] = true
            this.setState({
                studentLoading,
                showDropDown
            }, () => {
                const params = {};
                const URL = url + value + '/';
                getRequest(URL, params, this.props).then((response) => {
                    if (response && response.status === 200) {
                        datalist[getList] = response.data.data
                    }
                }).then(() => {
                    studentLoading[getList] = false
                    this.setState({
                        datalist,
                        studentLoading,
                        fieldErrors,
                    })
                    if (field === 'isEdit') {
                        this.updateAddressNames();
                        this.setState({
                            [getList]: '',
                        })
                    }
                    this.props.updateParentReligion(student)
                    this.props.updateList(datalist)
                })
            })
        }
        else if (field.required && value !== 0) {
            fieldErrors[name] = `${name} is Mandatory`;
        }
        this.setState({
            fieldErrors
        })
    }
    updateAddressNames = () => {
        let { student, datalist } = this.state
        let nationalityName = getKeyValueMap(datalist['nationality'], 'id', 'name')
        let religionName = getKeyValueMap(datalist['religion'], 'id', 'name')
        let categoryName = getKeyValueMap(datalist['category'], 'id', 'name')
        let casteName = getKeyValueMap(datalist['caste'], 'id', 'name')

        student['nationality_name'] = nationalityName[student['nationality']] ? nationalityName[student['nationality']] : ''
        student['religion_name'] = religionName[student['religion']] ? religionName[student['religion']] : ''
        student['category_name'] = categoryName[student['category']] ? categoryName[student['category']] : ''
        student['caste_name'] = casteName[student['caste']] ? casteName[student['caste']] : ''
        this.setState({
            student
        })
    }
    render() {
        const { fieldErrors, datalist, showDropDown, studentLoading, student, loading } = this.state;
        const { studentDetails, loadingCountry } = this.props
        return (
            <div>
                <Box className={!loading ? 'display-none' : ''} display='flex'>
                    <CircularProgress className='student-loading' />
                </Box>
                <Grid container className={loading ? 'display-none' : ''}>
                    {
                        studentDetails.map((field, index) => {
                            return <Grid item md={field.md} key={index} xs={12} sm={12} className='margin-top-20'>
                                {field.type === 'dropDown' && showDropDown.includes(field.name) && !studentLoading[field.name] && !loadingCountry &&
                                    <Dropdown
                                        data={datalist[field.name]}
                                        name={field.name}
                                        value={student[field.name]}
                                        onChange={(e) => this.handleDropDown(e.target.name, e.target.value, field)}
                                        error={fieldErrors[field.name]}
                                        label={field.label}
                                        style={field.className}
                                        required={field.required}
                                    />}
                                {field.type === 'dropDown' && showDropDown.includes(field.name) && studentLoading[field.name] &&
                                    <Skeleton variant="rect" className='drop-down-skeleton margin-top-15'></Skeleton>
                                }
                            </Grid>
                        })
                    }
                </Grid>
            </div>
        )
    }
}
