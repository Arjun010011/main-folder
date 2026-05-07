import React, { Component } from 'react';
import {
    IconButton, Box, Tooltip, Grid, MenuItem, Checkbox, Button, TextField,
    ListItem, List, ListItemSecondaryAction, ListItemText
} from '@material-ui/core';
import Snackbar from '@material-ui/core/Snackbar';

import { Alert } from 'Includes/functions';
import { withRouter } from 'react-router-dom';
import MenuBookOutlinedIcon from '@material-ui/icons/MenuBookOutlined';
import DeleteIcon from '@material-ui/icons/Delete';
import './styles.scss';


class Assign extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selectedUnassignedObj: [],
            unassigned_objects: [...props.unassigned_objects],
            assigned_objects: [...props.assigned_objects],
            existing_objects: [],
            search_name: "",
            alertData: "",
            snackbar: false,
        }
    }

    componentWillReceiveProps(nextProps) {
        const { unassigned_objects, assigned_objects } = this.state;
        const { fields } = this.props;
        if (nextProps.unassigned_objects !== unassigned_objects || nextProps.assigned_objects !== assigned_objects) {
            let existing_objects = [];
            for (let assigned_obj of nextProps.assigned_objects) {
                existing_objects.push(assigned_obj[fields.id]);
            }
            this.setState({ unassigned_objects: nextProps.unassigned_objects, assigned_objects: nextProps.assigned_objects, selectedUnassignedObj: [], existing_objects });
        }
    }

    onSelectUnAsssignedObjects = (data) => {
        const { fields } = this.props;
        let selectedUnassignedObj = [...this.state.selectedUnassignedObj];
        if (selectedUnassignedObj.includes(data[fields.id])) {
            const index = selectedUnassignedObj.indexOf(data[fields.id])
            selectedUnassignedObj.splice(index, 1)
        }
        else {
            selectedUnassignedObj.push(data[fields.id]);
        }
        this.setState({ selectedUnassignedObj });
    }

    handleSearchChange = (e) => {
        const search_name = e.target.value;
        this.setState({ search_name });
    }

    deleteAssignedItem = (data) => {
        const { fields } = this.props;
        let assigned_objects = [...this.state.assigned_objects];
        let unassigned_objects = [...this.state.unassigned_objects];
        let selectedUnassignedObj = [...this.state.selectedUnassignedObj];
        var index = assigned_objects.indexOf(data);
        if (index > -1)
            assigned_objects.splice(index, 1);
        unassigned_objects.push(data);
        index = selectedUnassignedObj.indexOf(data[fields.id]);
        if (index > -1)
            selectedUnassignedObj.splice(index, 1);
        this.setState({ assigned_objects, unassigned_objects, selectedUnassignedObj });
    }

    addUnassignedObj = () => {
        let selectedUnassignedObj = [...this.state.selectedUnassignedObj];
        if(selectedUnassignedObj.length === 0){
            this.setState({
                alertData: `Please select unassigned subject!!`,
                snackbar: true,
                severity: "error",
              });
              return;
        }
        const { fields } = this.props;
        let assigned_objects = [...this.state.assigned_objects];
        let unassigned_objects = [...this.state.unassigned_objects];
        let unassigned_objects_new = []
        unassigned_objects.forEach((data) => {
            if (selectedUnassignedObj.includes(data[fields.id])) {
                assigned_objects.push(data);
            }
            else {
                unassigned_objects_new.push(data);
            }
        });
        this.setState({ assigned_objects, unassigned_objects: unassigned_objects_new, selectedUnassignedObj: [] });
    }

    onSubmit = () => {
        if(this.state.assigned_objects.length === 0){
            this.setState({
                alertData: `Please assign subjects!!`,
                snackbar: true,
                severity: "error",
            });
        }
        else{
            this.props.submitAssignedItems(this.state.assigned_objects)
        }
    }
    handleClose = () => {
        this.setState({
          snackbar: false,
        });
    };

    render() {
        const { text, fields } = this.props;
        const { selectedUnassignedObj, unassigned_objects, assigned_objects, existing_objects, search_name,
                alertData, snackbar } = this.state;
        return (
            <>
                <Box maxWidth="1300px">
                    <Grid container className="assign-outer-body" >
                        <Grid item xs={12} sm={12} md={6} className="assign-subject-part assign-subject-outer-body" minHeight="200px">
                            <Box display="flex" className="assign-header-bar">
                                <Box className="assign-col-head assign-subject-name" mt={3}>
                                    <Box mr='10px' > {text.assign} </Box>
                                    <MenuBookOutlinedIcon />
                                </Box>
                                <Box mr={3} mt={1}>
                                    <TextField
                                        id="outlined-textarea"
                                        label='Search'
                                        multiline
                                        value={search_name}
                                        onChange={this.handleSearchChange}
                                    />
                                </Box>
                            </Box>
                            <Box mt={2} className='assign-subjects-body'>
                                {
                                    unassigned_objects.map((data, index) => {
                                        const selectedItem = selectedUnassignedObj.includes(data[fields.id]);
                                        const hr_class = selectedItem ? 'selected-item' : 'unselected-item';
                                        const name = data[fields.name] && data[fields.name].toLowerCase();
                                        if (search_name === "" || (search_name !== "" && name.includes(search_name.toLowerCase())))
                                            return (
                                                <Box key={index} className={'assign-element-row'}>
                                                    {
                                                        data[fields.name] &&
                                                        <MenuItem value={data.id} onClick={() => this.onSelectUnAsssignedObjects(data)}>
                                                            <Checkbox color='primary' checked={selectedItem} />
                                                            <Box ml={2} width="100%" className={`${hr_class}`}>
                                                                <ListItemText primary={data[fields.name]} className={`assign-item-name`} />
                                                                <Box className={`assign-menu-hr ${hr_class}`}></Box>
                                                            </Box>
                                                            {/* <hr /> */}
                                                        </MenuItem>
                                                    }
                                                </Box>
                                            )
                                    })
                                }
                            </Box>
                            <Box className="submit-box">
                            {/* {unassigned_objects.length > 0 && */}
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => this.addUnassignedObj()}
                                    className="assign-subject-button">
                                    {text.addAction}
                                </Button>
                                {/* } */}
                                </Box>
                        </Grid>
                        <Grid item xs={12} sm={12} md={6} className="assign-subject-part assigned-subject-outer-body" minHeight="200px">
                            {/* <Box className="assign-col-head assigned-subject-name" mt='20px'>
                                <Box mr='10px' > {text.assigned} </Box>
                                <MenuBookOutlinedIcon />
                            </Box> */}
                            <Box display="flex" className="assign-header-bar">
                                <Box className="assign-col-head assigned-subject-name" mt={3}>
                                    <Box mr='10px' > {text.assigned} </Box>
                                    <MenuBookOutlinedIcon />
                                </Box>
                                <Box mr={3} mt={1} width= '169px'>
                                   
                                </Box>
                            </Box>
                            <Box mt={2} ml={2} className="assign-subjects-body">
                                <List dense={false} className="assigned-item-list">
                                    {assigned_objects &&
                                        assigned_objects.map((data, index) => {
                                            let obj_exist = existing_objects.includes(data[fields.id])
                                            return (
                                                <ListItem key={index} className="assigned-item">
                                                    {obj_exist ? <Tooltip title={`Existing ${text.head}`} placement='top-start' arrow>
                                                        <ListItemText primary={data[fields.name]} />
                                                    </Tooltip> :
                                                        <ListItemText primary={data[fields.name]} />}
                                                    <ListItemSecondaryAction>
                                                        <IconButton edge="end" aria-label="delete">
                                                            <DeleteIcon className="delete-icon-hover1" onClick={() => this.deleteAssignedItem(data)} />
                                                        </IconButton>
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            )
                                        })
                                    }
                                </List>
                            </Box>
                            <Box className="submit-box">
                                <Button
                                    className="submit assign-subject-button"
                                    variant="contained"
                                    onClick={() => this.onSubmit()} >
                                    Submit
                                </Button>
                                </Box>
                        </Grid>
                    </Grid>

                    <Snackbar
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    open={snackbar}
                    autoHideDuration={10000}
                    onClose={this.handleClose}
                    >
                    <Alert onClose={this.handleClose} severity="error">
                        {alertData}
                    </Alert>
                    </Snackbar>
                </Box>
            </>
        )
    }
}

export default withRouter(Assign)