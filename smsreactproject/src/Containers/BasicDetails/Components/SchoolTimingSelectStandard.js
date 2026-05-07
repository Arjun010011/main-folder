import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import MenuBookOutlinedIcon from '@material-ui/icons/MenuBookOutlined';
import _ from 'lodash';
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

import loadingBar from 'images/loading.gif';
import {
    Paper, Box, Button, MenuItem, Checkbox,
    ListItemText, FormControlLabel, Switch, List, ListItem, ListItemIcon, ListItemSecondaryAction,
    Collapse, IconButton
} from '@material-ui/core';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}


class SchoolTimingSelectStandard extends Component {

    constructor(props) {
        super(props)

        this.state = {
            shift_details: { is_section: true, name: '', late_attempt_per_month: '', isDeduction: false, deduction_days: '1' },
            isEdit: false,
            standardList: [],
            date_range: {}
        }
    }

    componentDidMount = () => {
        const { standardList, is_section } = this.props;
        let { shift_details } = this.state;
        shift_details['is_section'] = is_section !== undefined ? is_section : true
        this.setState({ standardList: [...standardList] })
    }

    getSelectedStandardCount = () => {
        let { standardList } = this.state;
        let tempList = [...standardList]
        tempList.splice(0, 1)
        let count = tempList.filter((x, i) => { return x.checked; }).length;
        return (
            <Box className='add-exam-total-box'>
                Total : {count}
            </Box>
        )
    }

    handleSearchChange = (e) => {
        let { name } = e.target;
        let { shift_details, standardList } = this.state;
        shift_details[name] = !shift_details[name]

        standardList.map((standard) => {
            standard.checked = false
            standard.sections.map((section) => {
                section.checked = false
            })
            standard.expanded = false
        })
        this.setState({
            shift_details,
            standardList
        })
    }


    onChangeStandard = (index) => {
        let { standardList, checkAll, shift_details } = this.state;
        standardList.map((data, sIndex) => {
            if (index === 0) {
                data.checked = !checkAll
            }
            else if (sIndex === index) {
                data['checked'] = !data['checked']
            }
        }
        )
        this.setState({
            standardList,
            checkAll: !checkAll
        }, () => {
            checkAll = true
            let tempList = [...standardList]
            tempList.splice(0, 1)
            tempList.map((data) => {
                if (!data.checked) {
                    checkAll = false
                }
            })
            standardList[0]['checked'] = checkAll
            this.setState({
                checkAll,
                standardList
            }, () => {
                this.props.updateStandardList(standardList, shift_details['is_section'])
            })
        })
    }

    handleCheckClick = (parentIndex, childIndex) => {
        let { standardList, shift_details } = this.state;
        let is_all_checked = true
        let is_standard_all_checked
        if (parentIndex === 0) {
            standardList[parentIndex]['checked'] = !standardList[parentIndex]['checked']
            standardList.map((standard) => {
                standard.checked = standardList[parentIndex]['checked']
                standard.sections.map((section) => {
                    section.checked = standardList[parentIndex]['checked']
                })
            })
        }
        else {
            if (childIndex !== undefined) {
                let is_section_checked = false
                standardList[parentIndex]['sections'][childIndex]['checked'] = !standardList[parentIndex]['sections'][childIndex]['checked']
                standardList[parentIndex]['sections'].map((section,) => {
                    if (section.checked) {
                        is_section_checked = true
                    }
                })
                standardList.map((standard, stdIndex) => {
                    standard.sections.map((section) => {
                        if (stdIndex !== 0 && !section.checked) {
                            is_all_checked = false
                        }
                    })
                })
                if (is_section_checked) {
                    standardList[parentIndex]['checked'] = true
                }
                else {
                    standardList[parentIndex]['checked'] = false
                    standardList[parentIndex]['expanded'] = false
                }
                standardList[0]['checked'] = is_all_checked
            }
            else {
                standardList[parentIndex]['checked'] = !standardList[parentIndex]['checked']
                is_standard_all_checked = standardList[parentIndex]['checked']
                standardList.map((standard, index) => {
                    if (!standard['checked'] && index !== 0) {
                        is_all_checked = false
                    }
                    if (index === parentIndex) {
                        standard.sections.map((section) => {
                            section.checked = is_standard_all_checked
                        })
                    }
                })
                standardList[0]['checked'] = is_all_checked
            }
        }
        this.setState({
            standardList
        }, () => {
            this.props.updateStandardList(standardList, shift_details['is_section'])
        })
    }

    handleExpandClick = (index) => {
        let { standardList } = this.state;
        standardList[index]['expanded'] = !standardList[index]['expanded']
        this.setState({
            standardList
        })
    };

    render() {
        const { standardList, shift_details } = this.state;
        return (
            <Paper className='pb-20'>
                <Box className='display-flex'>
                    <Box className='add-exam-standard-list-label'>
                        {`${alias_names['standard']} List`}
                        <MenuBookOutlinedIcon />
                    </Box>
                    <Box className='add-exam-total-box'>
                        {this.getSelectedStandardCount()}
                    </Box>
                </Box>
                <Box className='school-timing-standard-list-outer-box '>
                    {shift_details['is_section'] &&
                        <List component="nav">
                            {standardList.map((standard, parentIndex) => (
                                <div key={parentIndex}>
                                    <ListItem dense>
                                        <ListItemIcon className='exam-list-item-icon'>
                                            <Checkbox
                                                disableRipple
                                                edge="start"
                                                checked={standard.checked}
                                                defaultChecked={standard.checked}
                                                onClick={() =>
                                                    this.handleCheckClick(parentIndex)
                                                }
                                            />
                                        </ListItemIcon>
                                        <ListItemIcon>
                                            <Button
                                                disableFocusRipple
                                                disableRipple
                                                variant="outlined"
                                                size="small"
                                            >
                                                {standard.name.toUpperCase()}
                                            </Button>
                                        </ListItemIcon>
                                        <ListItemSecondaryAction>
                                            {standard.id !== 0 &&
                                                <IconButton
                                                    onClick={() =>
                                                        this.handleExpandClick(parentIndex)
                                                    }
                                                >
                                                    {standard.expanded ? <ExpandLess /> : <ExpandMore />}
                                                </IconButton>
                                            }
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <Collapse
                                        unmountOnExit
                                        in={standard.expanded || false}
                                        timeout="auto"
                                    >
                                        <List disablePadding component="div">
                                            {standard.sections.map((section, childIndex) => (
                                                <ListItem
                                                    key={section.id}
                                                    dense
                                                    className='exam-list-tem-left-padding'
                                                >
                                                    <ListItemIcon className='exam-list-item-icon'>
                                                        <Checkbox
                                                            checked={section.checked}
                                                            defaultChecked={section.checked}
                                                            onClick={() =>
                                                                this.handleCheckClick(
                                                                    parentIndex,
                                                                    childIndex
                                                                )
                                                            }
                                                        />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={section.name}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Collapse>
                                </div>
                            ))}
                        </List>
                    }

                    {!shift_details['is_section'] &&
                        standardList.map((standard, index) => {
                            return <Box className=''>
                                <MenuItem className='padding-0' key={index} value={standard.name} onClick={() => this.onChangeStandard(index)}  >
                                    <Checkbox color='primary' checked={standard['checked']} />
                                    <Box className='text-capitalize'>
                                        <ListItemText primary={standard.name} />
                                    </Box>
                                </MenuItem>

                            </Box>
                        })
                    }
                </Box>
            </Paper>
        )
    }
}

export default withRouter(SchoolTimingSelectStandard)
